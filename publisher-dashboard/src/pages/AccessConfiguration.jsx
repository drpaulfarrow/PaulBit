import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AccessConfiguration({ publisherId }) {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [accessTypes, setAccessTypes] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [formData, setFormData] = useState({
    access_type: 2, // Default to API
    endpoint: '',
    name: '',
    description: '',
    auth_type: 'none',
    auth_config: '',
    rate_limit: '',
    requires_mtls: false,
    request_format: 'json',
    response_format: 'json',
    request_headers: '{}',
    sample_request: '',
    sample_response: ''
  });

  useEffect(() => {
    loadData();
  }, [publisherId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [endpointsRes, typesRes] = await Promise.all([
        axios.get(`/api/access?publisherId=${publisherId}`),
        axios.get('/api/access/meta/types')
      ]);
      
      setEndpoints(endpointsRes.data.endpoints || []);
      setAccessTypes(typesRes.data.types || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        publisher_id: publisherId,
        access_type: parseInt(formData.access_type),
        endpoint: formData.endpoint,
        name: formData.name || undefined,
        description: formData.description || undefined,
        auth_type: formData.auth_type,
        requires_mtls: formData.requires_mtls,
        request_format: formData.request_format,
        response_format: formData.response_format,
        sample_request: formData.sample_request || undefined,
        sample_response: formData.sample_response || undefined
      };
      
      if (formData.auth_config) {
        try {
          payload.auth_config = JSON.parse(formData.auth_config);
        } catch (err) {
          alert('Invalid JSON in auth configuration');
          return;
        }
      }
      
      if (formData.request_headers) {
        try {
          payload.request_headers = JSON.parse(formData.request_headers);
        } catch (err) {
          alert('Invalid JSON in request headers');
          return;
        }
      }
      
      if (formData.rate_limit) payload.rate_limit = parseInt(formData.rate_limit);
      
      await axios.post('/api/access', payload, {
        headers: { 'X-User-Id': '1' }
      });
      
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to create endpoint:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        access_type: parseInt(formData.access_type),
        endpoint: formData.endpoint,
        name: formData.name || undefined,
        description: formData.description || undefined,
        auth_type: formData.auth_type,
        requires_mtls: formData.requires_mtls,
        request_format: formData.request_format,
        response_format: formData.response_format,
        sample_request: formData.sample_request || undefined,
        sample_response: formData.sample_response || undefined
      };
      
      if (formData.auth_config) {
        try {
          payload.auth_config = JSON.parse(formData.auth_config);
        } catch (err) {
          alert('Invalid JSON in auth configuration');
          return;
        }
      }
      
      if (formData.request_headers) {
        try {
          payload.request_headers = JSON.parse(formData.request_headers);
        } catch (err) {
          alert('Invalid JSON in request headers');
          return;
        }
      }
      
      if (formData.rate_limit) payload.rate_limit = parseInt(formData.rate_limit);
      
      await axios.put(`/api/access/${editingEndpoint.id}`, payload, {
        headers: { 'X-User-Id': '1' }
      });
      
      setShowEditModal(false);
      setEditingEndpoint(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to update endpoint:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleTest = async (id) => {
    setTestResults({ ...testResults, [id]: { testing: true } });
    
    try {
      const response = await axios.post(`/api/access/${id}/test`);
      setTestResults({ 
        ...testResults, 
        [id]: { 
          testing: false, 
          ...response.data.test 
        } 
      });
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ 
        ...testResults, 
        [id]: { 
          testing: false, 
          accessible: false, 
          error: error.response?.data?.error || error.message 
        } 
      });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this access endpoint?')) return;
    
    try {
      await axios.delete(`/api/access/${id}?userId=1`);
      loadData();
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const openEditModal = (endpoint) => {
    setEditingEndpoint(endpoint);
    setFormData({
      access_type: endpoint.access_type,
      endpoint: endpoint.endpoint,
      name: endpoint.name || '',
      description: endpoint.description || '',
      auth_type: endpoint.auth_type || 'none',
      auth_config: endpoint.auth_config ? JSON.stringify(endpoint.auth_config, null, 2) : '',
      rate_limit: endpoint.rate_limit || '',
      requires_mtls: endpoint.requires_mtls || false,
      request_format: endpoint.request_format || 'json',
      response_format: endpoint.response_format || 'json',
      request_headers: endpoint.request_headers ? JSON.stringify(endpoint.request_headers, null, 2) : '{}',
      sample_request: endpoint.sample_request || '',
      sample_response: endpoint.sample_response || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      access_type: 2,
      endpoint: '',
      name: '',
      description: '',
      auth_type: 'none',
      auth_config: '',
      rate_limit: '',
      requires_mtls: false,
      request_format: 'json',
      response_format: 'json',
      request_headers: '{}',
      sample_request: '',
      sample_response: ''
    });
  };

  const getAccessTypeName = (type) => {
    const names = {
      0: 'HTML',
      1: 'RSS',
      2: 'API',
      3: 'MCP',
      4: 'NLWeb'
    };
    return names[type] || 'Unknown';
  };

  const getAccessTypeBadge = (type) => {
    const badges = {
      0: 'bg-green-100 text-green-800',
      1: 'bg-orange-100 text-orange-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-purple-100 text-purple-800',
      4: 'bg-pink-100 text-pink-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badges[type] || 'bg-gray-100 text-gray-800'}`}>
        {getAccessTypeName(type)}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Access Configuration</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Endpoint
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">About Access Types</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>HTML:</strong> Standard web page access via browser</li>
          <li><strong>RSS:</strong> Syndication feed (RSS/Atom format)</li>
          <li><strong>API:</strong> RESTful API programmatic access</li>
          <li><strong>MCP:</strong> Model Context Protocol server</li>
          <li><strong>NLWeb:</strong> Natural Language Web interface</li>
        </ul>
      </div>

      {/* Endpoint List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading endpoints...</div>
        </div>
      ) : endpoints.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No access endpoints configured</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Endpoint
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {endpoints.map((endpoint) => (
                <tr key={endpoint.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{endpoint.name || 'Unnamed'}</div>
                    {endpoint.description && (
                      <div className="text-xs text-gray-500">{endpoint.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getAccessTypeBadge(endpoint.access_type)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={endpoint.endpoint}>
                      {endpoint.endpoint}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {endpoint.auth_type}
                    </div>
                    {endpoint.requires_mtls && (
                      <div className="text-xs text-blue-600">+ mTLS</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {endpoint.rate_limit ? `${endpoint.rate_limit}/hr` : 'Unlimited'}
                  </td>
                  <td className="px-6 py-4">
                    {testResults[endpoint.id]?.testing ? (
                      <span className="text-yellow-600">Testing...</span>
                    ) : testResults[endpoint.id]?.accessible !== undefined ? (
                      testResults[endpoint.id].accessible ? (
                        <span className="text-green-600">✓ Accessible</span>
                      ) : (
                        <span className="text-red-600">✗ Failed</span>
                      )
                    ) : (
                      <span className="text-gray-400">Not tested</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleTest(endpoint.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => setSelectedEndpoint(endpoint)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEditModal(endpoint)}
                      className="text-green-600 hover:text-green-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(endpoint.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Add Access Endpoint</h3>
              
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Production API, Premium RSS Feed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows="2"
                      placeholder="Brief description of this access endpoint"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.access_type}
                      onChange={(e) => setFormData({ ...formData, access_type: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {accessTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.name} - {type.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Request Format <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.request_format}
                        onChange={(e) => setFormData({ ...formData, request_format: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="json">JSON (POST/PUT)</option>
                        <option value="http-get">HTTP GET</option>
                        <option value="form-data">Form Data</option>
                        <option value="xml">XML</option>
                        <option value="graphql">GraphQL</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Response Format <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.response_format}
                        onChange={(e) => setFormData({ ...formData, response_format: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="json">JSON</option>
                        <option value="html">HTML</option>
                        <option value="xml">XML/RSS</option>
                        <option value="plain">Plain Text</option>
                        <option value="markdown">Markdown</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Request Headers (JSON)
                    </label>
                    <textarea
                      value={formData.request_headers}
                      onChange={(e) => setFormData({ ...formData, request_headers: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      rows="3"
                      placeholder='{"Content-Type": "application/json", "X-Custom-Header": "value"}'
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Custom headers to include with every request
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Authentication Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://api.example.com/content"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Authentication Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.auth_type}
                      onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="none">None (Public)</option>
                      <option value="api_key">API Key</option>
                      <option value="oauth2">OAuth 2.0</option>
                    </select>
                  </div>

                  {formData.auth_type !== 'none' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auth Configuration (JSON)
                      </label>
                      <textarea
                        value={formData.auth_config}
                        onChange={(e) => setFormData({ ...formData, auth_config: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        rows="4"
                        placeholder='{"header": "X-API-Key", "key_location": "env.API_KEY"}'
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Configuration for authentication method
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sample Request
                    </label>
                    <textarea
                      value={formData.sample_request}
                      onChange={(e) => setFormData({ ...formData, sample_request: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      rows="4"
                      placeholder='{"url": "https://example.com/article", "format": "markdown"}'
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example request body (helps scraper format requests correctly)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sample Response
                    </label>
                    <textarea
                      value={formData.sample_response}
                      onChange={(e) => setFormData({ ...formData, sample_response: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      rows="4"
                      placeholder='{"content": "Article text...", "metadata": {...}}'
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example response structure (helps scraper parse responses correctly)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate Limit (per hour)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.rate_limit}
                        onChange={(e) => setFormData({ ...formData, rate_limit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Requires mTLS
                      </label>
                      <input
                        type="checkbox"
                        checked={formData.requires_mtls}
                        onChange={(e) => setFormData({ ...formData, requires_mtls: e.target.checked })}
                        className="w-5 h-5 mt-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Endpoint
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Edit Access Endpoint</h3>
              
              <form onSubmit={handleEdit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="My API Endpoint"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows="2"
                      placeholder="Describe this endpoint..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Type *
                    </label>
                    <select
                      value={formData.access_type}
                      onChange={(e) => setFormData({ ...formData, access_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="0">HTML - Web page access</option>
                      <option value="1">RSS - Syndication feed</option>
                      <option value="2">API - RESTful API</option>
                      <option value="3">MCP - Model Context Protocol</option>
                      <option value="4">NLWeb - Natural Language Web</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endpoint URL *
                    </label>
                    <input
                      type="text"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://api.example.com/v1/content"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Authentication Type *
                    </label>
                    <select
                      value={formData.auth_type}
                      onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="none">None</option>
                      <option value="api_key">API Key</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="oauth2">OAuth 2.0</option>
                    </select>
                  </div>

                  {formData.auth_type !== 'none' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auth Configuration (JSON)
                      </label>
                      <textarea
                        value={formData.auth_config}
                        onChange={(e) => setFormData({ ...formData, auth_config: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        rows="3"
                        placeholder='{"header": "X-API-Key", "value": "..."}'
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Request Format
                      </label>
                      <select
                        value={formData.request_format}
                        onChange={(e) => setFormData({ ...formData, request_format: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="json">JSON (application/json)</option>
                        <option value="http-get">HTTP GET (query params)</option>
                        <option value="form-data">Form Data (multipart)</option>
                        <option value="xml">XML (application/xml)</option>
                        <option value="graphql">GraphQL</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Response Format
                      </label>
                      <select
                        value={formData.response_format}
                        onChange={(e) => setFormData({ ...formData, response_format: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="json">JSON</option>
                        <option value="html">HTML</option>
                        <option value="xml">XML</option>
                        <option value="plain">Plain Text</option>
                        <option value="markdown">Markdown</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Request Headers (JSON)
                    </label>
                    <textarea
                      value={formData.request_headers}
                      onChange={(e) => setFormData({ ...formData, request_headers: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      rows="3"
                      placeholder='{"Content-Type": "application/json", "Accept": "application/json"}'
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sample Request
                    </label>
                    <textarea
                      value={formData.sample_request}
                      onChange={(e) => setFormData({ ...formData, sample_request: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      rows="4"
                      placeholder='{"url": "https://example.com/article", "format": "markdown"}'
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example request body (helps scraper format requests correctly)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sample Response
                    </label>
                    <textarea
                      value={formData.sample_response}
                      onChange={(e) => setFormData({ ...formData, sample_response: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      rows="4"
                      placeholder='{"content": "Article text...", "metadata": {...}}'
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example response structure (helps scraper parse responses correctly)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate Limit (per hour)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.rate_limit}
                        onChange={(e) => setFormData({ ...formData, rate_limit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Requires mTLS
                      </label>
                      <input
                        type="checkbox"
                        checked={formData.requires_mtls}
                        onChange={(e) => setFormData({ ...formData, requires_mtls: e.target.checked })}
                        className="w-5 h-5 mt-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingEndpoint(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Update Endpoint
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedEndpoint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Endpoint Details</h3>
                <button
                  onClick={() => setSelectedEndpoint(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{selectedEndpoint.name || 'Unnamed'}</p>
                </div>

                {selectedEndpoint.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-900">{selectedEndpoint.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Access Type</label>
                    <div className="mt-1">{getAccessTypeBadge(selectedEndpoint.access_type)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Authentication</label>
                    <p className="text-gray-900">{selectedEndpoint.auth_type}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Endpoint URL</label>
                  <p className="text-gray-900 break-all font-mono text-sm">{selectedEndpoint.endpoint}</p>
                </div>

                {selectedEndpoint.auth_config && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Auth Configuration</label>
                    <pre className="text-gray-900 bg-gray-50 p-3 rounded border text-sm overflow-x-auto">
                      {JSON.stringify(selectedEndpoint.auth_config, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Rate Limit</label>
                    <p className="text-gray-900">
                      {selectedEndpoint.rate_limit ? `${selectedEndpoint.rate_limit} requests/hour` : 'Unlimited'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">mTLS Required</label>
                    <p className="text-gray-900">{selectedEndpoint.requires_mtls ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {testResults[selectedEndpoint.id] && !testResults[selectedEndpoint.id].testing && (
                  <div className="bg-gray-50 p-4 rounded border">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Last Test Result</label>
                    {testResults[selectedEndpoint.id].accessible ? (
                      <div className="text-green-600">
                        ✓ Accessible (Status: {testResults[selectedEndpoint.id].status_code})
                      </div>
                    ) : (
                      <div className="text-red-600">
                        ✗ Failed: {testResults[selectedEndpoint.id].error}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Tested: {new Date(testResults[selectedEndpoint.id].tested_at).toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <button
                    onClick={() => handleTest(selectedEndpoint.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Test Endpoint
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
