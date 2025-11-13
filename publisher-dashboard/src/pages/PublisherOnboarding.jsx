import { useState } from 'react';
import axios from 'axios';

export default function PublisherOnboarding({ user, onComplete }) {
  const [step, setStep] = useState('choose'); // 'choose', 'create', 'request'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingPublishers, setExistingPublishers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    description: ''
  });

  const loadExistingPublishers = async () => {
    try {
      const response = await axios.get('/api/publishers');
      setExistingPublishers(response.data.publishers || []);
    } catch (error) {
      console.error('Failed to load publishers:', error);
    }
  };

  const handleCreatePublisher = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create new publisher
      const publisherResponse = await axios.post('/api/publishers', {
        name: formData.name,
        hostname: formData.hostname,
        contact_email: user.email
      });

      const publisher = publisherResponse.data.publisher;

      // Link user to publisher
      await axios.post('/api/auth/google/link-publisher', {
        publisher_id: publisher.id
      });

      onComplete(publisher.id);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create publisher');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPublisher = async (publisherId) => {
    setLoading(true);
    try {
      await axios.post('/api/auth/google/link-publisher', {
        publisher_id: publisherId
      });
      onComplete(publisherId);
    } catch (error) {
      setError('Failed to link to publisher');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPublisher = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/auth/google/request-publisher', {
        requested_name: formData.name,
        requested_hostname: formData.hostname,
        business_description: formData.description
      });
      
      setStep('request-submitted');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'request-submitted') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-gray-700 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Request Submitted</h2>
            <p className="text-gray-400 mt-2">
              Your publisher request has been submitted for review. You'll be contacted at {user.email} once approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div style={{minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'}}>
      <div style={{background: '#1f2937', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: '2rem', width: '100%', maxWidth: '48rem', border: '1px solid #374151'}}>
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
          <h1 style={{fontSize: '1.875rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem'}}>Publisher Setup</h1>
          <p style={{color: '#9ca3af', fontSize: '0.875rem'}}>
            Welcome {user.name}! Choose an option below to get started.
          </p>
        </div>

        {step === 'choose' && (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem'}}>
            <button
              onClick={() => { loadExistingPublishers(); setStep('select'); }}
              style={{padding: '2rem 1rem', border: '1px solid #4b5563', borderRadius: '0.5rem', background: '#1f2937', cursor: 'pointer'}}
              onMouseEnter={(e) => {e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#1e3a5f';}}
              onMouseLeave={(e) => {e.currentTarget.style.borderColor = '#4b5563'; e.currentTarget.style.background = '#1f2937';}}
            >
              <svg style={{width: '3rem', height: '3rem', margin: '0 auto 1rem', color: '#60a5fa'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div style={{fontSize: '1.125rem', fontWeight: '600', color: 'white'}}>Join Existing</div>
            </button>

            <button
              onClick={() => setStep('create')}
              style={{padding: '2rem 1rem', border: '1px solid #4b5563', borderRadius: '0.5rem', background: '#1f2937', cursor: 'pointer'}}
              onMouseEnter={(e) => {e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#1e4d3d';}}
              onMouseLeave={(e) => {e.currentTarget.style.borderColor = '#4b5563'; e.currentTarget.style.background = '#1f2937';}}
            >
              <svg style={{width: '3rem', height: '3rem', margin: '0 auto 1rem', color: '#34d399'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <div style={{fontSize: '1.125rem', fontWeight: '600', color: 'white'}}>Create New</div>
            </button>

            <button
              onClick={() => setStep('request')}
              style={{padding: '2rem 1rem', border: '1px solid #4b5563', borderRadius: '0.5rem', background: '#1f2937', cursor: 'pointer'}}
              onMouseEnter={(e) => {e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = '#3730a3';}}
              onMouseLeave={(e) => {e.currentTarget.style.borderColor = '#4b5563'; e.currentTarget.style.background = '#1f2937';}}
            >
              <svg style={{width: '3rem', height: '3rem', margin: '0 auto 1rem', color: '#a78bfa'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div style={{fontSize: '1.125rem', fontWeight: '600', color: 'white'}}>Request Access</div>
            </button>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('choose')}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            <h2 className="text-xl font-bold text-white">Select Publisher</h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {existingPublishers.map((publisher) => (
                <button
                  key={publisher.id}
                  onClick={() => handleSelectPublisher(publisher.id)}
                  disabled={loading}
                  className="w-full p-4 text-left border border-gray-600 rounded-lg hover:border-blue-500 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-white">{publisher.name}</div>
                  <div className="text-sm text-gray-400">{publisher.hostname}</div>
                  {publisher.contact_email && (
                    <div className="text-xs text-gray-500">{publisher.contact_email}</div>
                  )}
                </button>
              ))}
              
              {existingPublishers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No publishers available. Create a new one instead.
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'create' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('choose')}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            <h2 className="text-xl font-bold text-white">Create Publisher</h2>
            
            <form onSubmit={handleCreatePublisher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Publisher Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., My News Site"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Hostname *
                </label>
                <input
                  type="text"
                  value={formData.hostname}
                  onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., mynewssite.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The domain name where your content is hosted
                </p>
              </div>

              {error && (
                <div className="bg-red-900/50 text-red-200 px-4 py-3 rounded-md text-sm border border-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Publisher'}
              </button>
            </form>
          </div>
        )}

        {step === 'request' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('choose')}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            <h2 className="text-xl font-bold text-white">Request Publisher Access</h2>
            <p className="text-gray-400">
              Submit a request to create a publisher. An admin will review and approve your request.
            </p>
            
            <form onSubmit={handleRequestPublisher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Publisher Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., My News Site"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Hostname *
                </label>
                <input
                  type="text"
                  value={formData.hostname}
                  onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., mynewssite.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Business Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Describe your content business..."
                  rows={3}
                />
              </div>

              {error && (
                <div className="bg-red-900/50 text-red-200 px-4 py-3 rounded-md text-sm border border-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
