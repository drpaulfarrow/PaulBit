import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  BookOpenIcon, 
  ShieldCheckIcon, 
  MagnifyingGlassIcon, 
  ChartBarIcon, 
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  DocumentDuplicateIcon,
  KeyIcon,
  LinkIcon,
  HomeIcon,
  SparklesIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import maiLogo from '../mai-logo.png';

import { LICENSING_API as API_URL } from '../utils/apiConfig';

export default function Layout({ children, publisherId, onLogout }) {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path) => location.pathname === path;

  // Load unread notifications count
  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const response = await fetch(
          `${API_URL}/api/notifications/unread-count?publisher_id=${publisherId}`
        );
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unread_count || 0);
        }
      } catch (error) {
        console.error('Failed to load unread count:', error);
      }
    }

    if (publisherId) {
      loadUnreadCount();
      // Poll every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [publisherId]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src={maiLogo} alt="MAI Logo" className="h-8" />
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
                Monetize
              </h1>
            </Link>
            <span className="text-sm text-gray-500">Publisher #{publisherId}</span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4 space-y-2">
            {/* Dashboard Link */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/dashboard')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <HomeIcon className="w-5 h-5" />
              Dashboard
            </Link>
            
            {/* Main Section */}
            <div className="pt-4 pb-1 px-2">
              <div className="text-xs font-semibold text-gray-400 uppercase">Content & Licensing</div>
            </div>
            
            <Link
              to="/urls"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/urls')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpenIcon className="w-5 h-5" />
              URL Library
            </Link>
            <Link
              to="/licenses"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/licenses')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <KeyIcon className="w-5 h-5" />
              License Manager
            </Link>
            <Link
              to="/access"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/access')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LinkIcon className="w-5 h-5" />
              Access Config
            </Link>

            {/* AI Negotiation Section */}
            <div className="pt-4 pb-1 px-2">
              <div className="text-xs font-semibold text-gray-400 uppercase">AI Negotiation</div>
            </div>
            
            <Link
              to="/notifications"
              className={`flex items-center justify-between px-4 py-2 rounded-md ${
                isActive('/notifications')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <BellIcon className="w-5 h-5" />
                Notifications
              </div>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              to="/negotiations"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/negotiations')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <SparklesIcon className="w-5 h-5" />
              Active Negotiations
            </Link>
            <Link
              to="/negotiations/strategy"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/negotiations/strategy')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ShieldCheckIcon className="w-5 h-5" />
              Strategy Configs
            </Link>

            {/* Tools Section */}
            <div className="pt-4 pb-1 px-2">
              <div className="text-xs font-semibold text-gray-400 uppercase">Tools</div>
            </div>
            
            <Link
              to="/grounding"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/grounding')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              Scraper
            </Link>
            <Link
              to="/logs"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/logs')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5" />
              Usage Logs
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
