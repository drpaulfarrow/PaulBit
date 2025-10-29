import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrashIcon, MagnifyingGlassIcon, ArrowPathIcon, ShieldCheckIcon, DocumentTextIcon, GlobeAltIcon, PlusCircleIcon, XMarkIcon, KeyIcon } from '@heroicons/react/24/outline';

function UrlLibrary() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [sortBy, setSortBy] = useState('last_parsed');
  const [selectedDomain, setSelectedDomain] = useState('');
  
  // License management
  const [licenses, setLicenses] = useState([]);
  const [urlLicenses, setUrlLicenses] = useState({}); // Map of url -> license_id
  const [assigningLicense, setAssigningLicense] = useState({});
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  
  // Access endpoints
  const [accessEndpoints, setAccessEndpoints] = useState([]);
  
  // Add URL modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAccessEndpointId, setNewAccessEndpointId] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);

  // CSV Bulk Upload modal state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvAccessEndpointId, setCsvAccessEndpointId] = useState('');
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState(null);

  // Crawl Domain modal state
  const [showCrawlModal, setShowCrawlModal] = useState(false);
  const [crawlDomain, setCrawlDomain] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState(null);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchLicenses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/licenses?publisherId=1`);
      const data = await response.json();
      
      if (data.success) {
        // Filter to only show licenses without content_id (available for assignment)
        // or include all and mark which ones are already assigned
        setLicenses(data.licenses);
      }
    } catch (err) {
      console.error('Failed to fetch licenses:', err);
    }
  };

  const fetchAccessEndpoints = async () => {
    try {
      const response = await fetch(`${API_URL}/api/access?publisherId=1`);
      const data = await response.json();
      if (data.success && data.endpoints) {
        setAccessEndpoints(data.endpoints);
      }
    } catch (err) {
      console.error('Failed to fetch access endpoints:', err);
    }
  };

  const fetchUrlLicenses = async () => {
    try {
      // For each URL, check if it has an associated content/license
      const licenseMap = {};
      
      for (const url of urls) {
        try {
          const response = await fetch(`${API_URL}/api/content/by-url?url=${encodeURIComponent(url.url)}&publisherId=1`);
          const data = await response.json();
          
          if (data.success && data.content && data.content.license_id) {
            licenseMap[url.url] = data.content.license_id;
          }
        } catch (err) {
          // URL doesn't have content/license yet
        }
      }
      
      setUrlLicenses(licenseMap);
    } catch (err) {
      console.error('Failed to fetch URL licenses:', err);
    }
  };

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
    fetchLicenses();
    fetchAccessEndpoints();
  }, []);

  useEffect(() => {
    fetchUrls();
    fetchStats();
  }, [sortBy, selectedDomain]);

  useEffect(() => {
    if (urls.length > 0) {
      fetchUrlLicenses();
    }
  }, [urls]);

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

  const handleCreatePolicy = (url) => {
    // Navigate to policy editor with the URL pre-filled
    navigate(`/policy?url=${encodeURIComponent(url)}`);
  };

  const getLicenseTypeName = (type) => {
    const types = {
      0: 'Training + Display',
      1: 'RAG Display (Unrestricted)',
      2: 'RAG Display (Max Words)',
      3: 'RAG Display (Attribution)',
      4: 'RAG No Display'
    };
    return types[type] || 'Unknown';
  };

  const getAccessTypeName = (type) => {
    const types = {
      0: 'HTML',
      1: 'RSS',
      2: 'API',
      3: 'MCP',
      4: 'NLWeb'
    };
    return types[type] || 'Unknown';
  };

  const getAccessEndpointDisplayName = (endpoint) => {
    const typeName = getAccessTypeName(endpoint.access_type);
    const authType = endpoint.auth_type || 'none';
    return `${typeName} - ${endpoint.endpoint} (${authType})`;
  };

  const getLicenseDisplayName = (license) => {
    // Use name if available, otherwise use license_id or generate a name
    const name = license.name || license.license_id || `License #${license.id}`;
    const typeName = getLicenseTypeName(license.license_type);
    const price = parseFloat(license.price).toFixed(4);
    return `${name} (${typeName} - $${price} ${license.currency})`;
  };

  const openLicenseModal = (urlData) => {
    setSelectedUrl(urlData);
    setSelectedLicenseId(urlLicenses[urlData.url] || '');
    setShowLicenseModal(true);
  };

  const closeLicenseModal = () => {
    setShowLicenseModal(false);
    setSelectedUrl(null);
    setSelectedLicenseId('');
  };

  const handleSaveLicense = async () => {
    if (!selectedUrl) return;
    
    try {
      setAssigningLicense({ ...assigningLicense, [selectedUrl.url]: true });
      
      if (!selectedLicenseId) {
        // TODO: Implement unlinking if needed
        alert('License removed (unlinking not yet implemented)');
        closeLicenseModal();
        return;
      }

      const response = await fetch(`${API_URL}/api/content/from-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': '1'
        },
        body: JSON.stringify({
          url: selectedUrl.url,
          publisherId: 1,
          licenseId: parseInt(selectedLicenseId),
          title: selectedUrl.title,
          description: selectedUrl.description
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setUrlLicenses({ ...urlLicenses, [selectedUrl.url]: parseInt(selectedLicenseId) });
        closeLicenseModal();
      } else {
        alert('Failed to assign license: ' + data.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setAssigningLicense({ ...assigningLicense, [selectedUrl.url]: false });
    }
  };

  const handleAssignLicense = async (url, licenseId, urlData) => {
    if (!licenseId) {
      // User selected "No license" - we could implement unlinking here
      return;
    }
    
    try {
      setAssigningLicense({ ...assigningLicense, [url]: true });
      
      const response = await fetch(`${API_URL}/api/content/from-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': '1'
        },
        body: JSON.stringify({
          url: url,
          publisherId: 1,
          licenseId: parseInt(licenseId),
          title: urlData.title,
          description: urlData.description
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setUrlLicenses({ ...urlLicenses, [url]: parseInt(licenseId) });
        
        // Show success message briefly
        alert(`License assigned successfully to ${url}`);
      } else {
        alert('Failed to assign license: ' + data.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setAssigningLicense({ ...assigningLicense, [url]: false });
    }
  };

  const handleAddUrl = async (e) => {
    e.preventDefault();
    
    if (!newUrl.trim()) {
      alert('Please enter a URL');
      return;
    }

    try {
      setAddingUrl(true);
      const response = await fetch(`${API_URL}/parsed-urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: newUrl.trim(),
          title: newTitle.trim() || null,
          description: newDescription.trim() || null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Reset form and close modal
        setNewUrl('');
        setNewTitle('');
        setNewDescription('');
        setNewAccessEndpointId('');
        setShowAddModal(false);
        
        // Refresh the list
        fetchUrls();
        fetchStats();
      } else {
        alert('Failed to add URL: ' + data.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setAddingUrl(false);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    
    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }

    try {
      setUploadingCsv(true);
      setCsvResult(null);

      // Parse CSV file
      const text = await csvFile.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      // Check if first line is a header
      const hasHeader = lines[0].toLowerCase().includes('url') || 
                        lines[0].toLowerCase().includes('title') ||
                        lines[0].toLowerCase().includes('description');
      
      const dataLines = hasHeader ? lines.slice(1) : lines;
      
      const results = {
        total: dataLines.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      // Process each URL
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        if (!line) continue;

        // Parse CSV line (simple comma-separated)
        const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        const url = parts[0];
        const title = parts[1] || null;
        const description = parts[2] || null;

        if (!url || !url.startsWith('http')) {
          results.failed++;
          results.errors.push(`Line ${i + 1}: Invalid URL "${url}"`);
          continue;
        }

        try {
          const response = await fetch(`${API_URL}/parsed-urls`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: url,
              title: title,
              description: description,
              access_endpoint_id: csvAccessEndpointId ? parseInt(csvAccessEndpointId) : null
            })
          });

          const data = await response.json();
          
          if (response.ok && data.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`Line ${i + 1} (${url}): ${data.error || 'Unknown error'}`);
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`Line ${i + 1} (${url}): ${err.message}`);
        }
      }

      setCsvResult(results);
      
      // Refresh the URL list
      if (results.successful > 0) {
        await fetchUrls();
      }
    } catch (err) {
      alert('Error processing CSV: ' + err.message);
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleCrawlDomain = async (e) => {
    e.preventDefault();
    setCrawling(true);
    setCrawlResult(null);
    
    try {
      const cleanDomain = crawlDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const response = await fetch(`${API_URL}/domain-crawler/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: cleanDomain,
          publisherId: 1, // TODO: Get from auth context
          limit: 5
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCrawlResult({
          success: true,
          message: data.message,
          added: data.added,
          discovered: data.discovered,
          skipped: data.skipped
        });
        
        // Refresh the list
        await fetchUrls();
        await fetchStats();
        
        // Close modal after 3 seconds
        setTimeout(() => {
          setShowCrawlModal(false);
          setCrawlDomain('');
          setCrawlResult(null);
        }, 3000);
      } else {
        setCrawlResult({
          success: false,
          message: data.message || data.error || 'Crawl failed'
        });
      }
    } catch (err) {
      setCrawlResult({
        success: false,
        message: 'Network error: ' + err.message
      });
    } finally {
      setCrawling(false);
    }
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
            Manage your URL collection - add URLs here to create policies and test access
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <DocumentTextIcon className="w-5 h-5" />
            Bulk Upload CSV
          </button>
          <button
            onClick={() => setShowCrawlModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <GlobeAltIcon className="w-5 h-5" />
            Crawl Domain
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Add URL
          </button>
          <button
            onClick={() => { fetchUrls(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Add URL Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add URL to Library</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Add a URL to your library. You can then create policies and test access.
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
            <form onSubmit={handleAddUrl} className="p-6">
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
                    Access Endpoint (Optional)
                  </label>
                  <select
                    value={newAccessEndpointId}
                    onChange={(e) => setNewAccessEndpointId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Access Endpoint</option>
                    {accessEndpoints.map((endpoint) => (
                      <option key={endpoint.id} value={endpoint.id}>
                        {getAccessEndpointDisplayName(endpoint)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select how users can access this URL's content
                  </p>
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
                  disabled={addingUrl}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingUrl ? 'Adding...' : 'Add URL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crawl Domain Modal */}
      {showCrawlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Crawl Domain for Pages</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter a domain to automatically discover and add up to 5 pages via robots.txt and sitemap
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCrawlModal(false);
                  setCrawlDomain('');
                  setCrawlResult(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCrawlDomain} className="p-6">
              {crawlResult && (
                <div className={`mb-4 p-4 rounded-lg ${
                  crawlResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    crawlResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {crawlResult.message}
                  </p>
                  {crawlResult.success && (
                    <div className="mt-2 text-sm text-green-700 space-y-1">
                      <p>✓ Discovered: {crawlResult.discovered} URLs</p>
                      <p>✓ Added: {crawlResult.added} new pages</p>
                      <p>✓ Skipped: {crawlResult.skipped} duplicates</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={crawlDomain}
                    onChange={(e) => setCrawlDomain(e.target.value)}
                    placeholder="www.bbc.co.uk"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                    disabled={crawling}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  We'll fetch robots.txt and parse the sitemap to find pages
                </p>
              </div>
              
              {/* Modal Footer */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCrawlModal(false);
                    setCrawlDomain('');
                    setCrawlResult(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={crawling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={crawling}
                >
                  {crawling ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Crawling...
                    </>
                  ) : (
                    <>
                      <GlobeAltIcon className="w-5 h-5" />
                      Start Crawl
                    </>
                  )}
                </button>
              </div>
            </form>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL & Title
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Parsed
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {urls.map((url) => (
                  <tr key={url.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a
                        href={url.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm block truncate max-w-sm"
                        title={url.url}
                      >
                        {url.url}
                      </a>
                      {url.title && (
                        <div className="text-xs text-gray-600 truncate max-w-sm mt-0.5" title={url.title}>
                          {url.title}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {url.domain}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => openLicenseModal(url)}
                        className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        title={urlLicenses[url.url] ? 'Change license' : 'Assign license'}
                      >
                        <KeyIcon className="w-3 h-3" />
                        {urlLicenses[url.url] ? (
                          <span className="text-green-700 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-600">No</span>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(url.last_parsed_at)}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(url.id, url.url)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Remove from library"
                        >
                          <TrashIcon className="w-4 h-4" />
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

      {/* License Assignment Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign License</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedUrl?.url}</p>
            </div>
            
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select License
              </label>
              <select
                value={selectedLicenseId || ''}
                onChange={(e) => setSelectedLicenseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No License</option>
                {licenses.map((license) => (
                  <option key={license.id} value={license.id}>
                    {getLicenseDisplayName(license)}
                  </option>
                ))}
              </select>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={closeLicenseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLicense}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Bulk Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Bulk Upload URLs</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Upload a CSV file with URLs to add multiple entries at once
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvFile(null);
                  setCsvResult(null);
                  setCsvAccessEndpointId('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCsvUpload} className="p-6">
              <div className="space-y-4">
                {/* CSV Format Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">CSV Format</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    Your CSV file should have one URL per line with optional columns:
                  </p>
                  <code className="text-xs bg-white px-2 py-1 rounded border block">
                    url, title, description
                  </code>
                  <p className="text-xs text-blue-700 mt-2">
                    Example:
                  </p>
                  <code className="text-xs bg-white px-2 py-1 rounded border block mt-1">
                    https://example.com/article1, Article Title, Article description<br/>
                    https://example.com/article2, Another Title, Another description
                  </code>
                  <p className="text-xs text-blue-700 mt-2">
                    The header row is optional. Only the URL column is required.
                  </p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CSV File <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Access Endpoint (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Endpoint (Optional)
                  </label>
                  <select
                    value={csvAccessEndpointId}
                    onChange={(e) => setCsvAccessEndpointId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">No Access Endpoint</option>
                    {accessEndpoints.map((endpoint) => (
                      <option key={endpoint.id} value={endpoint.id}>
                        {getAccessEndpointDisplayName(endpoint)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Apply the same access endpoint to all URLs in this batch
                  </p>
                </div>

                {/* Upload Results */}
                {csvResult && (
                  <div className={`p-4 rounded-lg border ${
                    csvResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <h3 className="font-semibold mb-2">Upload Results</h3>
                    <div className="text-sm space-y-1">
                      <p>Total URLs: {csvResult.total}</p>
                      <p className="text-green-700">✓ Successful: {csvResult.successful}</p>
                      {csvResult.failed > 0 && (
                        <>
                          <p className="text-red-700">✗ Failed: {csvResult.failed}</p>
                          <div className="mt-2 max-h-40 overflow-y-auto bg-white p-2 rounded border">
                            {csvResult.errors.map((error, idx) => (
                              <div key={idx} className="text-xs text-red-600 mb-1">
                                {error}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCsvModal(false);
                    setCsvFile(null);
                    setCsvResult(null);
                    setCsvAccessEndpointId('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {csvResult ? 'Close' : 'Cancel'}
                </button>
                {!csvResult && (
                  <button
                    type="submit"
                    disabled={uploadingCsv}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {uploadingCsv ? 'Uploading...' : 'Upload URLs'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Policy Indicator Component
function PolicyIndicator({ url, metadata }) {
  // Since content is no longer loaded in the list view,
  // we rely on metadata to indicate policy status
  const licenseStatus = metadata?.licenseStatus;
  const hasPagePolicy = metadata?.hasPageSpecificPolicy;
  
  if (licenseStatus === 'open_access') {
    return (
      <div className="flex items-center gap-1.5">
        <GlobeAltIcon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500">Open Access</span>
      </div>
    );
  }
  
  if (hasPagePolicy) {
    return (
      <div className="flex items-center gap-1.5">
        <DocumentTextIcon className="w-4 h-4 text-purple-600" />
        <span className="text-xs font-medium text-purple-700">Page-Specific</span>
      </div>
    );
  }
  
  if (licenseStatus === 'licensed') {
    return (
      <div className="flex items-center gap-1.5">
        <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-medium text-blue-700">Default Policy</span>
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
