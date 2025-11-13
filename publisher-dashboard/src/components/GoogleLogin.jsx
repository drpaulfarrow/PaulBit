import { GoogleLogin as GoogleOAuthButton } from '@react-oauth/google';

export default function GoogleLogin({ onLogin }) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            MAI Monetize
          </h1>
          <p className="text-gray-400 mb-1">
            Content Licensing Gateway
          </p>
          <p className="text-sm text-gray-500">
            Sign in to access your publisher dashboard
          </p>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center'}}>
          <div style={{width: '400px', maxWidth: '100%'}}>
            <GoogleOAuthButton
              onSuccess={onLogin}
              onError={() => {
                console.error('Google Login Failed');
                alert('Google authentication failed. Please try again.');
              }}
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
              width="400"
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">
                Secure authentication via Google
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>By signing in, you agree to our Terms of Service</p>
          </div>
        </div>
      </div>
    </div>
  );
}

