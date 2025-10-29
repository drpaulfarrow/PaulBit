import { Link, useLocation } from 'react-router-dom';
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
  HomeIcon
} from '@heroicons/react/24/outline';

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
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
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
            
            <div className="pt-2 pb-1 px-2">
                        {/* Content Licensing Section */}
          <div className="px-3 mt-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Content Licensing
            </div>
          </div>
            </div>
            
            <Link
              to="/content"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/content')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
              Content Library
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
              License Wizard
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

            <div className="pt-2 pb-1 px-2">
              <div className="text-xs font-semibold text-gray-400 uppercase">URL Management</div>
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
              to="/policy"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/policy')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ShieldCheckIcon className="w-5 h-5" />
              Policy Editor
            </Link>
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
              to="/analytics"
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isActive('/analytics')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChartBarIcon className="w-5 h-5" />
              Analytics
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
