import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BellIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  SparklesIcon,
  DocumentTextIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

// Use relative URLs when running in Docker (via nginx proxy), absolute URLs for dev
const getApiBase = (envVar, defaultPort) => {
  if (import.meta.env[envVar]) return import.meta.env[envVar];
  // Check if running on localhost:5173 (dev server) - use absolute URL
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
    return `http://localhost:${defaultPort}`;
  }
  // Otherwise use relative URL (empty string) for Docker/production
  return '';
};

const API_URL = getApiBase('VITE_API_URL', 3000);

const NOTIFICATION_ICONS = {
  negotiation_initiated: SparklesIcon,
  negotiation_round: SparklesIcon,
  negotiation_accepted: CheckCircleIcon,
  negotiation_rejected: XCircleIcon,
  negotiation_timeout: ClockIcon,
  license_created: DocumentTextIcon,
  strategy_match: CheckCircleIcon
};

const NOTIFICATION_COLORS = {
  negotiation_initiated: 'text-blue-600 bg-blue-100',
  negotiation_round: 'text-purple-600 bg-purple-100',
  negotiation_accepted: 'text-green-600 bg-green-100',
  negotiation_rejected: 'text-red-600 bg-red-100',
  negotiation_timeout: 'text-gray-600 bg-gray-100',
  license_created: 'text-indigo-600 bg-indigo-100',
  strategy_match: 'text-teal-600 bg-teal-100'
};

export default function Notifications() {
  const publisherId = 1; // TODO: Get from auth context
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [typeFilter, setTypeFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [filter, typeFilter]);

  async function loadNotifications() {
    try {
      const params = new URLSearchParams({ 
        publisher_id: publisherId,
        limit: 100
      });

      if (filter === 'unread') {
        params.append('is_read', 'false');
      } else if (filter === 'read') {
        params.append('is_read', 'true');
      }

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`${API_URL}/api/notifications?${params}`);
      if (!response.ok) throw new Error('Failed to load notifications');
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadCount() {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/unread-count?publisher_id=${publisherId}`
      );
      if (!response.ok) throw new Error('Failed to load unread count');
      
      const data = await response.json();
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }

  async function markAsRead(notificationId) {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        { method: 'PUT' }
      );
      
      if (!response.ok) throw new Error('Failed to mark as read');
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async function markAllAsRead() {
    if (!confirm('Mark all notifications as read?')) return;

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/mark-all-read`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publisher_id: publisherId })
        }
      );
      
      if (!response.ok) throw new Error('Failed to mark all as read');
      
      await loadNotifications();
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      alert('Failed to mark all as read: ' + error.message);
    }
  }

  async function deleteNotification(notificationId) {
    if (!confirm('Delete this notification?')) return;

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notificationId}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) throw new Error('Failed to delete notification');
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      alert('Failed to delete notification: ' + error.message);
    }
  }

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 1 day
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    // Less than 7 days
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
  }

  function getNotificationLink(notification) {
    if (notification.related_entity_type === 'negotiation') {
      return `/negotiations/${notification.related_entity_id}`;
    }
    if (notification.related_entity_type === 'license') {
      return `/licenses`;
    }
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BellIcon className="w-7 h-7" />
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">
            Stay updated on negotiations, licenses, and system events
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <span className="text-sm font-medium text-gray-700 self-center">Show:</span>
            {['all', 'unread', 'read'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'unread' && unreadCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-white text-blue-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center ml-auto">
            <span className="text-sm font-medium text-gray-700">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="negotiation_initiated">Initiated</option>
              <option value="negotiation_round">Round Updates</option>
              <option value="negotiation_accepted">Accepted</option>
              <option value="negotiation_rejected">Rejected</option>
              <option value="license_created">Licenses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'unread' 
              ? 'You have no unread notifications.'
              : 'You have no notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => {
            const Icon = NOTIFICATION_ICONS[notification.type] || BellIcon;
            const colorClass = NOTIFICATION_COLORS[notification.type] || 'text-gray-600 bg-gray-100';
            const link = getNotificationLink(notification);
            
            const NotificationContent = () => (
              <>
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateTime(notification.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Mark as read"
                        >
                          <CheckCircleIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            );

            return link ? (
              <Link
                key={notification.id}
                to={link}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
                className={`block p-4 rounded-lg border transition-colors ${
                  notification.is_read
                    ? 'bg-white border-gray-200 hover:bg-gray-50'
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <div className="flex gap-4">
                  <NotificationContent />
                </div>
              </Link>
            ) : (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.is_read
                    ? 'bg-white border-gray-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex gap-4">
                  <NotificationContent />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
