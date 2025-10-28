import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrashIcon, MagnifyingGlassIcon, ArrowPathIcon, EyeIcon, XMarkIcon, ShieldCheckIcon, DocumentTextIcon, GlobeAltIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

function UrlLibrary() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [sortBy, setSortBy] = useState('last_parsed');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchUrls = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (sortBy) params.append('sortBy', sortBy);
      if (selectedDomain) params.append('domain', selectedDomain);
      
      const response = await fetch(`${API_URL}/parsed-urls?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setUrls(data.urls);
      } else {
        setError(data.error || 'Failed to fetch URLs');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/parsed-urls/stats/summary`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchUrls();
    fetchStats();
  }, [sortBy, selectedDomain]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUrls();
  };

  const handleDelete = async (id, url) => {
    if (!confirm(`Are you sure you want to remove this URL from your library?\n\n${url}`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/parsed-urls/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setUrls(urls.filter(u => u.id !== id));
        fetchStats(); // Refresh stats
      } else {
        alert('Failed to delete URL: ' + data.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handleViewContent = async (urlData) => {
    // If we don't have the content, fetch the full details
    if (!urlData.content) {
      try {
        const response = await fetch(`${API_URL}/parsed-urls/${urlData.id}`);
        const data = await response.json();
        if (data.success) {
          setSelectedUrl(data.url);
          setShowModal(true);
        } else {
          alert('Failed to fetch content: ' + data.error);
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    } else {
      setSelectedUrl(urlData);
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUrl(null);
  };

  const handleCreatePolicy = (url) => {
    // Navigate to policy editor with the URL pre-filled
    navigate(`/policy?url=${encodeURIComponent(url)}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getDomainOptions = () => {
    const domains = [...new Set(urls.map(u => u.domain))];
    return domains.sort();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">URL Library</h1>
          <p className="text-gray-600 mt-1">
            All URLs you've parsed through the grounding API
          </p>
        </div>
        <button
          onClick={() => { fetchUrls(); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Content Preview Modal */}
      {showModal && selectedUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div className="flex-1 pr-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedUrl.title || 'Content Preview'}
                </h2>
                <a
                  href={selectedUrl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                >
                  {selectedUrl.url}
                </a>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              {selectedUrl.content && (typeof selectedUrl.content === 'object') ? (
                <div className="space-y-6">
                  {/* Header Section */}
                  {selectedUrl.content.content?.header && (
                    <div className="border-b border-gray-200 pb-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Header</h3>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border border-gray-200">
{selectedUrl.content.content.header}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Main Content Section */}
                  {selectedUrl.content.content?.main && (
                    <div className="border-b border-gray-200 pb-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Main Content</h3>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-mono text-sm bg-blue-50 p-4 rounded border border-blue-200">
{selectedUrl.content.content.main}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Footer Section */}
                  {selectedUrl.content.content?.footer && (
                    <div className="border-b border-gray-200 pb-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Footer</h3>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border border-gray-200">
{selectedUrl.content.content.footer}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Rate Information */}
                  {selectedUrl.content.rate && (
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-green-800">License & Pricing</h3>
                        {selectedUrl.content.rate.licenseType === 'ON_DEMAND_LICENSE' ? (
                          <div className="flex items-center gap-1.5">
                            <DocumentTextIcon className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-medium text-purple-700 px-2 py-0.5 bg-purple-100 rounded">
                              Page-Specific Policy
                            </span>
                          </div>
                        ) : selectedUrl.content.rate.licenseType === 'RESTRICTED' && selectedUrl.content.rate.priceMicros === 0 ? (
                          <div className="flex items-center gap-1.5">
                            <GlobeAltIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-600 px-2 py-0.5 bg-gray-100 rounded">
                              Open Access
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700 px-2 py-0.5 bg-blue-100 rounded">
                              Default Policy
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Price:</span>
                          <span className="ml-2 font-semibold text-green-700">
                            ${(selectedUrl.content.rate.priceMicros / 1000000).toFixed(4)} {selectedUrl.content.rate.currency}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">License Type:</span>
                          <span className="ml-2 font-semibold text-green-700">
                            {selectedUrl.content.rate.licenseType}
                          </span>
                        </div>
                        {selectedUrl.content.rate.licensePath && (
                          <div className="col-span-2">
                            <span className="text-gray-600">License Path:</span>
                            <span className="ml-2 text-green-700">{selectedUrl.content.rate.licensePath}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata Information */}
                  {selectedUrl.content.metadata && (
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Metadata</h3>
                      <div className="text-xs font-mono text-gray-600">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(selectedUrl.content.metadata, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedUrl.content && typeof selectedUrl.content === 'string' ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border border-gray-200">
{selectedUrl.content}
                  </pre>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <p>No content available for this URL</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Parse Count:</span> {selectedUrl.parse_count}x • 
                <span className="font-medium ml-2">Last Parsed:</span> {formatDate(selectedUrl.last_parsed_at)}
              </div>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total URLs</div>
            <div className="text-3xl font-bold text-blue-600">{stats.total_urls}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Unique Domains</div>
            <div className="text-3xl font-bold text-green-600">{stats.unique_domains}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Parses</div>
            <div className="text-3xl font-bold text-purple-600">{stats.total_parses}</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search URLs
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by URL, title, or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
          
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="last_parsed">Recently Parsed</option>
              <option value="first_parsed">First Parsed</option>
              <option value="parse_count">Most Parsed</option>
            </select>
          </div>

          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Domains</option>
              {getDomainOptions().map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </form>
      </div>

      {/* URL List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <ArrowPathIcon className="w-8 h-8 mx-auto mb-2 animate-spin" />
            Loading URLs...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">
            <p className="font-semibold">Error loading URLs</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : urls.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg font-semibold">No URLs in your library yet</p>
            <p className="text-sm mt-1">
              URLs will appear here automatically when you parse them via the Grounding API
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Policy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parse Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Parsed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {urls.map((url) => (
                  <tr key={url.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <a
                        href={url.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm max-w-md block truncate"
                        title={url.url}
                      >
                        {url.url}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={url.title}>
                        {url.title || <span className="text-gray-400 italic">No title</span>}
                      </div>
                      {url.description && (
                        <div className="text-xs text-gray-500 max-w-xs truncate mt-1" title={url.description}>
                          {url.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {url.domain}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <PolicyIndicator url={url.url} metadata={url.metadata} content={url.content} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {url.parse_count}×
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(url.last_parsed_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewContent(url)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View content"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleCreatePolicy(url.url)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Create page-specific policy"
                        >
                          <PlusCircleIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(url.id, url.url)}
                          className="text-red-600 hover:text-red-900"
                          title="Remove from library"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Policy Indicator Component
function PolicyIndicator({ url, metadata, content }) {
  const rateInfo = content?.rate;
  const licenseStatus = metadata?.licenseStatus || content?.metadata?.licenseStatus;
  
  // Determine if there's a page-specific policy
  const isPageSpecific = rateInfo?.licenseType && rateInfo?.licenseType !== 'RESTRICTED';
  const isLicensed = licenseStatus === 'licensed' || (rateInfo && rateInfo.priceMicros > 0);
  const isOpenAccess = licenseStatus === 'open_access';
  
  if (isOpenAccess) {
    return (
      <div className="flex items-center gap-1.5">
        <GlobeAltIcon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500">Open Access</span>
      </div>
    );
  }
  
  if (isLicensed) {
    return (
      <div className="flex items-center gap-1.5">
        {isPageSpecific ? (
          <>
            <DocumentTextIcon className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">Page-Specific</span>
          </>
        ) : (
          <>
            <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Default Policy</span>
          </>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400">No Policy</span>
    </div>
  );
}

export default UrlLibrary;
