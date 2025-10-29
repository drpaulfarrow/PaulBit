import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import negotiationApi from '../services/negotiationApi';
import useNegotiationSocket from '../hooks/useNegotiationSocket';

const STATUS_COLORS = {
  negotiating: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  timeout: 'bg-gray-100 text-gray-800'
};

export default function NegotiationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [negotiation, setNegotiation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const publisherId = negotiation?.publisher_id || 1;
  const { isConnected, lastEvent } = useNegotiationSocket(publisherId);

  useEffect(() => {
    loadNegotiation();
  }, [id]);

  // Handle real-time updates for this specific negotiation
  useEffect(() => {
    if (!lastEvent || !negotiation) return;
    if (lastEvent.data.negotiationId === id) {
      loadNegotiation();
    }
  }, [lastEvent, id]);

  async function loadNegotiation() {
    try {
      const data = await negotiationApi.getNegotiation(id);
      setNegotiation(data);
    } catch (error) {
      console.error('Failed to load negotiation:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateLicense() {
    if (!confirm('Generate a license from these negotiated terms?')) return;
    
    setGenerating(true);
    try {
      const license = await negotiationApi.generateLicense(id);
      alert(`License generated! Policy ID: ${license.policy_id}`);
      await loadNegotiation();
    } catch (error) {
      alert('Failed to generate license: ' + error.message);
    } finally {
      setGenerating(false);
    }
  }

  function formatPrice(micro) {
    return `$${(micro / 1000000).toFixed(4)}`;
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!negotiation) {
    return (
      <div className="p-6 text-center">
        <p>Negotiation not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/negotiations')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Negotiation with {negotiation.client_name}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                ID: {negotiation.id}
                {isConnected && (
                  <span className="ml-2 inline-flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                    <span className="text-green-600">Live</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {negotiation.status === 'accepted' && !negotiation.generated_policy_id && (
              <button
                onClick={handleGenerateLicense}
                disabled={generating}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate License'}
              </button>
            )}
            {negotiation.generated_policy_id && (
              <Link
                to={`/policies/${negotiation.generated_policy_id}`}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                View License
              </Link>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[negotiation.status]}`}>
              {negotiation.status.toUpperCase()}
            </span>
            <div className="text-sm text-gray-600">
              Round {negotiation.current_round} of {negotiation.max_rounds || 10}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-500">Initiated</span>
              <p className="text-sm font-medium">{formatDateTime(negotiation.initiated_at)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Last Activity</span>
              <p className="text-sm font-medium">{formatDateTime(negotiation.last_activity_at)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Strategy</span>
              <p className="text-sm font-medium capitalize">{negotiation.negotiation_style}</p>
            </div>
            {negotiation.completed_at && (
              <div>
                <span className="text-sm text-gray-500">Completed</span>
                <p className="text-sm font-medium">{formatDateTime(negotiation.completed_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Current/Final Terms */}
        {(negotiation.current_terms || negotiation.final_terms) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {negotiation.status === 'accepted' ? 'Final Terms' : 'Current Terms'}
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(negotiation.final_terms || negotiation.current_terms).map(([key, value]) => (
                <div key={key}>
                  <span className="text-sm text-gray-500 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <p className="text-sm font-medium">
                    {key.includes('price') ? formatPrice(value) : 
                     Array.isArray(value) ? value.join(', ') : 
                     value.toString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Negotiation Rounds */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Negotiation History</h2>
          
          {negotiation.rounds && negotiation.rounds.length > 0 ? (
            <div className="space-y-4">
              {negotiation.rounds.map((round, index) => (
                <div key={round.id} className="border-l-4 border-gray-300 pl-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        Round {round.round_number} - {round.actor === 'publisher' ? '🏢 Publisher' : '🤖 AI Company'}
                      </span>
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                        round.action === 'accept' ? 'bg-green-100 text-green-800' :
                        round.action === 'reject' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {round.action}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(round.created_at)}
                    </span>
                  </div>

                  {round.proposed_terms && Object.keys(round.proposed_terms).length > 0 && (
                    <div className="mb-2 p-3 bg-gray-50 rounded text-sm">
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(round.proposed_terms).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-600 text-xs">{key.replace(/_/g, ' ')}:</span>
                            <span className="ml-1 font-medium">
                              {key.includes('price') ? formatPrice(value) :
                               Array.isArray(value) ? value.join(', ') :
                               value.toString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {round.reasoning && (
                    <div className="text-sm text-gray-700 italic">
                      "{round.reasoning}"
                    </div>
                  )}

                  {round.llm_model && (
                    <div className="mt-2 text-xs text-gray-500">
                      Generated by {round.llm_model} ({round.llm_tokens_used} tokens, {round.llm_response_time_ms}ms)
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No rounds recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
