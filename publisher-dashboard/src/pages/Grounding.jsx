import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ServerIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

export default function Grounding() {
  const [url, setUrl] = useState('');
  const [selectedBot, setSelectedBot] = useState('gptbot');
  const [customBot, setCustomBot] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [testHistory, setTestHistory] = useState([]);

  const commonBots = [
    { id: 'gptbot', name: 'GPTBot', description: 'OpenAI ChatGPT crawler' },
    { id: 'claudebot', name: 'ClaudeBot', description: 'Anthropic Claude crawler' },
    { id: 'googlebot', name: 'Googlebot', description: 'Google search crawler' },
    { id: 'bingbot', name: 'Bingbot', description: 'Microsoft Bing crawler' },
    { id: 'perplexitybot', name: 'PerplexityBot', description: 'Perplexity AI crawler' },
    { id: 'custom', name: 'Custom Bot', description: 'Specify a custom user agent' }
  ];

  const purposes = [
    { id: 0, name: 'Training + Display', description: 'Full training and unrestricted display' },
    { id: 1, name: 'RAG Display (Unrestricted)', description: 'RAG with unlimited display' },
    { id: 2, name: 'RAG Display (Max Words)', description: 'RAG with word count limits' },
    { id: 3, name: 'RAG Display (Attribution)', description: 'RAG requiring attribution' },
    { id: 4, name: 'RAG No Display', description: 'RAG without content display' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const botName = selectedBot === 'custom' ? customBot : selectedBot;
    if (!botName) {
      alert('Please specify a bot name');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);

    const startTime = Date.now();

    try {
      const response = await axios.post('/api/grounding/test', {
        url,
        botName,
        licenseType: selectedPurpose,
        publisherId: 1,
        extractMainContent: true,
        includeMetadata: true
      });

      const responseTime = Date.now() - startTime;
      setResult(response.data);

      // Add to test history
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        url,
        bot: botName,
        purpose: purposes.find(p => p.id === selectedPurpose)?.name || `Type ${selectedPurpose}`,
        allowed: response.data.access?.allowed || response.data.license?.allowed || true,
        cost: response.data.cost || response.data.license?.costPerFetch || 0,
        licenseType: response.data.license?.licenseTypeName || purposes.find(p => p.id === selectedPurpose)?.name,
        responseTime
      };
      setTestHistory([historyEntry, ...testHistory].slice(0, 10));
    } catch (err) {
      const responseTime = Date.now() - startTime;
      const errorData = err.response?.data || { error: err.message };
      setError(errorData);

      // Add failed attempt to history
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        url,
        bot: botName,
        purpose: purposes.find(p => p.id === selectedPurpose)?.name || `Type ${selectedPurpose}`,
        allowed: false,
        error: errorData.error || errorData.message,
        responseTime
      };
      setTestHistory([historyEntry, ...testHistory].slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Scraper & Policy Tester</h1>
        <p className="text-gray-600 mt-1">
          Test content access with different bots and license types - simulates real bot behavior and policy enforcement
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bot Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bot / User Agent
              </label>
              <select
                value={selectedBot}
                onChange={(e) => setSelectedBot(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {commonBots.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {commonBots.find(b => b.id === selectedBot)?.description}
              </p>
              {selectedBot === 'custom' && (
                <input
                  type="text"
                  value={customBot}
                  onChange={(e) => setCustomBot(e.target.value)}
                  placeholder="Enter custom bot name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 mt-2"
                />
              )}
            </div>

            {/* Purpose/License Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose / License Type
              </label>
              <select
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {purposes.map((purpose) => (
                  <option key={purpose.id} value={purpose.id}>
                    {purpose.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {purposes.find(p => p.id === selectedPurpose)?.description}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              'Test Access & Parse Content'
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <XCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
              <p className="text-red-700">{error.error || error.message}</p>
              {error.license && (
                <div className="mt-4 p-4 bg-red-100 rounded-md">
                  <p className="text-sm text-red-800 mb-2">{error.license.message}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-red-700">
                    <div>
                      <span className="font-medium">Publisher:</span> {error.license.publisherName}
                    </div>
                    <div>
                      <span className="font-medium">Policy:</span> {error.license.policyType}
                    </div>
                    <div>
                      <span className="font-medium">Rule:</span> {error.license.rule}
                    </div>
                  </div>
                </div>
              )}
              {error.details && (
                <pre className="mt-2 text-sm text-red-600 overflow-x-auto bg-red-100 p-2 rounded">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Access Granted Banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Access Granted ✓</h3>
                <p className="text-green-700 mb-4">{result.license.message}</p>
                
                {/* Pricing & License Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Cost per Fetch</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ${result.license.costPerFetch?.toFixed(4) || '0.0000'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">USD</div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">License Type</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {result.license.licenseTypeName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Type {result.license.licenseType}</div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ClockIcon className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Processing Time</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {result.processingTimeMs}ms
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Response time</div>
                  </div>
                </div>

                {/* Policy Details */}
                <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Policy Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Publisher:</span>
                      <div className="font-medium text-gray-900">{result.license.publisherName}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Policy Type:</span>
                      <div className="font-medium text-gray-900 capitalize">{result.license.policyType}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Matched Rule:</span>
                      <div className="font-medium text-gray-900">{result.license.rule}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Version:</span>
                      <div className="font-medium text-gray-900">v{result.license.policyVersion}</div>
                    </div>
                  </div>

                  {/* Conditional License Restrictions */}
                  {(result.license.maxWordCount || result.license.attributionRequired) && (
                    <div className="mt-3 pt-3 border-t border-green-100">
                      <span className="text-xs font-medium text-gray-700">License Restrictions:</span>
                      <div className="flex gap-4 mt-2">
                        {result.license.maxWordCount && (
                          <div className="flex items-center gap-1 text-sm">
                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                            <span className="text-amber-700">Max {result.license.maxWordCount} words</span>
                          </div>
                        )}
                        {result.license.attributionRequired && (
                          <div className="flex items-center gap-1 text-sm">
                            <ExclamationTriangleIcon className="w-4 h-4 text-purple-600" />
                            <span className="text-purple-700">Attribution required</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
            <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto max-h-96">
              <pre className="text-sm whitespace-pre-wrap">{result.markdown}</pre>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(result.markdown)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
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
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Download .md
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Tests ({testHistory.length})
            </h2>
            <button
              onClick={() => setTestHistory([])}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear History
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {testHistory.map((test) => (
              <div key={test.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {test.allowed ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${test.allowed ? 'text-green-700' : 'text-red-700'}`}>
                          {test.allowed ? 'GRANTED' : 'DENIED'}
                        </span>
                        <span className="text-xs text-gray-500">{test.timestamp}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {test.bot}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {test.purpose}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 font-mono truncate">
                        {test.url}
                      </div>
                      {test.allowed && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <span>Cost: <span className="font-semibold text-green-600">${test.cost.toFixed(4)}</span></span>
                          <span>License: <span className="font-semibold text-blue-600">{test.licenseType}</span></span>
                          <span>Time: {test.responseTime}ms</span>
                        </div>
                      )}
                      {test.error && (
                        <div className="mt-2 text-xs text-red-600">
                          {test.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
