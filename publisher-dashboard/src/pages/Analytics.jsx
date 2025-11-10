import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { ArrowPathIcon, SignalIcon } from '@heroicons/react/24/outline';

const PLATFORM_OPTIONS = [
  'fastly',
  'cloudflare',
  'akamai',
  'aws',
  'gcp',
  'azure',
  'vercel',
  'datadome',
  'wordpress',
  'other',
];

const METRIC_OPTIONS = [
  { value: 'bot_ratio', label: 'Bot Ratio (>= threshold)' },
  { value: 'error_rate', label: 'Error Rate (>= threshold)' },
  { value: 'traffic_drop', label: 'Traffic Drop (<= threshold ratio)' },
  { value: 'latency_spike', label: 'Latency Spike (>= threshold ms)' },
];

export default function Analytics({ publisherId }) {
  const [summary, setSummary] = useState([]);
  const [sources, setSources] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [publisher, setPublisher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSource, setSavingSource] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    platform: '',
    api_key: '',
    service_id: '',
  });
  const [alertForm, setAlertForm] = useState({
    metric: 'bot_ratio',
    threshold: '',
    window_minutes: 60,
    notification_url: '',
  });

  useEffect(() => {
    if (!publisherId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [summaryRes, sourcesRes, alertsRes, publisherRes] = await Promise.all([
          axios.get('/api/logs/summary', {
            params: { publisher_id: publisherId, granularity: 'day', limit: 30 },
          }),
          axios.get('/api/logs/sources', { params: { publisher_id: publisherId } }),
          axios.get('/api/logs/alerts', { params: { publisher_id: publisherId } }),
          axios.get(`/api/publishers/${publisherId}`),
        ]);

        setSummary(summaryRes.data.metrics || []);
        setSources(sourcesRes.data.sources || []);
        setAlerts(alertsRes.data.alerts || []);
        setPublisher(publisherRes.data);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [publisherId]);

  const latestMetric = useMemo(() => (summary.length ? summary[0] : null), [summary]);

  const requestTrend = useMemo(() => {
    return [...summary].reverse().map((metric) => ({
      date: new Date(metric.period_start).toLocaleDateString(),
      total_requests: metric.total_requests,
      bot_requests: metric.bot_requests,
    }));
  }, [summary]);

  const ratioTrend = useMemo(() => {
    return [...summary].reverse().map((metric) => {
      const total = metric.total_requests || 0;
      const botRatio = total > 0 ? metric.bot_requests / total : 0;
      const errorRatio = total > 0 ? metric.error_count / total : 0;
      return {
        date: new Date(metric.period_start).toLocaleDateString(),
        bot_ratio: Number((botRatio * 100).toFixed(2)),
        error_rate: Number((errorRatio * 100).toFixed(2)),
        avg_latency_ms: metric.avg_latency_ms ? Number(metric.avg_latency_ms.toFixed(2)) : 0,
      };
    });
  }, [summary]);

  const latestStats = useMemo(() => {
    if (!latestMetric) return null;
    const total = latestMetric.total_requests || 0;
    return {
      totalRequests: total,
      botRatio: total > 0 ? latestMetric.bot_requests / total : 0,
      errorRatio: total > 0 ? latestMetric.error_count / total : 0,
      avgLatency: latestMetric.avg_latency_ms || 0,
    };
  }, [latestMetric]);

  const topAgents = latestMetric?.top_agents || [];
  const topCountries = latestMetric?.top_countries || [];

  const refresh = () => {
    if (!publisherId) return;
    setLoading(true);
    axios
      .all([
        axios.get('/api/logs/summary', { params: { publisher_id: publisherId, granularity: 'day', limit: 30 } }),
        axios.get('/api/logs/sources', { params: { publisher_id: publisherId } }),
        axios.get('/api/logs/alerts', { params: { publisher_id: publisherId } }),
      ])
      .then(([summaryRes, sourcesRes, alertsRes]) => {
        setSummary(summaryRes.data.metrics || []);
        setSources(sourcesRes.data.sources || []);
        setAlerts(alertsRes.data.alerts || []);
      })
      .catch((error) => {
        console.error('Failed to refresh analytics:', error);
      })
      .finally(() => setLoading(false));
  };

  const handleSourceSubmit = async (event) => {
    event.preventDefault();
    if (!sourceForm.platform) return;
    setSavingSource(true);
    try {
      await axios.post('/api/logs/sources', {
        publisher_id: publisherId,
        ...sourceForm,
      });
      setSourceForm({ platform: '', api_key: '', service_id: '' });
      refresh();
    } catch (error) {
      console.error('Failed to create log source:', error);
    } finally {
      setSavingSource(false);
    }
  };

  const handleAlertSubmit = async (event) => {
    event.preventDefault();
    if (!alertForm.metric || alertForm.threshold === '') return;
    setSavingAlert(true);
    try {
      await axios.post('/api/logs/alerts', {
        publisher_id: publisherId,
        metric: alertForm.metric,
        threshold: Number(alertForm.threshold),
        window_minutes: Number(alertForm.window_minutes || 60),
        notification_url: alertForm.notification_url,
      });
      setAlertForm({
        metric: 'bot_ratio',
        threshold: '',
        window_minutes: 60,
        notification_url: '',
      });
      refresh();
    } catch (error) {
      console.error('Failed to create alert:', error);
    } finally {
      setSavingAlert(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-500">
        <ArrowPathIcon className="w-5 h-5 animate-spin" />
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Traffic Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor bot traffic, error rates, and telemetry ingestion settings across your domains.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {publisher && (
        <div className="bg-gray-900 text-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <SignalIcon className="w-5 h-5 text-lime-400" />
            Ingestion Credentials
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            Use the hashed value below in the <code className="font-mono">X-PaulBit-Key</code> header when posting
            NDJSON payloads to <code className="font-mono">POST /api/logs/ingest</code>.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-gray-500">Publisher</div>
              <div className="font-medium">{publisher.name} (ID {publisher.publisher_id})</div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-500">API Key Hash</div>
              <div className="font-mono break-all text-sm text-lime-300">{publisher.api_key_hash}</div>
            </div>
          </div>
      <p className="text-xs text-gray-400 mt-4">
        Dev sandbox keys follow the pattern <code className="font-mono bg-gray-800 text-gray-100 px-1 rounded">publisher-{publisher.publisher_id}-ingest</code>.
      </p>
        </div>
      )}

      {latestStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Requests (24h)" value={latestStats.totalRequests.toLocaleString()} accent="text-blue-500" />
          <StatCard title="Bot Ratio" value={`${(latestStats.botRatio * 100).toFixed(1)}%`} accent="text-emerald-500" />
          <StatCard title="Error Rate" value={`${(latestStats.errorRatio * 100).toFixed(1)}%`} accent="text-rose-500" />
          <StatCard title="Avg Latency" value={`${latestStats.avgLatency.toFixed(1)} ms`} accent="text-indigo-500" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Requests Over Time</h3>
          {requestTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={requestTrend}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="total_requests" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRequests)" />
                <Area type="monotone" dataKey="bot_requests" stroke="#10B981" fillOpacity={0.3} fill="#BBF7D0" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No traffic yet. Connect a telemetry source to begin collecting analytics." />
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Bot vs Error Rate</h3>
          {ratioTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={ratioTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" tickFormatter={(value) => `${value}%`} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="bot_ratio" name="Bot %" stroke="#10B981" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="error_rate" name="Error %" stroke="#EF4444" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="avg_latency_ms" name="Latency (ms)" stroke="#6366F1" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No ratio data available yet." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopList
          title="Top Agents"
          items={topAgents}
          emptyMessage="No agent data captured yet."
          labelKey="agent"
          valueLabel="requests"
        />
        <TopList
          title="Top Countries"
          items={topCountries}
          emptyMessage="No geo data recorded yet."
          labelKey="country"
          valueLabel="requests"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Log Sources</h3>
          </div>
          {sources.length > 0 ? (
            <div className="space-y-3">
              {sources.map((source) => (
                <div key={source.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wide text-gray-600">{source.platform}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Service ID: {source.service_id || '—'}
                      </div>
                    </div>
                    <StatusBadge status={source.status} />
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Last Ingested:{' '}
                    {source.last_ingested_at ? new Date(source.last_ingested_at).toLocaleString() : 'Never'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No telemetry integrations configured yet." />
          )}

          <form onSubmit={handleSourceSubmit} className="border-t border-gray-100 pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-800">Add Source</h4>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-1">Platform</label>
              <select
                className="w-full border-gray-200 rounded-md focus:border-gray-400 focus:ring-0"
                value={sourceForm.platform}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, platform: e.target.value }))}
                required
              >
                <option value="">Select platform</option>
                {PLATFORM_OPTIONS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-1">API Key (optional)</label>
              <input
                type="text"
                value={sourceForm.api_key}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, api_key: e.target.value }))}
                className="w-full border-gray-200 rounded-md focus:border-gray-400 focus:ring-0"
                placeholder="Key or token used to pull logs"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-1">Service ID (optional)</label>
              <input
                type="text"
                value={sourceForm.service_id}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, service_id: e.target.value }))}
                className="w-full border-gray-200 rounded-md focus:border-gray-400 focus:ring-0"
                placeholder="CDN service identifier"
              />
            </div>
            <button
              type="submit"
              disabled={savingSource}
              className="w-full inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
            >
              {savingSource ? 'Saving...' : 'Add Source'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Anomaly Alerts</h3>
          </div>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800 uppercase">{alert.metric}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Threshold: <span className="font-mono">{alert.threshold}</span> • Window: {alert.window_minutes} min
                      </div>
                    </div>
                    <StatusBadge status={alert.enabled ? 'active' : 'paused'} />
                  </div>
                  {alert.notification_url && (
                    <div className="text-xs text-gray-400 mt-2 break-all">
                      Webhook: {alert.notification_url}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No alerts configured. Create one to receive webhook notifications." />
          )}

          <form onSubmit={handleAlertSubmit} className="border-t border-gray-100 pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-800">Create Alert</h4>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-1">Metric</label>
              <select
                className="w-full border-gray-200 rounded-md focus:border-gray-400 focus:ring-0"
                value={alertForm.metric}
                onChange={(e) => setAlertForm((prev) => ({ ...prev, metric: e.target.value }))}
              >
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-1">Threshold</label>
              <input
                type="number"
                step="0.01"
                value={alertForm.threshold}
                onChange={(e) => setAlertForm((prev) => ({ ...prev, threshold: e.target.value }))}
                className="w-full border-gray-200 rounded-md focus:border-gray-400 focus:ring-0"
                placeholder="e.g. 0.30 for 30% bot ratio"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-1">Window (minutes)</label>
              <input
                type="number"
                value={alertForm.window_minutes}
                onChange={(e) => setAlertForm((prev) => ({ ...prev, window_minutes: e.target.value }))}
                className="w-full border-gray-200 rounded-md focus:border-gray-400 focus:ring-0"
                min={5}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-gray-500 block mb-1">Webhook URL (optional)</label>
              <input
                type="url"
                value={alertForm.notification_url}
                onChange={(e) => setAlertForm((prev) => ({ ...prev, notification_url: e.target.value }))}
                className="w-full border-gray-200 rounded-md focus:border-gray-400 focus:ring-0"
                placeholder="https://example.com/webhook"
              />
            </div>
            <button
              type="submit"
              disabled={savingAlert}
              className="w-full inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
            >
              {savingAlert ? 'Saving...' : 'Create Alert'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="text-gray-400 text-sm text-center py-10">
      {message}
    </div>
  );
}

function StatCard({ title, value, accent }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-xs uppercase text-gray-500">{title}</div>
      <div className={`mt-3 text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = status?.toLowerCase();
  let color = 'bg-gray-100 text-gray-700';
  if (normalized === 'active') color = 'bg-emerald-100 text-emerald-700';
  if (normalized === 'revoked' || normalized === 'paused') color = 'bg-amber-100 text-amber-700';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${color}`}>
      {status || 'unknown'}
    </span>
  );
}

function TopList({ title, items, emptyMessage, labelKey, valueLabel }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3"
            >
              <div>
                <div className="font-medium text-gray-800">{item[labelKey] || 'Unknown'}</div>
                <div className="text-xs text-gray-400">Rank #{index + 1}</div>
              </div>
              <div className="font-mono text-sm text-gray-600">
                {item.count?.toLocaleString?.() ?? item.count ?? item.value} {valueLabel}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message={emptyMessage} />
      )}
    </div>
  );
}

