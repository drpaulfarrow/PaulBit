import { useState, useEffect } from 'react';
import negotiationApi from '../services/negotiationApi';

const NEGOTIATION_STYLES = [
  { value: 'aggressive', label: 'Aggressive', description: 'Hard bargaining, minimal concessions' },
  { value: 'balanced', label: 'Balanced', description: 'Moderate approach, reasonable give-and-take' },
  { value: 'flexible', label: 'Flexible', description: 'Accommodating, willing to compromise' },
  { value: 'cooperative', label: 'Cooperative', description: 'Partnership-focused, seeks win-win' }
];

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' }
];

export default function NegotiationStrategy() {
  const publisherId = 1; // TODO: Get from auth context
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    strategy_name: 'Default Strategy',
    negotiation_style: 'balanced',
    min_price_per_fetch_micro: 1000,
    preferred_price_per_fetch_micro: 2000,
    max_price_per_fetch_micro: 5000,
    min_token_ttl_seconds: 300,
    preferred_token_ttl_seconds: 600,
    max_token_ttl_seconds: 1800,
    min_burst_rps: 2,
    preferred_burst_rps: 10,
    max_burst_rps: 50,
    allowed_purposes: ['inference', 'training'],
    preferred_purposes: ['inference'],
    max_rounds: 10,
    auto_accept_threshold: 0.90,
    timeout_seconds: 3600,
    llm_provider: 'openai',
    llm_model: 'gpt-4',
    llm_temperature: 0.7,
    is_active: true
  });

  useEffect(() => {
    loadStrategy();
  }, []);

  async function loadStrategy() {
    try {
      const strategies = await negotiationApi.getStrategies(publisherId);
      if (strategies.length > 0) {
        const active = strategies.find(s => s.is_active) || strategies[0];
        setStrategy(active);
        setForm({ ...form, ...active });
      }
    } catch (error) {
      console.error('Failed to load strategy:', error);
      setMessage({ type: 'error', text: 'Failed to load strategy' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (strategy) {
        await negotiationApi.updateStrategy(strategy.id, form);
        setMessage({ type: 'success', text: 'Strategy updated successfully!' });
      } else {
        const created = await negotiationApi.createStrategy({ ...form, publisher_id: publisherId });
        setStrategy(created);
        setMessage({ type: 'success', text: 'Strategy created successfully!' });
      }
      await loadStrategy();
    } catch (error) {
      console.error('Failed to save strategy:', error);
      setMessage({ type: 'error', text: 'Failed to save strategy' });
    } finally {
      setSaving(false);
    }
  }

  const microToDollars = (micro) => (micro / 1000000).toFixed(4);
  const dollarsToMicro = (dollars) => Math.round(parseFloat(dollars) * 1000000);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Negotiation Strategy</h1>
          <p className="text-gray-600 mt-1">
            Configure how your AI agent negotiates with AI companies
          </p>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Settings</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strategy Name
                </label>
                <input
                  type="text"
                  value={form.strategy_name}
                  onChange={(e) => setForm({ ...form, strategy_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Negotiation Style
                </label>
                <select
                  value={form.negotiation_style}
                  onChange={(e) => setForm({ ...form, negotiation_style: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {NEGOTIATION_STYLES.map(style => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {NEGOTIATION_STYLES.find(s => s.value === form.negotiation_style)?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Pricing Terms</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={microToDollars(form.min_price_per_fetch_micro)}
                    onChange={(e) => setForm({ 
                      ...form, 
                      min_price_per_fetch_micro: dollarsToMicro(e.target.value)
                    })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Per content fetch</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={microToDollars(form.preferred_price_per_fetch_micro)}
                    onChange={(e) => setForm({ 
                      ...form, 
                      preferred_price_per_fetch_micro: dollarsToMicro(e.target.value)
                    })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Target price</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={microToDollars(form.max_price_per_fetch_micro || 0)}
                    onChange={(e) => setForm({ 
                      ...form, 
                      max_price_per_fetch_micro: dollarsToMicro(e.target.value)
                    })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Optional ceiling</p>
              </div>
            </div>
          </div>

          {/* Technical Terms */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Technical Terms</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Token TTL (seconds)</h3>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={form.min_token_ttl_seconds}
                    onChange={(e) => setForm({ ...form, min_token_ttl_seconds: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="Preferred"
                    value={form.preferred_token_ttl_seconds}
                    onChange={(e) => setForm({ ...form, preferred_token_ttl_seconds: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={form.max_token_ttl_seconds}
                    onChange={(e) => setForm({ ...form, max_token_ttl_seconds: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Burst RPS (requests/sec)</h3>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={form.min_burst_rps}
                    onChange={(e) => setForm({ ...form, min_burst_rps: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="Preferred"
                    value={form.preferred_burst_rps}
                    onChange={(e) => setForm({ ...form, preferred_burst_rps: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={form.max_burst_rps}
                    onChange={(e) => setForm({ ...form, max_burst_rps: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Negotiation Rules */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Negotiation Rules</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Rounds
                </label>
                <input
                  type="number"
                  value={form.max_rounds}
                  onChange={(e) => setForm({ ...form, max_rounds: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="1"
                  max="50"
                />
                <p className="text-xs text-gray-500 mt-1">Max back-and-forth rounds</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-Accept Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.auto_accept_threshold}
                  onChange={(e) => setForm({ ...form, auto_accept_threshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  max="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-accept at {(form.auto_accept_threshold * 100).toFixed(0)}% match
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={form.timeout_seconds}
                  onChange={(e) => setForm({ ...form, timeout_seconds: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Max negotiation duration</p>
              </div>
            </div>
          </div>

          {/* LLM Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">AI Configuration</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LLM Provider
                </label>
                <select
                  value={form.llm_provider}
                  onChange={(e) => setForm({ ...form, llm_provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {LLM_PROVIDERS.map(provider => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={form.llm_model}
                  onChange={(e) => setForm({ ...form, llm_model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="gpt-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.llm_temperature}
                  onChange={(e) => setForm({ ...form, llm_temperature: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  max="2"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={loadStrategy}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={saving}
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
