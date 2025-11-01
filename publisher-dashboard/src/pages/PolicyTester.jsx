import { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { LICENSING_API as API_URL } from '../utils/apiConfig';

export default function PolicyTester() {
  const [urls, setUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [selectedBot, setSelectedBot] = useState('GPTBot');
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  const commonBots = [
    { id: 'GPTBot', name: 'GPTBot (OpenAI)', description: 'ChatGPT crawler' },
    { id: 'ClaudeBot', name: 'ClaudeBot (Anthropic)', description: 'Claude crawler' },
    { id: 'Perplexity', name: 'Perplexity', description: 'Perplexity AI crawler' },
    { id: 'GoogleBot', name: 'GoogleBot', description: 'Google search crawler' },
    { id: 'BingBot', name: 'BingBot', description: 'Bing search crawler' },
    { id: 'UnknownBot', name: 'UnknownBot', description: 'Unlisted/unknown bot' }
  ];

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      const response = await fetch(`${API_URL}/parsed-urls`);
      const data = await response.json();
      if (data.success) {
        setUrls(data.urls || []);
        if (data.urls?.length > 0) {
          setSelectedUrl(data.urls[0].url);
        }
      }
    } catch (error) {
      console.error('Failed to fetch URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    if (!selectedUrl) {
      alert('Please select a URL to test');
      return;
    }

    setTesting(true);

    try {
      const response = await fetch(`${API_URL}/grounding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: selectedUrl,
          clientId: selectedBot
        })
      });

      const data = await response.json();
      
      const result = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        url: selectedUrl,
        bot: selectedBot,
        allowed: !data.error,
        status: response.status,
        data: data,
        errorMessage: data.error || null
      };

      setTestResults([result, ...testResults]);
    } catch (error) {
      const result = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        url: selectedUrl,
        bot: selectedBot,
        allowed: false,
        status: 500,
        data: null,
        errorMessage: error.message
      };
      setTestResults([result, ...testResults]);
    } finally {
      setTesting(false);
    }
  };

  const runQuickTestSuite = async () => {
    if (!selectedUrl) {
      alert('Please select a URL to test');
      return;
    }

    setTesting(true);
    const testBots = ['GPTBot', 'ClaudeBot', 'Perplexity', 'UnknownBot'];
    const newResults = [];

    for (const bot of testBots) {
      try {
        const response = await fetch(`${API_URL}/grounding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: selectedUrl,
            clientId: bot,
            purpose: selectedPurpose
          })
        });

        const data = await response.json();
        
        newResults.push({
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          url: selectedUrl,
          bot: bot,
          purpose: selectedPurpose,
          allowed: !data.error,
          status: response.status,
          data: data,
          errorMessage: data.error || null
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        newResults.push({
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          url: selectedUrl,
          bot: bot,
          purpose: selectedPurpose,
          allowed: false,
          status: 500,
          data: null,
          errorMessage: error.message
        });
      }
    }

    setTestResults([...newResults, ...testResults]);
    setTesting(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Policy Tester</h1>
        <p className="text-gray-600 mt-1">
          Simulate bot visits to your URLs and see how policies are enforced in real-time
        </p>
      </div>

      {/* Scraper */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Scraper</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* URL Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select URL
            </label>
            <select
              value={selectedUrl}
              onChange={(e) => setSelectedUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {urls.length === 0 ? (
                <option value="">No URLs in library</option>
              ) : (
                urls.map((url) => (
                  <option key={url.id} value={url.url}>
                    {url.url}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {urls.length} URL{urls.length !== 1 ? 's' : ''} in library
            </p>
          </div>

          {/* Bot Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bot / Client
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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={runTest}
            disabled={testing || !selectedUrl}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md"
          >
            <PlayIcon className="w-5 h-5" />
            {testing ? 'Testing...' : 'Run Single Test'}
          </button>
          <button
            onClick={runQuickTestSuite}
            disabled={testing || !selectedUrl}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-md"
          >
            <ArrowPathIcon className="w-5 h-5" />
            {testing ? 'Testing...' : 'Run Quick Suite (4 Bots)'}
          </button>
          {testResults.length > 0 && (
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Test Results ({testResults.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {testResults.map((result) => (
              <TestResult key={result.id} result={result} />
            ))}
          </div>
        </div>
      )}

      {testResults.length === 0 && (
        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <PlayIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No test results yet</p>
          <p className="text-sm text-gray-500">
            Run a test to see how policies are enforced for different bots
          </p>
        </div>
      )}
    </div>
  );
}

function TestResult({ result }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {result.allowed ? (
              <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <XCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${result.allowed ? 'text-green-700' : 'text-red-700'}`}>
                  {result.allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                  {result.status}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <ClockIcon className="w-3 h-3" />
                  {result.timestamp}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-medium">{result.bot}</span> attempted to access
              </div>
            </div>
          </div>

          <div className="ml-9 text-sm text-gray-500 font-mono break-all">
            {result.url}
          </div>

          {/* Quick Info */}
          {result.allowed && result.data?.license && (
            <div className="ml-9 mt-3 space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold text-green-600">
                    ${result.data.license.costPerFetch?.toFixed(4) || '0.0000'}
                  </span>
                  <span className="text-gray-500 text-xs">{result.data.license.currency || 'USD'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${result.data.license.status === 'licensed' ? 'text-green-600' : 'text-amber-600'}`}>
                    {result.data.license.status}
                  </span>
                </div>
              </div>

              {/* License Type Info */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">License Type:</span>
                  <span className="font-medium text-blue-600">
                    {result.data.license.licenseTypeName || 'RAGDisplayUnrestricted'}
                  </span>
                  <span className="text-gray-500 text-xs">({result.data.license.licenseType})</span>
                </div>
              </div>

              {/* Conditional License Details */}
              {(result.data.license.maxWordCount || result.data.license.attributionRequired) && (
                <div className="flex items-center gap-4 text-sm pl-5">
                  {result.data.license.maxWordCount && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Max Words:</span>
                      <span className="font-medium text-amber-600">
                        {result.data.license.maxWordCount}
                      </span>
                    </div>
                  )}
                  {result.data.license.attributionRequired && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Attribution:</span>
                      <span className="font-medium text-purple-600">
                        Required
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Policy Info */}
              <div className="text-xs text-gray-500">
                Policy: <span className="font-medium text-gray-700">{result.data.license.policyName}</span>
                {' • '}
                Rule: <span className="font-medium text-gray-700">{result.data.license.rule}</span>
                {' • '}
                Type: <span className="font-medium text-gray-700">{result.data.license.policyType}</span>
              </div>
            </div>
          )}

          {/* Legacy rate info fallback */}
          {result.allowed && result.data?.rate && !result.data?.license && (
            <div className="ml-9 mt-3 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold text-green-600">
                  ${(result.data.rate.priceMicros / 1000000).toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600">License:</span>
                <span className="font-medium text-gray-900">
                  {result.data.rate.licenseType}
                </span>
              </div>
              {result.data.rate.licensePath && (
                <div className="flex items-center gap-1">
                  <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600">{result.data.rate.licensePath}</span>
                </div>
              )}
            </div>
          )}

          {result.errorMessage && (
            <div className="ml-9 mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-red-800">Error</div>
                <div className="text-sm text-red-700">{result.errorMessage}</div>
              </div>
            </div>
          )}

          {/* Expandable Details */}
          {result.data && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-9 mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
              {expanded ? '▼ Hide Details' : '▶ Show Full Response'}
            </button>
          )}

          {expanded && result.data && (
            <div className="ml-9 mt-3 bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
