'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';

interface User {
  fullName?: string;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Verify token/fetch profile
    fetchAPI('/auth/me')
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem('token');
        router.push('/auth/login');
      });
  }, [router]);

  if (!user) return <div className="flex justify-center p-24">Loading...</div>;

  return (
    <div className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
      <div className="p-6 border rounded shadow-md w-full max-w-2xl">
        <h2 className="text-2xl mb-4">Welcome, {user.fullName || user.email}!</h2>
        <p>Your Role: <span className="font-mono bg-gray-200 px-1 rounded text-black">{user.role}</span></p>
        <p className="mt-4">
          This is a protected dashboard. You can only see this if you are logged in.
        </p>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/auth/login');
            }}
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
