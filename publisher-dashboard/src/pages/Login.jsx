import { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [publisherId, setPublisherId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verify publisher exists
  const response = await axios.get(`/api/policies/${publisherId}`);
      if (response.data) {
        onLogin(parseInt(publisherId));
      }
    } catch (err) {
      setError('Publisher not found or API unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔐 Publisher Dashboard
          </h1>
          <p className="text-gray-600">Content Licensing Gateway</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="publisherId" className="block text-sm font-medium text-gray-700 mb-2">
              Publisher ID
            </label>
            <select
              id="publisherId"
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1">Publisher A (ID: 1)</option>
              <option value="2">Publisher B (ID: 2)</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Educational MVP - No real authentication
          </p>
        </div>
      </div>
    </div>
  );
}
