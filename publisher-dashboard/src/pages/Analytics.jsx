import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Analytics({ publisherId }) {
  const [analytics, setAnalytics] = useState({
    revenueOverTime: [],
    accessByBot: [],
    accessByPurpose: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [publisherId]);

  const loadAnalytics = async () => {
    try {
  const response = await axios.get(`/api/usage?publisherId=${publisherId}&limit=100`);
      const events = response.data.events || [];

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
        const bot = e.agent_ua || 'Unknown';
        botCounts[bot] = (botCounts[bot] || 0) + 1;
      });

      const accessByBot = Object.entries(botCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Access by purpose
      const purposeCounts = {};
      events.forEach(e => {
        const purpose = e.purpose || 'unknown';
        purposeCounts[purpose] = (purposeCounts[purpose] || 0) + 1;
      });

      const accessByPurpose = Object.entries(purposeCounts)
        .map(([name, value]) => ({ name, value }));

      setAnalytics({
        revenueOverTime,
        accessByBot,
        accessByPurpose
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
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Analytics</h2>

      <div className="space-y-6">
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

        {/* Access by Bot */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Access by Bot</h3>
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
    </div>
  );
}
