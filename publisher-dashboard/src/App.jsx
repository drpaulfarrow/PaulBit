import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
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

function App() {
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publisherId, setPublisherId] = useState(null);

  useEffect(() => {
    // Check if password was already verified
    const storedPasswordVerified = localStorage.getItem('passwordVerified');
    if (storedPasswordVerified === 'true') {
      setPasswordVerified(true);
    }
    
    // Check if user is already logged in (simple localStorage check for MVP)
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedPublisherId = localStorage.getItem('publisherId');
    if (storedAuth === 'true' && storedPublisherId) {
      setIsAuthenticated(true);
      setPublisherId(parseInt(storedPublisherId));
    }
  }, []);

  const handlePasswordSuccess = () => {
    setPasswordVerified(true);
    localStorage.setItem('passwordVerified', 'true');
  };

  const handleLogin = (pubId) => {
    setIsAuthenticated(true);
    setPublisherId(pubId);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('publisherId', pubId.toString());
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPublisherId(null);
    setPasswordVerified(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('publisherId');
    localStorage.removeItem('passwordVerified');
  };

  if (!passwordVerified) {
    return <PasswordGate onSuccess={handlePasswordSuccess} />;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
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

export default App;
