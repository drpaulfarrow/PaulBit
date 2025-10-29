import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PolicyEditor({ publisherId }) {
  const [publisherInfo, setPublisherInfo] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    defaultAllow: false,
    rules: []
  });

  useEffect(() => {
    loadPolicies();
  }, [publisherId]);

  const loadPolicies = async () => {
    try {
      const response = await axios.get(`/api/policies/${publisherId}`);
      
      // Check if response contains multiple policies
      if (response.data.policies) {
        // Multiple policies format
        setPublisherInfo({
          publisher_id: response.data.publisher_id,
          publisher_name: response.data.publisher_name,
          hostname: response.data.hostname
        });
        setPolicies(response.data.policies);
        
        // Select the default policy by default, or the first policy if no default exists
        const defaultPolicy = response.data.policies.find(p => p.is_default);
        const policyToSelect = defaultPolicy || response.data.policies[0];
        if (policyToSelect) {
          selectPolicy(policyToSelect);
        }
      } else {
        // Single policy format (backward compatibility)
        setPublisherInfo({
          publisher_id: response.data.publisher_id,
          publisher_name: response.data.publisher_name,
          hostname: response.data.hostname
        });
        const singlePolicy = {
          id: response.data.id,
          version: response.data.version,
          url_pattern: response.data.url_pattern,
          name: response.data.name,
          description: response.data.description,
          policy: response.data.policy,
          created_at: response.data.created_at,
          is_default: !response.data.url_pattern
        };
        setPolicies([singlePolicy]);
        selectPolicy(singlePolicy);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load policies' });
    } finally {
      setLoading(false);
    }
  };

  const selectPolicy = (policy) => {
    setSelectedPolicy(policy);
    setFormData({
      defaultAllow: policy.policy.default?.allow || false,
      rules: policy.policy.rules || []
    });
  };

  const handleAddRule = () => {
    setFormData({
      ...formData,
      rules: [
        ...formData.rules,
        {
          agent: '',
          allow: true,
          purpose: ['inference'],
          price_per_fetch: 0.002,
          token_ttl_seconds: 600,
          max_rps: 2
        }
      ]
    });
  };

  const handleRemoveRule = (index) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index)
    });
  };

  const handleRuleChange = (index, field, value) => {
    const newRules = [...formData.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setFormData({ ...formData, rules: newRules });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const updatedPolicy = {
        policy: {
          version: (parseFloat(selectedPolicy.version) + 0.1).toFixed(1),
          publisher: publisherInfo.hostname,
          default: { allow: formData.defaultAllow },
          rules: formData.rules
        },
        urlPattern: selectedPolicy.url_pattern || null,
        name: selectedPolicy.name,
        description: selectedPolicy.description
      };

      await axios.put(`/api/policies/${publisherId}`, updatedPolicy);
      setMessage({ type: 'success', text: 'Policy updated successfully!' });
      
      // Reload to get new version
      setTimeout(() => loadPolicies(), 1000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update policy' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading policies...</div>;
  }

  if (!selectedPolicy) {
    return <div className="text-gray-500">No policies found for this publisher.</div>;
  }

  return (
    <div>
      {/* Policy Selector */}
      {policies.length > 1 && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Policy to Edit
          </label>
          <div className="grid grid-cols-1 gap-2">
            {policies.map((pol) => (
              <button
                key={pol.id}
                onClick={() => selectPolicy(pol)}
                className={`text-left px-4 py-3 rounded-md border-2 transition-colors ${
                  selectedPolicy?.id === pol.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {pol.is_default ? '🌐 Default Policy' : `📄 ${pol.name}`}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {pol.url_pattern || 'Applies to all pages'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Version {pol.version} • {new Date(pol.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {pol.policy.rules?.length > 0 && (
                    <span className="text-sm font-medium text-blue-600">
                      {pol.policy.rules.length} rule{pol.policy.rules.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Policy Editor</h2>
          <p className="text-gray-600 mt-1">
            {publisherInfo?.publisher_name} - {selectedPolicy.is_default ? 'Default Policy' : selectedPolicy.name} (v{selectedPolicy?.version})
          </p>
          {selectedPolicy?.url_pattern && (
            <p className="text-sm text-gray-500 mt-1">
              🔗 {selectedPolicy.url_pattern}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-6 px-4 py-3 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Default Policy */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Policy</h3>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.defaultAllow}
              onChange={(e) => setFormData({ ...formData, defaultAllow: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-700">Allow unlisted bots by default</span>
          </label>
        </div>

        {/* Bot Rules */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bot Rules</h3>
            <button
              onClick={handleAddRule}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md"
            >
              + Add Rule
            </button>
          </div>

          <div className="space-y-4">
            {formData.rules.map((rule, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bot Name/Pattern
                    </label>
                    <input
                      type="text"
                      value={rule.agent}
                      onChange={(e) => handleRuleChange(index, 'agent', e.target.value)}
                      placeholder="e.g. GPTBot, ClaudeBot"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per Fetch ($)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rule.price_per_fetch}
                      onChange={(e) => handleRuleChange(index, 'price_per_fetch', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token TTL (seconds)
                    </label>
                    <input
                      type="number"
                      value={rule.token_ttl_seconds}
                      onChange={(e) => handleRuleChange(index, 'token_ttl_seconds', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Requests/Second
                    </label>
                    <input
                      type="number"
                      value={rule.max_rps || 2}
                      onChange={(e) => handleRuleChange(index, 'max_rps', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={rule.allow}
                      onChange={(e) => handleRuleChange(index, 'allow', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Allow this bot</span>
                  </label>

                  <button
                    onClick={() => handleRemoveRule(index)}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {formData.rules.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No rules configured. Click "Add Rule" to create one.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
