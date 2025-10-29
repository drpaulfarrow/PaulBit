import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ContentLibrary({ publisherId }) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    content_origin: '',
    has_third_party_media: '',
    search: ''
  });
  const [selectedContent, setSelectedContent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    content_origin: 0,
    body_word_count: '',
    authority_score: '',
    originality_score: '',
    has_third_party_media: false
  });

  useEffect(() => {
    loadContent();
  }, [publisherId, filters]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        publisherId: publisherId.toString()
      });
      
      if (filters.content_origin !== '') params.append('content_origin', filters.content_origin);
      if (filters.has_third_party_media !== '') params.append('has_third_party_media', filters.has_third_party_media);
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`/api/content?${params}`);
      setContent(response.data.content || []);
    } catch (error) {
      console.error('Failed to load content:', error);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/content', {
        ...formData,
        publisher_id: publisherId,
        body_word_count: parseInt(formData.body_word_count) || null,
        authority_score: parseFloat(formData.authority_score) || null,
        originality_score: parseFloat(formData.originality_score) || null
      }, {
        headers: { 'X-User-Id': '1' }
      });
      
      setShowCreateModal(false);
      setFormData({
        url: '',
        content_origin: 0,
        body_word_count: '',
        authority_score: '',
        originality_score: '',
        has_third_party_media: false
      });
      loadContent();
    } catch (error) {
      console.error('Failed to create content:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this content? This will also delete all associated licenses and access endpoints.')) return;
    
    try {
      await axios.delete(`/api/content/${id}?userId=1`);
      loadContent();
    } catch (error) {
      console.error('Failed to delete content:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const getOriginBadge = (origin) => {
    const badges = {
      0: { label: 'Human', color: 'bg-green-100 text-green-800' },
      1: { label: 'AI', color: 'bg-blue-100 text-blue-800' },
      2: { label: 'Hybrid', color: 'bg-purple-100 text-purple-800' }
    };
    const badge = badges[origin] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Content Library</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Content
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Origin</label>
            <select
              value={filters.content_origin}
              onChange={(e) => setFilters({ ...filters, content_origin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Origins</option>
              <option value="0">Human Created</option>
              <option value="1">AI Generated</option>
              <option value="2">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Third-Party Media</label>
            <select
              value={filters.has_third_party_media}
              onChange={(e) => setFilters({ ...filters, has_third_party_media: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All</option>
              <option value="true">Has Third-Party Media</option>
              <option value="false">No Third-Party Media</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search URL..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading content...</div>
        </div>
      ) : content.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No content found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Content
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Words</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Originality</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">3rd Party</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {content.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate" title={item.url}>
                      {item.url}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getOriginBadge(item.content_origin)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.body_word_count?.toLocaleString() || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {item.authority_score !== null ? (
                      <span className="text-sm font-medium text-gray-900">
                        {(item.authority_score * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.originality_score !== null ? (
                      <span className="text-sm font-medium text-gray-900">
                        {(item.originality_score * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.has_third_party_media ? (
                      <span className="text-orange-600">✓</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => setSelectedContent(item)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
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
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Add New Content</h3>
              
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://example.com/article"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Origin <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.content_origin}
                      onChange={(e) => setFormData({ ...formData, content_origin: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="0">Human Created</option>
                      <option value="1">AI Generated</option>
                      <option value="2">Hybrid (Human + AI)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Word Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.body_word_count}
                        onChange={(e) => setFormData({ ...formData, body_word_count: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="1500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Has Third-Party Media
                      </label>
                      <input
                        type="checkbox"
                        checked={formData.has_third_party_media}
                        onChange={(e) => setFormData({ ...formData, has_third_party_media: e.target.checked })}
                        className="w-5 h-5 mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Authority Score (0-1)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={formData.authority_score}
                        onChange={(e) => setFormData({ ...formData, authority_score: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="0.92"
                      />
                      <p className="text-xs text-gray-500 mt-1">How trustworthy/authoritative is this content</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Originality Score (0-1)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={formData.originality_score}
                        onChange={(e) => setFormData({ ...formData, originality_score: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="0.88"
                      />
                      <p className="text-xs text-gray-500 mt-1">How original/unique is this content</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Content
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Content Details</h3>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">URL</label>
                  <p className="text-gray-900 break-all">{selectedContent.url}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Content ID</label>
                    <p className="text-gray-900 font-mono text-sm">{selectedContent.content_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Origin</label>
                    <div className="mt-1">{getOriginBadge(selectedContent.content_origin)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Word Count</label>
                    <p className="text-gray-900">{selectedContent.body_word_count?.toLocaleString() || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Third-Party Media</label>
                    <p className="text-gray-900">{selectedContent.has_third_party_media ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Authority Score</label>
                    <p className="text-gray-900">
                      {selectedContent.authority_score !== null 
                        ? `${(selectedContent.authority_score * 100).toFixed(1)}%` 
                        : 'Not scored'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Originality Score</label>
                    <p className="text-gray-900">
                      {selectedContent.originality_score !== null 
                        ? `${(selectedContent.originality_score * 100).toFixed(1)}%` 
                        : 'Not scored'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Created</label>
                    <p className="text-gray-900">{new Date(selectedContent.created_ts).toLocaleString()}</p>
                  </div>
                  {selectedContent.updated_ts && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Updated</label>
                      <p className="text-gray-900">{new Date(selectedContent.updated_ts).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <a
                    href={`/licenses?contentId=${selectedContent.id}`}
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Manage Licenses
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
