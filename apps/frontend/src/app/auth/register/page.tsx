'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Assuming register endpoint structure
      await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName, role: 'PATIENT' }),
      });
      router.push('/auth/login');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Register for SmartCare</h1>
      <form onSubmit={handleRegister} className="w-full max-w-md flex flex-col gap-4">
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="p-2 border rounded text-black"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 border rounded text-black"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 border rounded text-black"
          required
        />
        <button type="submit" className="p-2 bg-green-500 text-white rounded hover:bg-green-600">
          Register
        </button>
      </form>
      <p className="mt-4">
        Already have an account? <a href="/auth/login" className="text-blue-500 underline">Login</a>
      </p>
    </div>
  );
}
