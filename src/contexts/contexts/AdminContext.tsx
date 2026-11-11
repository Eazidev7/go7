import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ComponentType, FormEvent } from 'react';

// Simple admin interface
interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'dispatcher';
}

interface AdminContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Default context
const AdminContext = createContext<AdminContextType>({
  admin: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: () => {},
});

// Mock admin data (in a real app, this would come from Firebase Auth)
const MOCK_ADMINS: Admin[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@go7.com',
    role: 'admin',
  },
  {
    id: '2',
    name: 'Manager',
    email: 'manager@go7.com',
    role: 'manager',
  },
  {
    id: '3',
    name: 'Dispatcher',
    email: 'dispatch@go7.com',
    role: 'dispatcher',
  },
];

// Admin Provider Props
interface AdminProviderProps {
  children: React.ReactNode;
}

// Admin Provider Component
export function AdminProvider({ children }: AdminProviderProps) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      // In a real app, this would verify the token with Firebase Auth
      const storedAdmin = localStorage.getItem('go7_admin');
      if (storedAdmin) {
        try {
          const parsedAdmin = JSON.parse(storedAdmin) as Admin;
          setAdmin(parsedAdmin);
        } catch (error) {
          localStorage.removeItem('go7_admin');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    // Simple mock authentication
    // In a real app, this would use Firebase Auth
    const foundAdmin = MOCK_ADMINS.find(a => a.email === email);
    
    if (foundAdmin && password === 'password') { // Always use 'password' in this mock version
      setAdmin(foundAdmin);
      localStorage.setItem('go7_admin', JSON.stringify(foundAdmin));
      return true;
    }
    
    return false;
  };

  // Logout function
  const logout = () => {
    setAdmin(null);
    localStorage.removeItem('go7_admin');
  };

  return (
    <AdminContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

// Custom hook to use the admin context
export function useAdmin() {
  return useContext(AdminContext);
}

// HOC to protect routes
export function withAdminAuth(Component: React.ComponentType) {
  return function ProtectedRoute(props: any) {
    const { isAuthenticated, isLoading } = useAdmin();
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return <LoginPage />;
    }
    
    return <Component {...props} />;
  };
}

// Simple Login Page
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAdmin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600 mb-2">GO7 Admin</h1>
          <p className="text-gray-600">Sign in to access the admin dashboard</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="admin@go7.com"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-300 disabled:opacity-70"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-4">
            <p>For demo purposes, use:</p>
            <p>Email: admin@go7.com</p>
            <p>Password: password</p>
          </div>
        </form>
      </div>
    </div>
  );
}
