import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children, publisherId, onLogout }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              🔐 Content Licensing Dashboard
            </h1>
            <span className="text-sm text-gray-500">Publisher #{publisherId}</span>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4 space-y-2">
            <Link
              to="/"
              className={`block px-4 py-2 rounded-md ${
                isActive('/')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              📊 Dashboard
            </Link>
            <Link
              to="/policy"
              className={`block px-4 py-2 rounded-md ${
                isActive('/policy')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              ⚙️ Policy Editor
            </Link>
            <Link
              to="/analytics"
              className={`block px-4 py-2 rounded-md ${
                isActive('/analytics')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              📈 Analytics
            </Link>
            <Link
              to="/logs"
              className={`block px-4 py-2 rounded-md ${
                isActive('/logs')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              📝 Usage Logs
            </Link>
            <Link
              to="/grounding"
              className={`block px-4 py-2 rounded-md ${
                isActive('/grounding')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              🔍 Grounding API
            </Link>
            <Link
              to="/urls"
              className={`block px-4 py-2 rounded-md ${
                isActive('/urls')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              📚 URL Library
            </Link>
            <Link
              to="/test"
              className={`block px-4 py-2 rounded-md ${
                isActive('/test')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              🧪 Policy Tester
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
