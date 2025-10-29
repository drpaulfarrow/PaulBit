import { useState, useEffect } from 'react';
import negotiationApi from '../services/negotiationApi';

const PARTNER_TYPES = [
  { value: 'specific_partner', label: 'Specific Partner' },
  { value: 'tier1_ai', label: 'Tier 1 AI Company' },
  { value: 'tier2_ai', label: 'Tier 2 AI Company' },
  { value: 'startup', label: 'Startup' },
  { value: 'research', label: 'Research Institution' }
];

const LICENSE_TYPES = [
  { value: 0, label: 'Training + Display' },
  { value: 1, label: 'RAG Display (Unrestricted)' },
  { value: 2, label: 'RAG Display (Max Words)' },
  { value: 3, label: 'RAG Display (Attribution)' },
  { value: 4, label: 'RAG No Display' }
];

const NEGOTIATION_STYLES = [
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'cooperative', label: 'Cooperative' }
];

const PRICING_MODELS = [
  { value: 'per_token', label: 'Per Token' },
  { value: 'per_query', label: 'Per Query' }
];

export default function PartnerStrategies() {
  const publisherId = 1;
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    partner_type: 'tier1_ai',
    partner_name: '',
    license_type: [1],
    pricing_model: 'per_token',
    min_price: 0.001,
    preferred_price: 0.005,
    max_price: 0.020,
    negotiation_style: 'balanced',
    auto_accept_threshold: 0.90,
    llm_provider: 'openai',
    llm_model: 'gpt-4'
  });

  useEffect(() => {
    loadStrategies();
  }, []);

  async function loadStrategies() {
    try {
      const data = await negotiationApi.getStrategies(publisherId);
      setStrategies(data);
    } catch (error) {
      console.error('Failed to load strategies:', error);
      setMessage({ type: 'error', text: 'Failed to load strategies' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    // Validate at least one license type is selected
    if (!form.license_type || form.license_type.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one license type' });
      return;
    }

    try {
      if (editingId) {
        await negotiationApi.updateStrategy(editingId, form);
        setMessage({ type: 'success', text: 'Strategy updated!' });
      } else {
        await negotiationApi.createStrategy({ ...form, publisher_id: publisherId });
        setMessage({ type: 'success', text: 'Strategy created!' });
      }
      await loadStrategies();
      resetForm();
    } catch (error) {
      console.error('Failed to save strategy:', error);
      setMessage({ type: 'error', text: error.message });
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this strategy?')) return;

    try {
      await negotiationApi.deleteStrategy(id);
      setMessage({ type: 'success', text: 'Strategy deleted!' });
      await loadStrategies();
    } catch (error) {
      console.error('Failed to delete strategy:', error);
      setMessage({ type: 'error', text: 'Failed to delete strategy' });
    }
  }

  function handleEdit(strategy) {
    setEditingId(strategy.id);
    setForm({
      partner_type: strategy.partner_type,
      partner_name: strategy.partner_name || '',
      license_type: Array.isArray(strategy.license_type) ? strategy.license_type : [strategy.license_type],
      pricing_model: strategy.pricing_model,
      min_price: parseFloat(strategy.min_price),
      preferred_price: parseFloat(strategy.preferred_price),
      max_price: parseFloat(strategy.max_price),
      negotiation_style: strategy.negotiation_style,
      auto_accept_threshold: parseFloat(strategy.auto_accept_threshold),
      llm_provider: strategy.llm_provider,
      llm_model: strategy.llm_model
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setForm({
      partner_type: 'tier1_ai',
      partner_name: '',
      license_type: [1],
      pricing_model: 'per_token',
      min_price: 0.001,
      preferred_price: 0.005,
      max_price: 0.020,
      negotiation_style: 'balanced',
      auto_accept_threshold: 0.90,
      llm_provider: 'openai',
      llm_model: 'gpt-4'
    });
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partner Negotiation Strategies</h1>
            <p className="text-gray-600 mt-1">
              Configure partner-specific and use-case-specific negotiation strategies
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Add Strategy'}
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Strategy' : 'New Strategy'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partner Type *
                  </label>
                  <select
                    value={form.partner_type}
                    onChange={(e) => setForm({ ...form, partner_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    {PARTNER_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partner Name {form.partner_type === 'specific_partner' && '*'}
                  </label>
                  <input
                    type="text"
                    value={form.partner_name}
                    onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
                    placeholder="e.g., OpenAI, Anthropic"
                    className="w-full px-3 py-2 border rounded-md"
                    required={form.partner_type === 'specific_partner'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank for generic tier rules
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Types * (select all that apply)
                  </label>
                  <div className="space-y-2">
                    {LICENSE_TYPES.map(lt => (
                      <label key={lt.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={form.license_type.includes(lt.value)}
                          onChange={(e) => {
                            const newLicenseTypes = e.target.checked
                              ? [...form.license_type, lt.value]
                              : form.license_type.filter(c => c !== lt.value);
                            setForm({ ...form, license_type: newLicenseTypes });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{lt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pricing Model *
                  </label>
                  <select
                    value={form.pricing_model}
                    onChange={(e) => setForm({ ...form, pricing_model: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    {PRICING_MODELS.map(pm => (
                      <option key={pm.value} value={pm.value}>{pm.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.min_price}
                    onChange={(e) => setForm({ ...form, min_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.preferred_price}
                    onChange={(e) => setForm({ ...form, preferred_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.max_price}
                    onChange={(e) => setForm({ ...form, max_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Negotiation Style
                  </label>
                  <select
                    value={form.negotiation_style}
                    onChange={(e) => setForm({ ...form, negotiation_style: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    {NEGOTIATION_STYLES.map(ns => (
                      <option key={ns.value} value={ns.value}>{ns.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto-Accept Threshold
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={form.auto_accept_threshold}
                    onChange={(e) => setForm({ ...form, auto_accept_threshold: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Accept if offer ≥ preferred × threshold
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LLM Provider
                  </label>
                  <select
                    value={form.llm_provider}
                    onChange={(e) => setForm({ ...form, llm_provider: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LLM Model
                  </label>
                  <input
                    type="text"
                    value={form.llm_model}
                    onChange={(e) => setForm({ ...form, llm_model: e.target.value })}
                    placeholder="e.g., gpt-4, claude-3-opus-20240229"
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Create'} Strategy
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  License Types
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Style
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  LLM
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {strategies.map((strategy) => (
                <tr key={strategy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {strategy.partner_name || PARTNER_TYPES.find(pt => pt.value === strategy.partner_type)?.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {strategy.partner_type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(strategy.license_type) ? strategy.license_type : [strategy.license_type]).map(lt => (
                        <span key={lt} className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {LICENSE_TYPES.find(l => l.value === lt)?.label || `Type ${lt}`}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${parseFloat(strategy.preferred_price).toFixed(6)}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${parseFloat(strategy.min_price).toFixed(6)} - ${parseFloat(strategy.max_price).toFixed(6)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {strategy.pricing_model}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{strategy.negotiation_style}</div>
                    <div className="text-xs text-gray-500">
                      Accept: {(parseFloat(strategy.auto_accept_threshold) * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{strategy.llm_provider}</div>
                    <div className="text-xs text-gray-500">{strategy.llm_model}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(strategy)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(strategy.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {strategies.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No strategies configured. Click "Add Strategy" to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
