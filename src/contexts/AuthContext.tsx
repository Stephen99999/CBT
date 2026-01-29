import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { getCurrentUser, setCurrentUser, createUser, loginUser as storageLogin, logoutUser as storageLogout } from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (email: string, password: string, name: string) => { success: boolean; error?: string };
  logout: () => void;
  updateCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = getCurrentUser();
    setUser(storedUser);
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string): { success: boolean; error?: string } => {
    const loggedInUser = storageLogin(email, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      return { success: true };
    }
    return { success: false, error: 'Invalid email or password' };
  };

  const register = (email: string, password: string, name: string): { success: boolean; error?: string } => {
    const newUser = createUser(email, password, name);
    if (newUser) {
      setCurrentUser(newUser);
      setUser(newUser);
      return { success: true };
    }
    return { success: false, error: 'User with this email already exists' };
  };

  const logout = () => {
    storageLogout();
    setUser(null);
  };

  const updateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setUser(updatedUser);
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
