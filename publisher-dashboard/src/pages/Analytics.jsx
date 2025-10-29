import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  CheckCircleIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const purposeNames = {
  0: 'Training + Display',
  1: 'RAG Display (Unrestricted)',
  2: 'RAG Display (Max Words)',
  3: 'RAG Display (Attribution)',
  4: 'RAG No Display',
  'inference': 'Inference'
};

export default function Analytics({ publisherId }) {
  const [analytics, setAnalytics] = useState({
    revenueOverTime: [],
    accessByBot: [],
    accessByPurpose: [],
    totalRevenue: 0,
    totalRequests: 0
  });
  const [usageLogs, setUsageLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [publisherId]);

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`/usage?publisherId=${publisherId}&limit=100`);
      const events = response.data.events || [];
      setUsageLogs(events);

      // Calculate total revenue and requests
      const totalRevenue = events.reduce((sum, e) => sum + ((e.cost_micro || 0) / 1000000), 0);
      const totalRequests = events.length;

      // Revenue over time (group by date)
      const revenueByDate = {};
      events.forEach(e => {
        const date = new Date(e.ts).toLocaleDateString();
        const revenue = (e.cost_micro || 0) / 1000000;
        revenueByDate[date] = (revenueByDate[date] || 0) + revenue;
      });

      const revenueOverTime = Object.entries(revenueByDate)
        .map(([date, revenue]) => ({ date, revenue: parseFloat(revenue.toFixed(4)) }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Access by bot
      const botCounts = {};
      events.forEach(e => {
        const bot = e.agent_ua || e.client_id || 'Unknown';
        botCounts[bot] = (botCounts[bot] || 0) + 1;
      });

      const accessByBot = Object.entries(botCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10

      // Access by purpose
      const purposeCounts = {};
      events.forEach(e => {
        const purpose = purposeNames[e.purpose] || e.purpose || 'unknown';
        purposeCounts[purpose] = (purposeCounts[purpose] || 0) + 1;
      });

      const accessByPurpose = Object.entries(purposeCounts)
        .map(([name, value]) => ({ name, value }));

      setAnalytics({
        revenueOverTime,
        accessByBot,
        accessByPurpose,
        totalRevenue,
        totalRequests
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Analytics & Usage</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-sm text-gray-600">Total Revenue</div>
              <div className="text-2xl font-bold text-green-600">
                ${analytics.totalRevenue.toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircleIcon className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">Total Requests</div>
              <div className="text-2xl font-bold text-blue-600">
                {analytics.totalRequests.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <GlobeAltIcon className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-sm text-gray-600">Average Cost</div>
              <div className="text-2xl font-bold text-purple-600">
                ${analytics.totalRequests > 0 ? (analytics.totalRevenue / analytics.totalRequests).toFixed(4) : '0.0000'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
          {analytics.revenueOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No revenue data yet</p>
          )}
        </div>

        {/* Access by Purpose */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Access by Purpose</h3>
          {analytics.accessByPurpose.length > 0 ? (
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.accessByPurpose}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.accessByPurpose.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No purpose data yet</p>
          )}
        </div>
      </div>

      {/* Access by Bot */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Access by Bot (Top 10)</h3>
        {analytics.accessByBot.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.accessByBot}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10B981" name="Accesses" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No access data yet</p>
        )}
      </div>

      {/* Usage Logs Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Recent Usage Logs</h3>
          <p className="text-sm text-gray-600 mt-1">Last {usageLogs.length} requests</p>
        </div>
        {usageLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bot / Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usageLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        {new Date(log.ts).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                        {log.client_id || log.agent_ua || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono max-w-xs truncate">
                      {log.url}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        {purposeNames[log.purpose] || log.purpose || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ${((log.cost_micro || 0) / 1000000).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500">No usage logs yet</p>
            <p className="text-sm text-gray-400 mt-2">Usage will appear here after content is accessed through the Scraper</p>
          </div>
        )}
      </div>
    </div>
  );
}
