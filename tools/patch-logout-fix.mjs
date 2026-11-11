import fs from 'fs';

const authPath = 'go7 figma/contexts/backend/AuthContext.jsx';
let authSrc = fs.readFileSync(authPath, 'utf8');
const authRe = /  const logout = async \(\) => \{[\s\S]*?\n  \};\n\n  const loginWithGoogle/;
if (!authRe.test(authSrc)) {
  console.error('AuthContext logout block not found');
  process.exit(1);
}
authSrc = authSrc.replace(
  authRe,
  `  const clearClientSessionKeys = () => {
    try {
      localStorage.removeItem('go7_user_session');
      localStorage.removeItem('go7_guest_mode');
      localStorage.removeItem('go7_onboarding_complete');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('cart');
    } catch (_) {}
  };

  const logout = async () => {
    clearClientSessionKeys();
    setUser(null);
    setUserProfile(null);
    setShowPhonePrompt(false);

    try {
      if (!auth) {
        console.warn('Logout: auth unavailable; local session cleared');
        return;
      }
      await Promise.race([
        signOut(auth),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Logout timed out')), 8000)
        ),
      ]);
      setUser(null);
      setUserProfile(null);
      console.log('Logout successful');
      if (auth.currentUser) {
        throw new Error('Still signed in after logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      clearClientSessionKeys();
      setUser(null);
      setUserProfile(null);
      try {
        if (auth?.currentUser) await signOut(auth);
      } catch (_) {}
      if (auth?.currentUser) throw error;
    }
  };

  const loginWithGoogle`
);
fs.writeFileSync(authPath, authSrc);
console.log('Patched', authPath);

const profilePath = 'go7 figma/components/ProfilePage.tsx';
let profileSrc = fs.readFileSync(profilePath, 'utf8');

if (!profileSrc.includes("from '../../src/firebase/config'")) {
  // db already imported from config — add auth to that import if possible
  if (profileSrc.includes("import { db } from '../../src/firebase/config';")) {
    profileSrc = profileSrc.replace(
      "import { db } from '../../src/firebase/config';",
      "import { auth, db } from '../../src/firebase/config';\nimport { signOut } from 'firebase/auth';"
    );
  }
}

const profileRe =
  /onClick=\{async \(\) => \{\s*const confirmed = window\.confirm\('Are you sure you want to log out\?'\);[\s\S]*?else if \(onBack\) onBack\(\);\s*\}\s*\}\s*\}/;

if (!profileRe.test(profileSrc)) {
  console.error('Profile logout onClick not found');
  process.exit(1);
}

profileSrc = profileSrc.replace(
  profileRe,
  `onClick={async () => {
            const confirmed = window.confirm('Are you sure you want to log out?');
            if (!confirmed) return;

            try {
              if (logout) {
                await logout();
              } else if (auth) {
                await signOut(auth);
              }

              try {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                localStorage.removeItem('cart');
                localStorage.removeItem('go7_user_session');
                localStorage.removeItem('go7_guest_mode');
                localStorage.removeItem('go7_onboarding_complete');
              } catch (_) {}

              if (auth?.currentUser) {
                try { await signOut(auth); } catch (_) {}
              }
              if (auth?.currentUser) {
                toast.error('Could not log out. Please try again.');
                return;
              }

              toast.success('Logged out successfully');
              if (onLogoutNavigate) onLogoutNavigate();
              else if (onBack) onBack();
            } catch (error) {
              console.error('Logout error:', error);
              try {
                if (auth?.currentUser) await signOut(auth);
              } catch (_) {}
              try {
                localStorage.removeItem('go7_user_session');
                localStorage.removeItem('go7_guest_mode');
                localStorage.removeItem('go7_onboarding_complete');
              } catch (_) {}

              if (auth?.currentUser) {
                toast.error('Could not log out. Please try again.');
                return;
              }

              toast.success('Logged out successfully');
              if (onLogoutNavigate) onLogoutNavigate();
              else if (onBack) onBack();
            }
          }}`
);

fs.writeFileSync(profilePath, profileSrc);
console.log('Patched', profilePath);
