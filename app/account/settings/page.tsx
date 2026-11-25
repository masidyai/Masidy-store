'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name?: string
}

export default function AccountSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    async function loadUser() {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/')
        return
      }
      const data = await response.json()
      setUser(data.user)
      setName(data.user.name || '')
      setLoading(false)
    }

    loadUser()
  }, [router])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/account/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to update profile')
        return
      }

      setMessage('Profile updated successfully!')
      setUser({ ...user!, name })
      
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      setSaving(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to change password')
        return
      }

      setMessage('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError('Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/account"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          Back to Account
        </Link>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your profile and security settings</p>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-4 text-green-700">
          <Check className="size-5" />
          <p>{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Profile Information Section */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-xl font-semibold">Profile Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="w-full rounded-md border border-border bg-muted px-4 py-2 text-sm text-muted-foreground"
              />
              <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-xl font-semibold">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="mb-2 block text-sm font-medium">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-2 block text-sm font-medium">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
                minLength={6}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Account Info */}
        <div className="rounded-lg border border-border bg-secondary/20 p-6">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Account Information</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium">User ID:</span> {user.id}
            </p>
            <p>
              <span className="font-medium">Account Type:</span> Customer
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
