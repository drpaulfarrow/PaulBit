import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import axios from 'axios';
import Layout from './components/Layout';
import GoogleLogin from './components/GoogleLogin';
import PublisherSelector from './components/PublisherSelector';
import PasswordGate from './components/PasswordGate';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import UsageLogs from './pages/UsageLogs';
import Grounding from './pages/Grounding';
import UrlLibrary from './pages/UrlLibrary';
import LicenseWizard from './pages/LicenseWizard';
import AccessConfiguration from './pages/AccessConfiguration';
import PartnerStrategies from './pages/PartnerStrategies';
import ActiveNegotiations from './pages/ActiveNegotiations';
import NegotiationDetail from './pages/NegotiationDetail';
import Notifications from './pages/Notifications';
import './index.css';

// Google Client ID - will be set via environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const USE_GOOGLE_AUTH = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 0;

const setSessionToken = (token) => {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [publishers, setPublishers] = useState([]);
  const [publisherId, setPublisherId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Legacy auth state (for backward compatibility)
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    if (USE_GOOGLE_AUTH) {
      // Google OAuth flow
      const token = localStorage.getItem('sessionToken');
      const storedPublisherId = localStorage.getItem('publisherId');
      
      if (token) {
        try {
          const response = await axios.get('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.valid) {
            setUser(response.data.user);
            setPublishers(response.data.user.publishers || []);
            setSessionToken(token);
            
            if (storedPublisherId) {
              setPublisherId(parseInt(storedPublisherId));
            }
          } else {
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('publisherId');
            setSessionToken(null);
          }
        } catch (error) {
          console.error('Session verification failed:', error);
          localStorage.removeItem('sessionToken');
          localStorage.removeItem('publisherId');
          setSessionToken(null);
        }
      }
    } else {
      // Legacy password flow
      const storedPasswordVerified = localStorage.getItem('passwordVerified');
      if (storedPasswordVerified === 'true') {
        setPasswordVerified(true);
      }
      
      const storedAuth = localStorage.getItem('isAuthenticated');
      const storedPublisherId = localStorage.getItem('publisherId');
      if (storedAuth === 'true' && storedPublisherId) {
        setIsAuthenticated(true);
        setPublisherId(parseInt(storedPublisherId));
      }
    }
    
    setLoading(false);
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const response = await axios.post('/api/auth/google', {
        credential: credentialResponse.credential
      });
      
      if (response.data.success) {
        setUser(response.data.user);
        setPublishers(response.data.publishers);
        localStorage.setItem('sessionToken', response.data.token);
        setSessionToken(response.data.token);
        
        // If user has only one publisher, auto-select it
        if (response.data.publishers.length === 1) {
          setPublisherId(response.data.publishers[0].id);
          localStorage.setItem('publisherId', response.data.publishers[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Google login failed:', error);
      alert('Authentication failed. Please try again or contact support.');
    }
  };

  const handlePublisherSelect = (pubId) => {
    setPublisherId(pubId);
    localStorage.setItem('publisherId', pubId.toString());
  };

  const handleLogout = () => {
    setUser(null);
    setPublishers([]);
    setPublisherId(null);
    setIsAuthenticated(false);
    setPasswordVerified(false);
    setSessionToken(null);
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('publisherId');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('passwordVerified');
  };

  // Legacy auth handlers (for backward compatibility)
  const handlePasswordSuccess = () => {
    setPasswordVerified(true);
    localStorage.setItem('passwordVerified', 'true');
  };

  const handleLegacyLogin = (pubId) => {
    setIsAuthenticated(true);
    setPublisherId(pubId);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('publisherId', pubId.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Google OAuth flow
  if (USE_GOOGLE_AUTH) {
    if (!user) {
      return <GoogleLogin onLogin={handleGoogleLogin} />;
    }

    if (!publisherId) {
      return (
        <PublisherSelector
          user={user}
          publishers={publishers}
          onSelect={handlePublisherSelect}
          onLogout={handleLogout}
        />
      );
    }
  } else {
    // Legacy password flow (backward compatible)
    if (!passwordVerified) {
      return <PasswordGate onSuccess={handlePasswordSuccess} />;
    }

    if (!isAuthenticated) {
      return <Login onLogin={handleLegacyLogin} />;
    }
  }

  return (
    <BrowserRouter basename="/demo">
      <Layout publisherId={publisherId} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard publisherId={publisherId} />} />
          <Route path="/analytics" element={<Analytics publisherId={publisherId} />} />
          <Route path="/urls" element={<UrlLibrary />} />
          <Route path="/licenses" element={<LicenseWizard publisherId={publisherId} />} />
          <Route path="/access" element={<AccessConfiguration publisherId={publisherId} />} />
          <Route path="/grounding" element={<Grounding />} />
          <Route path="/notifications" element={<Notifications publisherId={publisherId} />} />
          <Route path="/negotiations" element={<ActiveNegotiations publisherId={publisherId} />} />
          <Route path="/negotiations/:id" element={<NegotiationDetail />} />
          <Route path="/negotiations/strategy" element={<PartnerStrategies publisherId={publisherId} />} />
          <Route path="/logs" element={<UsageLogs publisherId={publisherId} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

// Wrap with Google OAuth Provider if using Google auth
function App() {
  if (USE_GOOGLE_AUTH && GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AppContent />
      </GoogleOAuthProvider>
    );
  }
  return <AppContent />;
}

export default App;
