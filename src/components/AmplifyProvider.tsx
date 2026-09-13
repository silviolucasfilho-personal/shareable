'use client';

import React from 'react';
import { AuthProvider } from '@/lib/auth-context';

export default function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
