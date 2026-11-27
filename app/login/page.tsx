'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSafePostLoginRedirect } from '@/lib/auth/redirects'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()
    setLoading(false)

    if (!response.ok) {
      setMessage(data.message || 'Something went wrong.')
      return
    }

    const redirectTo = new URLSearchParams(window.location.search).get('redirect')
    router.push(getSafePostLoginRedirect(redirectTo))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sign in to Masidy</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Welcome back! Please sign in to continue.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="w-full rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Password *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            {message && (
              <div className="rounded-lg border-2 border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm font-medium text-red-800 dark:text-red-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent py-3 px-4 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 space-y-3 border-t-2 border-gray-200 dark:border-gray-700 pt-6 text-center text-sm">
            <p className="text-gray-600 dark:text-gray-300">
              Don't have an account?{' '}
              <Link href="/signup" className="font-semibold text-accent hover:underline underline-offset-4">
                Sign up
              </Link>
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              <Link href="/forgot-password" className="font-semibold text-accent hover:underline underline-offset-4">
                Forgot password?
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          <Link href="/" className="hover:text-accent">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
