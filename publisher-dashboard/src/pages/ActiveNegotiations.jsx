import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import negotiationApi from '../services/negotiationApi';
import useNegotiationSocket from '../hooks/useNegotiationSocket';

const STATUS_COLORS = {
  negotiating: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  timeout: 'bg-gray-100 text-gray-800',
  initiated: 'bg-blue-100 text-blue-800'
};

export default function ActiveNegotiations() {
  const publisherId = 1; // TODO: Get from auth context
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null); // Track which negotiation is being acted upon
  const [showRejectDialog, setShowRejectDialog] = useState(null); // Track rejection dialog
  const [rejectReason, setRejectReason] = useState('');
  const { isConnected, lastEvent } = useNegotiationSocket(publisherId);

  useEffect(() => {
    loadNegotiations();
    // Poll for updates every 10 seconds as backup
    const interval = setInterval(loadNegotiations, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  // Handle real-time updates
  useEffect(() => {
    if (!lastEvent) return;

    console.log('Real-time event:', lastEvent);

    // Update the negotiations list based on event
    if (lastEvent.type === 'initiated') {
      // Add new negotiation
      loadNegotiations();
    } else if (['round', 'accepted', 'rejected'].includes(lastEvent.type)) {
      // Update existing negotiation or reload list for status changes
      if (lastEvent.type === 'accepted' || lastEvent.type === 'rejected') {
        // Reload entire list to reflect status change
        loadNegotiations();
      } else {
        // Update existing negotiation for round updates
        setNegotiations(prev => 
          prev.map(neg => 
            neg.id === lastEvent.data.negotiationId
              ? { 
                  ...neg, 
                  status: lastEvent.data.status || neg.status,
                  current_round: lastEvent.data.round || neg.current_round,
                  last_activity_at: new Date().toISOString()
                }
              : neg
          )
        );
      }
    }
  }, [lastEvent]);

  async function loadNegotiations() {
    try {
      const statusFilter = filter === 'all' ? null : filter;
      const result = await negotiationApi.getNegotiations(publisherId, statusFilter);
      // Handle both {negotiations: [...]} and direct array response
      const negotiations = Array.isArray(result) ? result : (result.negotiations || []);
      setNegotiations(negotiations);
    } catch (error) {
      console.error('Failed to load negotiations:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  function formatPrice(micro) {
    return `$${(micro / 1000000).toFixed(4)}`;
  }

  async function handleAccept(negotiationId, e) {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();
    
    if (!confirm('Accept this negotiation? A license will be created with the negotiated terms.')) {
      return;
    }

    setActionLoading(negotiationId);
    try {
      const result = await negotiationApi.acceptNegotiation(negotiationId, publisherId);
      console.log('Negotiation accepted:', result);
      
      // Show success message
      alert(`Negotiation accepted! License #${result.license.id} created.`);
      
      // Reload negotiations list
      await loadNegotiations();
    } catch (error) {
      console.error('Failed to accept negotiation:', error);
      alert(`Failed to accept: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(negotiationId, e) {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();
    
    setShowRejectDialog(negotiationId);
  }

  async function confirmReject(negotiationId) {
    setActionLoading(negotiationId);
    try {
      await negotiationApi.rejectNegotiation(negotiationId, publisherId, rejectReason);
      console.log('Negotiation rejected');
      
      // Show success message
      alert('Negotiation rejected.');
      
      // Reload negotiations list
      await loadNegotiations();
      setShowRejectDialog(null);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject negotiation:', error);
      alert(`Failed to reject: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  const filteredNegotiations = filter === 'all' 
    ? negotiations 
    : negotiations.filter(n => n.status === filter);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Active Negotiations</h1>
          <p className="text-gray-600 mt-1">
            Real-time view of AI-to-AI license negotiations
            {isConnected && (
              <span className="ml-2 inline-flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                <span className="text-sm text-green-600">Live</span>
              </span>
            )}
          </p>
        </div>

        <Link 
          to="/negotiations/strategy"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Configure Strategy
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'all', label: 'All' },
            { id: 'negotiating', label: 'In Progress' },
            { id: 'accepted', label: 'Accepted' },
            { id: 'rejected', label: 'Rejected' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs text-gray-400">
                ({tab.id === 'all' ? negotiations.length : negotiations.filter(n => n.status === tab.id).length})
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Negotiations List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Loading negotiations...</p>
        </div>
      ) : filteredNegotiations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No negotiations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' 
              ? 'When AI companies propose licenses, they will appear here.'
              : `No ${filter} negotiations at this time.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNegotiations.map(negotiation => (
            <div
              key={negotiation.id}
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <Link
                to={`/negotiations/${negotiation.id}`}
                className="block"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {negotiation.client_name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[negotiation.status]}`}>
                        {negotiation.status}
                      </span>
                      {negotiation.status === 'negotiating' && (
                        <span className="text-sm text-gray-600">
                          Round {negotiation.current_round} of {negotiation.max_rounds}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Initiated</span>
                        <p className="font-medium">{formatDate(negotiation.initiated_at)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Activity</span>
                        <p className="font-medium">{formatDate(negotiation.last_activity_at)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Style</span>
                        <p className="font-medium capitalize">{negotiation.negotiation_style}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Rounds</span>
                        <p className="font-medium">{negotiation.round_count || 0}</p>
                      </div>
                    </div>

                    {negotiation.current_terms && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <div className="text-sm text-gray-600">
                          Current Terms: 
                          <span className="ml-2 font-medium text-gray-900">
                            {negotiation.current_terms.price_per_fetch_micro 
                              ? formatPrice(negotiation.current_terms.price_per_fetch_micro)
                              : negotiation.current_terms.price
                              ? `$${parseFloat(negotiation.current_terms.price).toFixed(4)}`
                              : negotiation.current_terms.preferred_price
                              ? `$${parseFloat(negotiation.current_terms.preferred_price).toFixed(4)}`
                              : '$0.0000'}
                          </span>
                          <span className="mx-2">•</span>
                          <span>{negotiation.current_terms.token_ttl_seconds || negotiation.current_terms.preferred_token_ttl_seconds || 0}s TTL</span>
                          <span className="mx-2">•</span>
                          <span>{negotiation.current_terms.burst_rps || negotiation.current_terms.preferred_burst_rps || 0} RPS</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Action Buttons for negotiating status */}
              {negotiation.status === 'negotiating' && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={(e) => handleAccept(negotiation.id, e)}
                    disabled={actionLoading === negotiation.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading === negotiation.id ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Accept & Create License'
                    )}
                  </button>
                  <button
                    onClick={(e) => handleReject(negotiation.id, e)}
                    disabled={actionLoading === negotiation.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Negotiation</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reject this negotiation? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectDialog(null);
                  setRejectReason('');
                }}
                disabled={actionLoading === showRejectDialog}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmReject(showRejectDialog)}
                disabled={actionLoading === showRejectDialog}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {actionLoading === showRejectDialog ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
