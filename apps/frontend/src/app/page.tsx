import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-black text-black dark:text-white p-6">
      <main className="flex w-full max-w-4xl flex-col items-center text-center gap-8">
        <h1 className="text-5xl font-bold tracking-tight">
          Welcome to <span className="text-blue-600">SmartCare</span>
        </h1>
        <p className="max-w-xl text-lg text-gray-600 dark:text-gray-400">
          A distributed healthcare platform for modern clinic management.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-gray-50 transition shadow-md dark:bg-black dark:border-white dark:text-white dark:hover:bg-gray-900"
          >
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
