'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchUserAttributes, signInWithRedirect, signOut as amplifySignOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import outputs from '../../amplify_outputs.json';

export interface AuthUserProfile {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  isDevUser?: boolean;
}

interface AuthContextType {
  user: AuthUserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  devSignIn: (email: string, name?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isConfigured: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  devSignIn: () => {},
});

const isCognitoConfigured = Boolean(
  outputs &&
  outputs.auth &&
  outputs.auth.user_pool_id &&
  outputs.auth.user_pool_id.length > 0
);

function getAmplifyClientConfig() {
  if (!isCognitoConfigured) return outputs;
  if (typeof window === 'undefined' || !outputs?.auth?.oauth) return outputs;

  try {
    const currentOrigin = window.location.origin.replace(/\/$/, '') + '/';
    const signIns = outputs.auth.oauth.redirect_sign_in_uri || [];
    const signOuts = outputs.auth.oauth.redirect_sign_out_uri || [];

    return {
      ...outputs,
      auth: {
        ...outputs.auth,
        oauth: {
          ...outputs.auth.oauth,
          redirect_sign_in_uri: Array.from(new Set([currentOrigin, ...signIns])),
          redirect_sign_out_uri: Array.from(new Set([currentOrigin, ...signOuts])),
        },
      },
    };
  } catch {
    return outputs;
  }
}

if (isCognitoConfigured) {
  try {
    Amplify.configure(getAmplifyClientConfig(), { ssr: true });
  } catch (err) {
    console.warn('Amplify configuration error:', err);
  }
}

const DEV_STORAGE_KEY = 'shareable_dev_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkLiveAmplifyUser = useCallback(async (): Promise<boolean> => {
    if (!isCognitoConfigured) return false;

    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setUser({
        userId: currentUser.userId,
        email: attributes.email?.toLowerCase().trim() || '',
        name: attributes.name || attributes.email?.split('@')[0] || 'User',
        picture: attributes.picture,
        isDevUser: false,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const checkUser = useCallback(async () => {
    setLoading(true);

    if (isCognitoConfigured) {
      const found = await checkLiveAmplifyUser();
      if (found) {
        setLoading(false);
        return;
      }
    }

    // Check dev user in localStorage (useful for local development & testing specific user sharing)
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(DEV_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          document.cookie = `dev_user_email=${encodeURIComponent(parsed.email)}; path=/; max-age=604800`;
          setLoading(false);
          return;
        }
      } catch {
        // Ignore localStorage error
      }
    }

    setUser(null);
    setLoading(false);
  }, [checkLiveAmplifyUser]);

  useEffect(() => {
    checkUser();

    if (isCognitoConfigured) {
      const unsubscribe = Hub.listen('auth', ({ payload }) => {
        switch (payload.event) {
          case 'signedIn':
          case 'tokenRefresh':
            checkLiveAmplifyUser();
            break;
          case 'signedOut':
            setUser(null);
            break;
        }
      });

      return () => unsubscribe();
    }
  }, [checkUser, checkLiveAmplifyUser]);

  const handleSignInWithGoogle = async () => {
    if (isCognitoConfigured) {
      try {
        if (typeof window !== 'undefined') {
          Amplify.configure(getAmplifyClientConfig(), { ssr: true });
        }
        await signInWithRedirect({ provider: 'Google' });
      } catch (err) {
        console.error('Failed to start Google sign in with Amplify:', err);
        throw err;
      }
    } else {
      // Prompt user with helpful instructions if Cognito is not connected yet
      const sampleEmail = window.prompt(
        'AWS Cognito is not yet connected in amplify_outputs.json.\n\nTo test Google user sharing right now in development, enter an email to simulate signing in (e.g. alice@gmail.com):',
        'alice@gmail.com'
      );
      if (sampleEmail && sampleEmail.trim()) {
        devSignIn(sampleEmail.trim());
      }
    }
  };

  const devSignIn = (email: string, name?: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const devUser: AuthUserProfile = {
      userId: `dev-${cleanEmail}`,
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      isDevUser: true,
    };
    setUser(devUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(devUser));
      document.cookie = `dev_user_email=${encodeURIComponent(cleanEmail)}; path=/; max-age=604800`;
    }
  };

  const handleSignOut = async () => {
    if (isCognitoConfigured) {
      try {
        await amplifySignOut();
      } catch (err) {
        console.error('Amplify sign out error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEV_STORAGE_KEY);
      document.cookie = 'dev_user_email=; path=/; max-age=0';
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isCognitoConfigured,
        signInWithGoogle: handleSignInWithGoogle,
        signOut: handleSignOut,
        devSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
