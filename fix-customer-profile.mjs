import fs from 'fs';
import { Client } from 'basic-ftp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- 1) Fix ProfilePage auth gate + literal \u escapes in JSX ----------
const profilePath = 'go7 figma/components/ProfilePage.tsx';
let profile = fs.readFileSync(profilePath, 'utf8');

profile = profile.replace(
  'const { currentUser, userProfile, logout } = useAuth();',
  'const { currentUser, userProfile, logout, loading: authLoading } = useAuth();'
);

const oldGate = `  // Don't render anything if not logged in (will redirect)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <User className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }`;

const newGate = `  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <User className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Guests / signed-out: show sign-in CTA (never stuck "Redirecting...")
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to view your profile</h2>
          <p className="text-sm text-gray-600 mb-6">Orders, wallet, and saved addresses need an account.</p>
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem('go7_guest_mode'); } catch (_) {}
              if (onBack) onBack();
            }}
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 rounded-xl font-medium"
          >
            Sign in / Register
          </button>
        </div>
      </div>
    );
  }`;

if (profile.includes('Redirecting...')) {
  profile = profile.replace(oldGate, newGate);
  if (!profile.includes('Sign in to view your profile')) {
    // looser fallback
    profile = profile.replace(
      /\/\/ Don't render anything if not logged in[\s\S]*?Redirecting\.\.\.[\s\S]*?<\/div>\s*<\/div>\s*\);\s*\}/,
      newGate
    );
  }
  console.log('PROFILE_GATE_OK');
} else if (profile.includes('Sign in to view your profile')) {
  console.log('PROFILE_GATE_ALREADY');
} else {
  console.log('PROFILE_GATE_SKIP');
}

// Fix literal \uXXXX sequences in JSX text (they render as garbage strings)
profile = profile.replace(/>\\u([0-9a-fA-F]{4})\\u([0-9a-fA-F]{4})</g, (_, a, b) => {
  return `>{'\\u${a}\\u${b}'}<`;
});
profile = profile.replace(/>\\u([0-9a-fA-F]{4})</g, (_, a) => {
  return `>{'\\u${a}'}<`;
});
// Common warning emoji left as literal backslash-u
profile = profile.replace(
  '<span className="text-xl">\\u26a0\\ufe0f</span>',
  "<span className=\"text-xl\">{'\\u26a0\\ufe0f'}</span>"
);

fs.writeFileSync(profilePath, profile, 'utf8');
console.log('PROFILE_SAVED');

// ---------- 2) FigmaApp: open onboarding/auth when profile tapped without login ----------
const appPath = 'go7 figma/FigmaApp.tsx';
let app = fs.readFileSync(appPath, 'utf8');
// Ensure FigmaAppContent can read auth for tab guard
if (!app.includes('const { cartItems, cartCount, cartTotal, loading, error, addToCart')) {
  // already expanded earlier
}
if (!app.includes('authLoading') && app.includes('dismissVendorConflict')) {
  app = app.replace(
    'dismissVendorConflict,\n  } = useCart();',
    'dismissVendorConflict,\n  } = useCart();\n  const { currentUser, loading: authLoading } = useAuth();'
  );
}

// Import useAuth if missing in content - FigmaApp already imports AuthProvider; check useAuth
if (!app.includes("import { AuthProvider") && !app.includes('useAuth')) {
  // find auth import
}
if (app.includes("from './contexts/backend/AuthContext") || app.includes('AuthProvider')) {
  if (!app.includes('useAuth')) {
    app = app.replace(
      /import \{ AuthProvider \} from '([^']+)';/,
      "import { AuthProvider, useAuth } from '$1';"
    );
  }
}

// Profile tab: if not logged in after onboarding, still open profile (sign-in CTA handles it)
// Already opens profile - OK with new gate.

fs.writeFileSync(appPath, app, 'utf8');
console.log('FIGMA_APP_TOUCHED');
