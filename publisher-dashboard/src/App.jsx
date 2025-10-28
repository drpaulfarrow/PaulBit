import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PolicyEditor from './pages/PolicyEditor';
import PolicyEditorNew from './pages/PolicyEditorNew';
import Analytics from './pages/Analytics';
import UsageLogs from './pages/UsageLogs';
import Grounding from './pages/Grounding';
import UrlLibrary from './pages/UrlLibrary';
import PolicyTester from './pages/PolicyTester';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publisherId, setPublisherId] = useState(null);

  useEffect(() => {
    // Check if user is already logged in (simple localStorage check for MVP)
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedPublisherId = localStorage.getItem('publisherId');
    if (storedAuth === 'true' && storedPublisherId) {
      setIsAuthenticated(true);
      setPublisherId(parseInt(storedPublisherId));
    }
  }, []);

  const handleLogin = (pubId) => {
    setIsAuthenticated(true);
    setPublisherId(pubId);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('publisherId', pubId.toString());
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPublisherId(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('publisherId');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Layout publisherId={publisherId} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard publisherId={publisherId} />} />
          <Route path="/policy" element={<PolicyEditorNew publisherId={publisherId} />} />
          <Route path="/policy-legacy" element={<PolicyEditor publisherId={publisherId} />} />
          <Route path="/analytics" element={<Analytics publisherId={publisherId} />} />
          <Route path="/logs" element={<UsageLogs publisherId={publisherId} />} />
          <Route path="/grounding" element={<Grounding />} />
          <Route path="/urls" element={<UrlLibrary />} />
          <Route path="/test" element={<PolicyTester />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
