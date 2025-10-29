import { useState, useEffect } from 'react';
import axios from 'axios';

export default function LicenseManager({ publisherId }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [licenseTypes, setLicenseTypes] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    license_type: 0,
    price: '',
    currency: 'USD',
    term_months: 12,
    revshare_pct: '',
    max_word_count: '',
    attribution_required: false,
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, [publisherId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [licensesRes, typesRes] = await Promise.all([
        axios.get(`/api/licenses?publisherId=${publisherId}`),
        axios.get('/api/licenses/meta/types')
      ]);
      
      setLicenses(licensesRes.data.licenses || []);
      setLicenseTypes(typesRes.data.types || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    // Validate conditional fields
    if (formData.license_type === 2 && !formData.max_word_count) {
      alert('RAG Max Words license type requires a maximum word count');
      return;
    }
    
    try {
      const payload = {
        publisher_id: publisherId,
        name: formData.name || null,
        license_type: formData.license_type,
        price: parseFloat(formData.price),
        currency: formData.currency,
        status: formData.status,
        // Optional fields
        ...(formData.term_months && { term_months: parseInt(formData.term_months) }),
        ...(formData.revshare_pct && { revshare_pct: parseFloat(formData.revshare_pct) }),
        ...(formData.max_word_count && { max_word_count: parseInt(formData.max_word_count) }),
        ...(formData.license_type === 3 && { attribution_required: formData.attribution_required })
      };

      if (editingLicense) {
        // Update existing license
        const response = await axios.put(`/api/licenses/${editingLicense.id}`, payload, {
          headers: { 'X-User-Id': '1' }
        });
        
        if (response.data.success) {
          alert('License updated successfully!');
          setShowCreateModal(false);
          setEditingLicense(null);
          resetForm();
          loadData();
        }
      } else {
        // Create new license
        const response = await axios.post('/api/licenses', payload, {
          headers: { 'X-User-Id': '1' }
        });
        
        if (response.data.success) {
          alert('License created successfully!');
          setShowCreateModal(false);
          resetForm();
          loadData();
        }
      }
    } catch (error) {
      console.error('Failed to save license:', error);
      alert('Failed to save license: ' + (error.response?.data?.error || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      license_type: 0,
      price: '',
      currency: 'USD',
      term_months: '',
      revshare_pct: '',
      max_word_count: '',
      attribution_required: false,
      status: 'active'
    });
    setEditingLicense(null);
  };

  const handleClone = async (licenseId) => {
    const newContentId = prompt('Enter content ID to clone this license to:');
    if (!newContentId) return;
    
    try {
      await axios.post(`/api/licenses/${licenseId}/clone`, {
        content_id: parseInt(newContentId)
      }, {
        headers: { 'X-User-Id': '1' }
      });
      
      loadData();
      alert('License cloned successfully!');
    } catch (error) {
      console.error('Failed to clone license:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this license? This will also delete all associated access endpoints.')) return;
    
    try {
      await axios.delete(`/api/licenses/${id}?userId=1`);
      loadData();
    } catch (error) {
      console.error('Failed to delete license:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleEdit = (license) => {
    setEditingLicense(license);
    setFormData({
      license_type: license.license_type,
      price: license.price.toString(),
      currency: license.currency,
      term_months: license.term_months ? license.term_months.toString() : '',
      revshare_pct: license.revshare_pct ? license.revshare_pct.toString() : '',
      max_word_count: license.max_word_count ? license.max_word_count.toString() : '',
      attribution_required: license.attribution_required || false,
      status: license.status
    });
    setShowCreateModal(true);
  };

  const getLicenseTypeName = (type) => {
    const names = {
      0: 'Training + Display',
      1: 'RAG Unrestricted',
      2: 'RAG Max Words',
      3: 'RAG Attribution',
      4: 'RAG No Display'
    };
    return names[type] || 'Unknown';
  };

  const getLicenseTypeBadge = (type) => {
    const badges = {
      0: 'bg-purple-100 text-purple-800',
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-orange-100 text-orange-800',
      4: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badges[type] || 'bg-gray-100 text-gray-800'}`}>
        {getLicenseTypeName(type)}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">License Manager</h2>
          <p className="text-gray-600 mt-1">Create license templates that can be assigned to URLs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create License Template
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">About License Types</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Training + Display:</strong> Full rights for AI training and content display</li>
          <li><strong>RAG Unrestricted:</strong> Use in RAG systems without word count limits</li>
          <li><strong>RAG Max Words:</strong> RAG usage limited to specified word count</li>
          <li><strong>RAG Attribution:</strong> RAG usage with required attribution</li>
          <li><strong>RAG No Display:</strong> RAG usage without display rights</li>
        </ul>
        <p className="text-sm text-blue-700 mt-3">💡 <strong>Tip:</strong> Create license templates here, then assign them to specific URLs in the URL Library.</p>
      </div>

      {/* License List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading licenses...</div>
        </div>
      ) : licenses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No licenses created yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First License
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Special Conditions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {licenses.map((license) => (
                <tr key={license.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {license.license_name || `License #${license.id}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getLicenseTypeBadge(license.license_type)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {parseFloat(license.price).toFixed(4)} {license.currency}
                    </div>
                    {license.revshare_pct && (
                      <div className="text-xs text-gray-500">
                        + {parseFloat(license.revshare_pct).toFixed(2)}% revshare
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {license.term_months} months
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {license.license_type === 2 && license.max_word_count && (
                      <span className="text-blue-600">Max {license.max_word_count} words</span>
                    )}
                    {license.license_type === 3 && license.attribution_required && (
                      <span className="text-orange-600">Attribution required</span>
                    )}
                    {license.license_type !== 2 && license.license_type !== 3 && (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      license.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {license.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => setSelectedLicense(license)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(license)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleClone(license.id)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      Clone
                    </button>
                    <button
                      onClick={() => handleDelete(license.id)}
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
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {editingLicense ? 'Edit License Template' : 'Create License Template'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {editingLicense ? 'Update the license template settings' : 'Create a license template that you can assign to URLs in the URL Library'}
              </p>
              
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.license_type}
                      onChange={(e) => setFormData({ ...formData, license_type: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {licenseTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.name} - {type.description}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Create a license template that can be assigned to URLs later</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.0001"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="0.0500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Term (months)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.term_months}
                        onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Revenue Share %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.revshare_pct}
                        onChange={(e) => setFormData({ ...formData, revshare_pct: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="5.0"
                      />
                    </div>
                  </div>

                  {/* Conditional Fields */}
                  {formData.license_type === 2 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-blue-900 mb-1">
                        Maximum Word Count <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.max_word_count}
                        onChange={(e) => setFormData({ ...formData, max_word_count: e.target.value })}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg"
                        placeholder="500"
                      />
                      <p className="text-xs text-blue-700 mt-1">
                        Required for RAG Max Words license type
                      </p>
                    </div>
                  )}

                  {formData.license_type === 3 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.attribution_required}
                          onChange={(e) => setFormData({ ...formData, attribution_required: e.target.checked })}
                          className="w-5 h-5"
                        />
                        <span className="text-sm font-medium text-orange-900">
                          Attribution Required <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <p className="text-xs text-orange-700 mt-1 ml-7">
                        Must be enabled for RAG Attribution license type
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
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
                    {editingLicense ? 'Update License' : 'Create License'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">License Details</h3>
                <button
                  onClick={() => setSelectedLicense(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">License ID</label>
                  <p className="text-gray-900 font-mono text-sm">{selectedLicense.license_id}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">License Type</label>
                    <div className="mt-1">{getLicenseTypeBadge(selectedLicense.license_type)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        selectedLicense.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedLicense.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Price</label>
                    <p className="text-gray-900">{parseFloat(selectedLicense.price).toFixed(4)} {selectedLicense.currency}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Term</label>
                    <p className="text-gray-900">{selectedLicense.term_months} months</p>
                  </div>
                </div>

                {selectedLicense.revshare_pct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Revenue Share</label>
                    <p className="text-gray-900">{parseFloat(selectedLicense.revshare_pct).toFixed(2)}%</p>
                  </div>
                )}

                {selectedLicense.max_word_count && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Maximum Word Count</label>
                    <p className="text-gray-900">{selectedLicense.max_word_count} words</p>
                  </div>
                )}

                {selectedLicense.attribution_required && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Attribution</label>
                    <p className="text-orange-600 font-medium">Required</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Created</label>
                    <p className="text-gray-900">{new Date(selectedLicense.created_ts).toLocaleString()}</p>
                  </div>
                  {selectedLicense.updated_ts && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Updated</label>
                      <p className="text-gray-900">{new Date(selectedLicense.updated_ts).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <a
                    href={`/access?licenseId=${selectedLicense.id}`}
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Manage Access Endpoints
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
