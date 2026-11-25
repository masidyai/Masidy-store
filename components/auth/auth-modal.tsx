'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onAuthenticated?: () => void
}

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setEmail('')
      setName('')
      setPassword('')
      setMessage('')
    }
  }, [open])

  async function submit() {
    setLoading(true)
    setMessage('')

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
    const payload = mode === 'login' ? { email, password } : { email, password, name }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    setLoading(false)

    if (!response.ok) {
      setMessage(data.message || 'Something went wrong.')
      return
    }

    onAuthenticated?.()
    onClose()
  }

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div 
          className="w-full max-w-md rounded-lg border-2 border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b-2 border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {mode === 'login' ? 'Welcome back! Please sign in to continue.' : 'Join Masidy to start shopping.'}
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white p-6 dark:bg-gray-900">
          <div className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                  Full Name *
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                Email Address *
              </label>
              <input
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
                type="email"
                autoComplete="email"
                className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                Password *
              </label>
              <input
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
              {mode === 'signup' && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Must be at least 6 characters</p>
              )}
            </div>

            {message && (
              <div className="rounded-lg border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-500 dark:bg-red-900/20 dark:text-red-400">
                {message}
              </div>
            )}

            <Button className="w-full bg-accent py-3 text-base font-semibold text-accent-foreground hover:bg-accent/90" onClick={submit} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </div>

          <div className="mt-6 space-y-3 border-t-2 border-gray-200 pt-6 text-center text-sm dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-300">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                className="font-semibold text-accent underline-offset-4 hover:underline"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>

            {mode === 'login' && (
              <p className="text-gray-600 dark:text-gray-300">
                <button
                  type="button"
                  className="font-semibold text-accent underline-offset-4 hover:underline"
                  onClick={() => {
                    onClose()
                    window.location.href = '/forgot-password'
                  }}
                >
                  Forgot password?
                </button>
              </p>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
