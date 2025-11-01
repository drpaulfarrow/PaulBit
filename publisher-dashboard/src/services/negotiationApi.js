// Negotiation Agent API Client
const NEGOTIATION_API = import.meta.env.VITE_NEGOTIATION_API_URL || 'http://localhost:3003';
const LICENSING_API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const negotiationApi = {
  // Strategies
  async getStrategies(publisherId) {
    const res = await fetch(`${LICENSING_API}/api/negotiations/strategies?publisher_id=${publisherId}`);
    if (!res.ok) throw new Error('Failed to fetch strategies');
    const data = await res.json();
    return data.strategies || [];
  },

  async createStrategy(strategy) {
    const res = await fetch(`${LICENSING_API}/api/negotiations/strategies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(strategy)
    });
    if (!res.ok) throw new Error('Failed to create strategy');
    const data = await res.json();
    return data.strategy;
  },

  async updateStrategy(strategyId, updates) {
    const res = await fetch(`${LICENSING_API}/api/negotiations/strategies/${strategyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update strategy');
    const data = await res.json();
    return data.strategy;
  },

  async deleteStrategy(strategyId) {
    const res = await fetch(`${LICENSING_API}/api/negotiations/strategies/${strategyId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete strategy');
  },

  // Negotiations
  async getNegotiations(publisherId, status = null, limit = 50, offset = 0) {
    const params = new URLSearchParams({ publisher_id: publisherId, limit, offset });
    if (status) params.append('status', status);
    
    const res = await fetch(
      `${LICENSING_API}/api/negotiations?${params}`
    );
    if (!res.ok) throw new Error('Failed to fetch negotiations');
    const data = await res.json();
    return data.negotiations || [];
  },

  async getNegotiation(negotiationId) {
    const res = await fetch(`${LICENSING_API}/api/negotiations/${negotiationId}`);
    if (!res.ok) throw new Error('Failed to fetch negotiation');
    return res.json();
  },

  async generateLicense(negotiationId) {
    const res = await fetch(
      `${NEGOTIATION_API}/api/negotiations/${negotiationId}/generate-license`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error('Failed to generate license');
    return res.json();
  },

  async acceptNegotiation(negotiationId, publisherId) {
    const res = await fetch(
      `${LICENSING_API}/api/negotiations/${negotiationId}/accept`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publisherId })
      }
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to accept negotiation');
    }
    const data = await res.json();
    return data.negotiation || data;
  },

  async rejectNegotiation(negotiationId, publisherId, reason = '') {
    const res = await fetch(
      `${LICENSING_API}/api/negotiations/${negotiationId}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publisherId, reason })
      }
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to reject negotiation');
    }
    const data = await res.json();
    return data.negotiation || data;
  },

  // Analytics
  async getAnalytics(publisherId, days = 30) {
    const params = new URLSearchParams({ days });
    if (publisherId) params.append('publisherId', publisherId);
    
    const res = await fetch(`${NEGOTIATION_API}/api/analytics/negotiations?${params}`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  }
};

export default negotiationApi;
