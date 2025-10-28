import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard({ publisherId }) {
  const [stats, setStats] = useState({
    totalAccesses: 0,
    totalRevenue: 0,
    activeTokens: 0,
    topBots: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [publisherId]);

  const loadStats = async () => {
    try {
      const [usageRes, logsRes] = await Promise.all([
        axios.get(`/api/usage?publisherId=${publisherId}&limit=100`),
        axios.get(`/api/admin/logs?limit=100`)
      ]);

      const events = usageRes.data.events || [];
      const totalRevenue = events.reduce((sum, e) => sum + (e.cost_micro || 0), 0) / 1000000;
      
      // Count bot accesses
      const botCounts = {};
      events.forEach(e => {
        const bot = e.agent_ua || 'Unknown';
        botCounts[bot] = (botCounts[bot] || 0) + 1;
      });

      const topBots = Object.entries(botCounts)
        .map(([bot, count]) => ({ bot, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalAccesses: events.length,
        totalRevenue,
        activeTokens: logsRes.data.logs?.filter(l => l.status === 'success').length || 0,
        topBots
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Accesses</div>
          <div className="text-3xl font-bold text-blue-600">{stats.totalAccesses}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Active Tokens</div>
          <div className="text-3xl font-bold text-purple-600">{stats.activeTokens}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Unique Bots</div>
          <div className="text-3xl font-bold text-orange-600">{stats.topBots.length}</div>
        </div>
      </div>

      {/* Top Bots */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Top Bots by Access</h3>
        <div className="space-y-3">
          {stats.topBots.map((bot, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                  {idx + 1}
                </div>
                <span className="font-medium text-gray-900">{bot.bot}</span>
              </div>
              <span className="text-gray-600">{bot.count} accesses</span>
            </div>
          ))}
          {stats.topBots.length === 0 && (
            <p className="text-gray-500 text-center py-4">No bot access data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
