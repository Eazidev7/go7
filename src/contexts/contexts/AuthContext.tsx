import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email?: string;
  role: 'rider' | 'vendor' | 'admin' | 'customer';
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: Omit<User, 'isAuthenticated'>) => void;
  logout: () => void;
  updateRole: (role: User['role']) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the useAuth hook and an alias for backward compatibility
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the useAuthContext alias for backward compatibility
export const useAuthContext = useAuth;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('go7_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser({ ...userData, isAuthenticated: true });
        updateHtmlClasses(userData.role, true);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('go7_user');
      }
    }
  }, []);

  // Update HTML classes for CSS targeting
  const updateHtmlClasses = (role?: string, authenticated: boolean = false) => {
    const htmlElement = document.documentElement;
    
    // Remove all auth-related classes
    htmlElement.classList.remove('authenticated', 'role-rider', 'role-vendor', 'role-admin', 'role-customer');
    
    if (authenticated && role) {
      htmlElement.classList.add('authenticated', `role-${role}`);
    }
  };

  const login = (userData: Omit<User, 'isAuthenticated'>) => {
    const newUser = { ...userData, isAuthenticated: true };
    setUser(newUser);
    localStorage.setItem('go7_user', JSON.stringify(newUser));
    updateHtmlClasses(newUser.role, true);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('go7_user');
    updateHtmlClasses();
  };

  const updateRole = (role: User['role']) => {
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem('go7_user', JSON.stringify(updatedUser));
      updateHtmlClasses(role, true);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user?.isAuthenticated,
    login,
    logout,
    updateRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
