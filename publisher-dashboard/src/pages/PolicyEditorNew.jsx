import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { TrashIcon, PlusIcon, GlobeAltIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function PolicyEditorNew({ publisherId }) {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadPolicies();
  }, [publisherId]);

  // Handle URL parameter for pre-filling a page-specific policy
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam && !showCreateModal) {
      // Auto-open modal with URL pre-filled
      handleCreateNew(false, urlParam);
      // Clear the URL param after using it
      setSearchParams({});
    }
  }, [searchParams]);

  const loadPolicies = async () => {
    try {
      const response = await axios.get(`/api/policies/${publisherId}`);
      setPolicies(response.data.policies || []);
    } catch (error) {
      if (error.response?.status === 404) {
        // No policies yet
        setPolicies([]);
      } else {
        setMessage({ type: 'error', text: 'Failed to load policies' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = (isDefault = true, prefilledUrl = '') => {
    // Check if a policy already exists for this URL
    if (!isDefault && prefilledUrl) {
      const existingPolicy = policies.find(p => 
        !p.is_default && p.url_pattern === prefilledUrl
      );
      
      if (existingPolicy) {
        setMessage({ 
          type: 'error', 
          text: `A page-specific policy already exists for this URL: "${existingPolicy.name}". Please edit the existing policy instead.` 
        });
        return;
      }
    }
    
    setEditingPolicy({
      isNew: true,
      isDefault,
      urlPattern: prefilledUrl || '',
      name: isDefault ? 'Default Policy' : '',
      description: '',
      policy: {
        default: { allow: false },
        rules: []
      }
    });
    setShowCreateModal(true);
  };

  const handleEdit = (policy) => {
    setEditingPolicy({
      ...policy,
      isNew: false,
      isDefault: policy.is_default
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (policyId, policyName) => {
    if (!confirm(`Are you sure you want to delete policy "${policyName}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/policies/${policyId}`);
      setMessage({ type: 'success', text: 'Policy deleted successfully' });
      loadPolicies();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete policy' });
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading policies...</div>;
  }

  const defaultPolicy = policies.find(p => p.is_default);
  const pageSpecificPolicies = policies.filter(p => !p.is_default);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Policy Management</h2>
          <p className="text-gray-600 mt-1">Manage default and page-specific licensing policies</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleCreateNew(false)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Page-Specific Policy
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 px-4 py-3 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Default Policy */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Default Publisher Policy</h3>
          </div>
          {!defaultPolicy && (
            <button
              onClick={() => handleCreateNew(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Create Default Policy
            </button>
          )}
        </div>

        {defaultPolicy ? (
          <PolicyCard 
            policy={defaultPolicy} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <GlobeAltIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">
              No default policy configured. Create one to set licensing rules for all pages.
            </p>
          </div>
        )}
      </div>

      {/* Page-Specific Policies */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <DocumentTextIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">Page-Specific Policies</h3>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            {pageSpecificPolicies.length}
          </span>
        </div>

        {pageSpecificPolicies.length > 0 ? (
          <div className="space-y-4">
            {pageSpecificPolicies.map(policy => (
              <PolicyCard 
                key={policy.id} 
                policy={policy}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">
              No page-specific policies. These override the default policy for specific URLs.
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && editingPolicy && (
        <PolicyEditorModal
          policy={editingPolicy}
          publisherId={publisherId}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPolicy(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingPolicy(null);
            loadPolicies();
            setMessage({ type: 'success', text: 'Policy saved successfully' });
          }}
        />
      )}
    </div>
  );
}

function PolicyCard({ policy, onEdit, onDelete }) {
  const ruleCount = policy.policy?.rules?.length || 0;
  const defaultAllow = policy.policy?.default?.allow || false;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-gray-900">{policy.name}</h4>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
              v{policy.version}
            </span>
            {policy.is_default ? (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                Default
              </span>
            ) : (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                Page-Specific
              </span>
            )}
          </div>
          {policy.description && (
            <p className="text-sm text-gray-600 mb-2">{policy.description}</p>
          )}
          {policy.url_pattern && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <DocumentTextIcon className="w-4 h-4" />
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{policy.url_pattern}</code>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(policy)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(policy.id, policy.name)}
            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-md"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-gray-500">Rules:</span>
          <span className="ml-2 font-medium text-gray-900">{ruleCount}</span>
        </div>
        <div>
          <span className="text-gray-500">Default:</span>
          <span className={`ml-2 font-medium ${defaultAllow ? 'text-green-600' : 'text-red-600'}`}>
            {defaultAllow ? 'Allow' : 'Block'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Created:</span>
          <span className="ml-2 text-gray-700">
            {new Date(policy.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function PolicyEditorModal({ policy, publisherId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    urlPattern: policy.urlPattern || policy.url_pattern || '',
    name: policy.name || '',
    description: policy.description || '',
    defaultAllow: policy.policy?.default?.allow || false,
    rules: policy.policy?.rules || []
  });
  const [saving, setSaving] = useState(false);
  const [availableUrls, setAvailableUrls] = useState([]);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [existingPolicies, setExistingPolicies] = useState([]);

  // Use relative URLs when running in Docker (via nginx proxy), absolute URLs for dev
  const getApiBase = (envVar, defaultPort) => {
    if (import.meta.env[envVar]) return import.meta.env[envVar];
    // Check if running on localhost:5173 (dev server) - use absolute URL
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
      return `http://localhost:${defaultPort}`;
    }
    // Otherwise use relative URL (empty string) for Docker/production
    return '';
  };
  const API_URL = getApiBase('VITE_API_URL', 3000);

  // Fetch available URLs from the library when creating a page-specific policy
  useEffect(() => {
    if (!policy.isDefault && policy.isNew) {
      fetchAvailableUrls();
      fetchExistingPolicies();
    }
  }, []);

  const fetchExistingPolicies = async () => {
    try {
      const response = await axios.get(`/api/policies/${publisherId}`);
      const policies = response.data.policies || [];
      setExistingPolicies(policies.filter(p => !p.is_default).map(p => p.url_pattern));
    } catch (error) {
      console.error('Failed to fetch existing policies:', error);
    }
  };

  const fetchAvailableUrls = async () => {
    setLoadingUrls(true);
    try {
      const response = await axios.get(`${API_URL}/parsed-urls`);
      if (response.data.success) {
        setAvailableUrls(response.data.urls || []);
      }
    } catch (error) {
      console.error('Failed to fetch URLs:', error);
    } finally {
      setLoadingUrls(false);
    }
  };

  const handleAddRule = () => {
    setFormData({
      ...formData,
      rules: [
        ...formData.rules,
        {
          agent: '',
          allow: true,
          purpose: [], // Empty array = no restriction (applies to all purposes)
          license_type: 1, // Default: RAG Display (Unrestricted)
          price_per_fetch: 0.001,
          token_ttl_seconds: 86400,
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
    // Validation
    if (!policy.isDefault && !formData.urlPattern) {
      alert('URL pattern is required for page-specific policies');
      return;
    }

    if (!formData.name) {
      alert('Policy name is required');
      return;
    }

    setSaving(true);

    try {
      // Always use the logged-in user's publisherId for policy creation
      // Policies belong to the publisher who creates them, not to the domain in the URL
      await axios.put(`/api/policies/${publisherId}`, {
        policy: {
          default: { allow: formData.defaultAllow },
          rules: formData.rules
        },
        urlPattern: policy.isDefault ? null : formData.urlPattern,
        name: formData.name,
        description: formData.description
      });
      onSave();
    } catch (error) {
      alert('Failed to save policy: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {policy.isNew ? 'Create' : 'Edit'} {policy.isDefault ? 'Default' : 'Page-Specific'} Policy
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Policy Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Premium Content Policy"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!policy.isDefault && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Pattern *
                </label>
                {policy.isNew ? (
                  <div>
                    <select
                      value={formData.urlPattern}
                      onChange={(e) => setFormData({ ...formData, urlPattern: e.target.value })}
                      disabled={loadingUrls}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    >
                      <option value="">Select a URL from your library...</option>
                      {availableUrls
                        .filter(url => !existingPolicies.includes(url.url))
                        .map((url) => (
                          <option key={url.id} value={url.url}>
                            {url.url}
                          </option>
                        ))}
                    </select>
                    {loadingUrls && (
                      <p className="text-xs text-gray-500 mt-1">Loading available URLs...</p>
                    )}
                    {!loadingUrls && availableUrls.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No URLs in library. URLs will appear here when you parse them via the Grounding API.
                      </p>
                    )}
                    {!loadingUrls && availableUrls.filter(url => !existingPolicies.includes(url.url)).length === 0 && availableUrls.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        All URLs in your library already have page-specific policies.
                      </p>
                    )}
                    {!loadingUrls && availableUrls.filter(url => !existingPolicies.includes(url.url)).length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Select from {availableUrls.filter(url => !existingPolicies.includes(url.url)).length} available URL{availableUrls.filter(url => !existingPolicies.includes(url.url)).length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={formData.urlPattern}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL pattern cannot be changed after creation
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of this policy..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Default Policy */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Default Behavior</h4>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.defaultAllow}
                onChange={(e) => setFormData({ ...formData, defaultAllow: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Allow unlisted bots by default</span>
            </label>
          </div>

          {/* Bot Rules */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Bot-Specific Rules</h4>
              <button
                onClick={handleAddRule}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md flex items-center gap-1"
              >
                <PlusIcon className="w-4 h-4" />
                Add Rule
              </button>
            </div>

            <div className="space-y-3">
              {formData.rules.map((rule, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Bot Name/Pattern
                      </label>
                      <input
                        type="text"
                        value={rule.agent}
                        onChange={(e) => handleRuleChange(index, 'agent', e.target.value)}
                        placeholder="e.g. GPTBot, ClaudeBot"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        License Type
                      </label>
                      <select
                        value={rule.license_type || 1}
                        onChange={(e) => handleRuleChange(index, 'license_type', parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={0}>Training + Display</option>
                        <option value={1}>RAG Display (Unrestricted)</option>
                        <option value={2}>RAG Display (Max Words)</option>
                        <option value={3}>RAG Display (Attribution)</option>
                        <option value={4}>RAG No Display</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Purpose Restrictions (optional)
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { id: 0, name: 'Training + Display' },
                          { id: 1, name: 'RAG Display (Unrestricted)' },
                          { id: 2, name: 'RAG Display (Max Words)' },
                          { id: 3, name: 'RAG Display (Attribution)' },
                          { id: 4, name: 'RAG No Display' }
                        ].map(purpose => (
                          <label key={purpose.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={(rule.purpose || []).includes(purpose.id)}
                              onChange={(e) => {
                                const currentPurposes = rule.purpose || [];
                                const newPurposes = e.target.checked
                                  ? [...currentPurposes, purpose.id]
                                  : currentPurposes.filter(p => p !== purpose.id);
                                handleRuleChange(index, 'purpose', newPurposes);
                              }}
                              className="w-3 h-3 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700">{purpose.name}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Leave all unchecked to apply this rule to all purposes
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price per Fetch ($)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={rule.price_per_fetch}
                        onChange={(e) => handleRuleChange(index, 'price_per_fetch', parseFloat(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {rule.license_type === 2 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Max Word Count
                        </label>
                        <input
                          type="number"
                          value={rule.max_word_count || 100}
                          onChange={(e) => handleRuleChange(index, 'max_word_count', parseInt(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {rule.license_type === 3 && (
                      <div className="flex items-center">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={rule.attribution_required || false}
                            onChange={(e) => handleRuleChange(index, 'attribution_required', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-700">Attribution Required</span>
                        </label>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Token TTL (seconds)
                      </label>
                      <input
                        type="number"
                        value={rule.token_ttl_seconds}
                        onChange={(e) => handleRuleChange(index, 'token_ttl_seconds', parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max Requests/Second
                      </label>
                      <input
                        type="number"
                        value={rule.max_rps || 2}
                        onChange={(e) => handleRuleChange(index, 'max_rps', parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
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
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-md"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {formData.rules.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                  No rules configured. Click "Add Rule" to create one.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}
