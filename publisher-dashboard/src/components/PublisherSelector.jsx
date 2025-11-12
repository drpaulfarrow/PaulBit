import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function PublisherSelector({ user, publishers, onSelect, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {user.avatar && (
              <img 
                src={user.avatar} 
                alt={user.name}
                className="w-12 h-12 rounded-full border-2 border-gray-600"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">{user.name}</h2>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-gray-400 hover:text-white transition-colors"
            title="Sign Out"
          >
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-white font-medium mb-4">
            Select Publisher Account
          </h3>

          <div className="space-y-3">
            {publishers && publishers.length > 0 ? (
              publishers.map(publisher => (
                <button
                  key={publisher.id}
                  onClick={() => onSelect(publisher.id)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-lg transition-colors text-left border border-gray-600 hover:border-gray-500"
                >
                  <div className="font-medium">{publisher.name}</div>
                  <div className="text-sm text-gray-400 flex items-center justify-between">
                    <span>{publisher.hostname}</span>
                    <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                      {publisher.role || 'admin'}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-gray-400 text-center py-8 bg-gray-900 rounded-lg border border-gray-700">
                <p className="mb-2">No publishers assigned to your account.</p>
                <p className="text-sm">Contact your administrator to get access.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Having trouble? Contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

