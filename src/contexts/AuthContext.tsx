import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { BASE_URL } from '@/lib/api';

// Define the shape of the context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (matric_no: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (matric_no: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // isLoading starts true so we can check for an existing token before rendering the app
  const [isLoading, setIsLoading] = useState(true);

 // 1. On Mount: Check if user is already logged in (VERIFY with Backend)
 useEffect(() => {
  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // HIT THE /me ENDPOINT
      const response = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: { 
          // Send the token we found in storage
          'x-auth-token': token,
          'Content-Type': 'application/json' 
        },
      });

      if (response.ok) {
        const userData = await response.json();
        // Token is valid! Update state with fresh data from DB
        setUser(userData);
        // Optional: Update localStorage backup
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // Token is invalid/expired (Backend rejected it)
        console.warn("Token expired or invalid");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // If server is down, maybe keep the user logged in "optimistically" 
      // OR force logout. Usually better to keep them out if we can't verify.
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  checkAuth();
}, []);

  // 2. Login Function (Hits Backend)
  const login = async (matric_no: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matric_no: matric_no, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.msg || 'Login failed' };
      }

      // Success: Save Token & User
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || { name: 'Student', role: 'student' }));
      
      // Update State
      setUser(data.user || { name: 'Student', role: 'student', matric_no: matric_no }); // Ensure your backend returns the user object!
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Server connection failed' };
    }
  };

  // 3. Register Function (Hits Backend)
  const register = async (matric_no: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matric_no: matric_no, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.msg || 'Registration failed' };
      }

      // Success: Save Token & User
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name, email: matric_no, role: 'student' }));
      
      setUser({ name, matric_no: matric_no, role: 'student' } as User);
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Server connection failed' };
    }
  };

  // 4. Logout Function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // Optional: Redirect to login page is usually handled by the component consuming this
  };

  const updateCurrentUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};