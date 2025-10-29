import { useState, useEffect } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
  TrashIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

export default function ContentLibrary({ publisherId }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingContent, setAddingContent] = useState(false);
  
  // Form state
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [contentOrigin, setContentOrigin] = useState(0);
  const [hasThirdPartyMedia, setHasThirdPartyMedia] = useState(false);

  useEffect(() => {
    loadContent();
  }, [publisherId]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/content?publisherId=${publisherId}`);
      const data = await response.json();
      setContent(data.content || []);
    } catch (error) {
      console.error('Failed to load content:', error);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    setAddingContent(true);
    
    try {
      const response = await fetch(`${API_URL}/api/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': '1'
        },
        body: JSON.stringify({
          publisher_id: publisherId,
          url: newUrl,
          title: newTitle || null,
          description: newDescription || null,
          content_origin: parseInt(contentOrigin),
          has_third_party_media: hasThirdPartyMedia
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add content');
      }
      
      // Reset form
      setNewUrl('');
      setNewTitle('');
      setNewDescription('');
      setContentOrigin(0);
      setHasThirdPartyMedia(false);
      setShowAddModal(false);
      loadContent();
    } catch (error) {
      console.error('Failed to add content:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setAddingContent(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this content? This will also delete all associated licenses and access endpoints.')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/content/${id}?userId=1`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete content');
      }
      
      loadContent();
    } catch (error) {
      console.error('Failed to delete content:', error);
      alert(`Error: ${error.message}`);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading content...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Content Library</h1>
        <p className="text-gray-600">
          Manage your content - add content here to create licenses and configure access
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-500">Total Content</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{content.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-500">Human Created</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {content.filter(c => c.content_origin === 0).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-500">AI Generated</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {content.filter(c => c.content_origin === 1).length}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <PlusIcon className="w-5 h-5" />
          Add Content
        </button>
        <button
          onClick={loadContent}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Content
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Origin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {content.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  No content yet. Click "Add Content" to get started.
                </td>
              </tr>
            ) : (
              content.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {item.title || 'Untitled'}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate max-w-md"
                      >
                        {item.url}
                      </a>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {getOriginBadge(item.content_origin)}
                      {item.has_third_party_media && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                          3rd Party Media
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(item.created_ts).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => window.location.href = `/licenses?contentId=${item.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Manage Licenses"
                      >
                        <KeyIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add Content to Library</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Add content to your library. You can then create licenses and configure access.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddContent} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Article title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Brief description of the content"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content Origin
                  </label>
                  <select
                    value={contentOrigin}
                    onChange={(e) => setContentOrigin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>Human Created</option>
                    <option value={1}>AI Generated</option>
                    <option value={2}>Hybrid</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="thirdPartyMedia"
                    checked={hasThirdPartyMedia}
                    onChange={(e) => setHasThirdPartyMedia(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="thirdPartyMedia" className="ml-2 text-sm text-gray-700">
                    Contains third-party media (images, videos, etc.)
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingContent}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingContent ? 'Adding...' : 'Add Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
