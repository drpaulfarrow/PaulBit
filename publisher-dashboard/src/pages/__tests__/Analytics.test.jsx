import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Analytics from '../Analytics.jsx';

const summaryData = [
  {
    period_start: '2025-01-01T00:00:00Z',
    total_requests: 100,
    bot_requests: 25,
    error_count: 5,
    avg_latency_ms: 210.456,
    top_agents: [{ agent: 'GPTBot/1.0', count: 15 }],
    top_countries: [{ country: 'US', count: 60 }],
  },
];

const sourcesData = [
  { id: 1, platform: 'fastly', status: 'active', service_id: 'svc-123', last_ingested_at: '2025-01-01T01:00:00Z' },
];

const alertsData = [
  { id: 1, metric: 'bot_ratio', threshold: 0.35, window_minutes: 60, enabled: true, notification_url: 'https://example.com/webhook' },
];

const publisherData = {
  publisher_id: 42,
  name: 'Example Publisher',
  api_key_hash: 'sha256:abcd',
};

vi.mock('axios', () => {
  const get = vi.fn();
  const post = vi.fn();
  const all = vi.fn();
  const mock = { get, post, all };
  return { default: mock };
});

describe('Analytics page', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.all.mockReset();
    axios.all.mockImplementation((promises) => Promise.all(promises));

    axios.get.mockImplementation((url) => {
      if (url === '/api/logs/summary') {
        return Promise.resolve({ data: { metrics: summaryData } });
      }
      if (url === '/api/logs/sources') {
        return Promise.resolve({ data: { sources: sourcesData } });
      }
      if (url === '/api/logs/alerts') {
        return Promise.resolve({ data: { alerts: alertsData } });
      }
      if (url === '/api/publishers/42') {
        return Promise.resolve({ data: publisherData });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders analytics dashboard with fetched data', async () => {
    render(<Analytics publisherId={42} />);

    expect(screen.getByText(/Loading analytics/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Traffic Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('Example Publisher (ID 42)')).toBeInTheDocument();
    expect(screen.getByText(/Requests Over Time/)).toBeInTheDocument();
    expect(screen.getByText(/Bot vs Error Rate/)).toBeInTheDocument();
    expect(screen.getByText(/Log Sources/)).toBeInTheDocument();
    expect(screen.getByText(/Anomaly Alerts/)).toBeInTheDocument();
  });

  it('submits new log source form', async () => {
    render(<Analytics publisherId={42} />);
    await waitFor(() => expect(screen.queryByText(/Loading analytics/i)).not.toBeInTheDocument());

    const platformSelect = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(platformSelect, 'cloudflare');

    await userEvent.type(screen.getByPlaceholderText(/Key or token/i), 'secret');
    await userEvent.type(screen.getByPlaceholderText(/CDN service identifier/i), 'svc-999');

    axios.post.mockResolvedValueOnce({ data: { source: { id: 2 } } });

    await userEvent.click(screen.getByRole('button', { name: /Add Source/i }));

    expect(axios.post).toHaveBeenCalledWith('/api/logs/sources', expect.objectContaining({
      publisher_id: 42,
      platform: 'cloudflare',
      api_key: 'secret',
      service_id: 'svc-999',
    }));
    expect(axios.all).toHaveBeenCalledTimes(1);
  });
});

