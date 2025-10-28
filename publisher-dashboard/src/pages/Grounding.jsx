import { useState } from 'react';
import axios from 'axios';

export default function Grounding() {
  const [url, setUrl] = useState('');
  const [userAgent, setUserAgent] = useState('GPTBot/1.0');
  const [purpose, setPurpose] = useState('inference');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/grounding', {
        url,
        userAgent,
        purpose,
        clientId: 'dashboard-user',
        extractMainContent: true,
        includeMetadata: true
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data || { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Content Grounding API</h1>
        <p className="mt-2 text-gray-600">
          Convert any URL to licensed markdown content for search and AI systems
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL to Parse
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Agent
              </label>
              <select
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="GPTBot/1.0">GPTBot/1.0</option>
                <option value="ClaudeBot/1.0">ClaudeBot/1.0</option>
                <option value="PerplexityBot/1.0">PerplexityBot/1.0</option>
                <option value="GoogleBot/2.1">GoogleBot/2.1</option>
                <option value="TestBot/1.0">TestBot/1.0</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="inference">Inference</option>
                <option value="training">Training</option>
                <option value="research">Research</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Fetch & Parse'}
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error.error}</p>
          {error.details && (
            <pre className="mt-2 text-sm text-red-600 overflow-x-auto">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          {/* License Information */}
          <div className={`border rounded-lg p-4 ${
            result.license.status === 'open_access' 
              ? 'bg-green-50 border-green-200' 
              : result.license.status === 'licensed'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <h3 className="text-lg font-semibold mb-3">
              License Information
            </h3>
            
            {/* Status Badge */}
            <div className="mb-3">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                result.license.status === 'open_access' 
                  ? 'bg-green-100 text-green-800' 
                  : result.license.status === 'licensed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {result.license.status === 'open_access' && '✓ Open Access'}
                {result.license.status === 'licensed' && '✓ Licensed'}
                {result.license.status === 'restricted' && '⚠ Restricted'}
              </span>
            </div>

            <p className="text-sm mb-4">{result.license.message}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Domain:</span>
                <span className="ml-2">{result.license.domain}</span>
              </div>
              {result.license.isRegisteredPublisher && (
                <>
                  <div>
                    <span className="font-medium">Publisher:</span>
                    <span className="ml-2">{result.license.publisherName || `ID ${result.license.publisherId}`}</span>
                  </div>
                  <div>
                    <span className="font-medium">Policy Enforced:</span>
                    <span className="ml-2">{result.license.policyEnforced ? 'Yes' : 'No'}</span>
                  </div>
                  {result.license.allowed !== undefined && (
                    <div>
                      <span className="font-medium">Access Allowed:</span>
                      <span className={`ml-2 font-semibold ${result.license.allowed ? 'text-green-600' : 'text-red-600'}`}>
                        {result.license.allowed ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                  {result.license.costPerFetch !== undefined && (
                    <div>
                      <span className="font-medium">Cost per Fetch:</span>
                      <span className="ml-2">${result.license.costPerFetch.toFixed(3)}</span>
                    </div>
                  )}
                  {result.license.policyVersion && (
                    <div>
                      <span className="font-medium">Policy Version:</span>
                      <span className="ml-2">{result.license.policyVersion}</span>
                    </div>
                  )}
                </>
              )}
              <div>
                <span className="font-medium">Processing Time:</span>
                <span className="ml-2">{result.processingTimeMs}ms</span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          {result.metadata && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Content Metadata
              </h3>
              <div className="space-y-2 text-sm">
                {result.metadata.title && (
                  <div>
                    <span className="font-medium text-gray-700">Title:</span>
                    <span className="ml-2 text-gray-900">{result.metadata.title}</span>
                  </div>
                )}
                {result.metadata.author && (
                  <div>
                    <span className="font-medium text-gray-700">Author:</span>
                    <span className="ml-2 text-gray-900">{result.metadata.author}</span>
                  </div>
                )}
                {result.metadata.published && (
                  <div>
                    <span className="font-medium text-gray-700">Published:</span>
                    <span className="ml-2 text-gray-900">{result.metadata.published}</span>
                  </div>
                )}
                {result.metadata.description && (
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="ml-2 text-gray-900 mt-1">{result.metadata.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Markdown Content */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Markdown Content
              </h3>
              <span className="text-sm text-gray-500">
                {result.markdown.length.toLocaleString()} characters
              </span>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
              <pre className="text-sm whitespace-pre-wrap">{result.markdown}</pre>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(result.markdown)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
              >
                Copy Markdown
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([result.markdown], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'content.md';
                  a.click();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
              >
                Download .md
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
