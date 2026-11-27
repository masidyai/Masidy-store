'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MARKETPLACE_POLICIES, type MarketplaceRole } from '@/lib/marketplace/policies'

interface Application {
  role: MarketplaceRole
  status: 'pending' | 'approved' | 'rejected'
  reviewNote: string | null
}

const roleLinks: Record<MarketplaceRole, string> = {
  reseller: '/account/reseller',
  seller: '/account/seller',
}

export function MarketplacePrograms() {
  const [applications, setApplications] = useState<Application[]>([])
  const [accepted, setAccepted] = useState<Record<MarketplaceRole, boolean>>({
    reseller: false,
    seller: false,
  })
  const [loading, setLoading] = useState(true)
  const [busyRole, setBusyRole] = useState<MarketplaceRole | null>(null)
  const [error, setError] = useState('')

  async function loadApplications() {
    const response = await fetch('/api/account/marketplace')
    const data: unknown = await response.json()
    if (!response.ok || !isRecord(data) || !Array.isArray(data.applications)) {
      throw new Error(getMessage(data, 'Could not load marketplace programs.'))
    }
    setApplications(data.applications as Application[])
  }

  useEffect(() => {
    let active = true
    void loadApplications()
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load marketplace programs.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function apply(role: MarketplaceRole) {
    setBusyRole(role)
    setError('')
    try {
      const policy = MARKETPLACE_POLICIES[role]
      const response = await fetch('/api/account/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          accepted: accepted[role],
          policyVersion: policy.version,
        }),
      })
      const data: unknown = await response.json()
      if (!response.ok) throw new Error(getMessage(data, 'Could not submit your application.'))
      await loadApplications()
      setAccepted((current) => ({ ...current, [role]: false }))
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Could not submit your application.')
    } finally {
      setBusyRole(null)
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">Marketplace programs</h2>
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading program access...</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {(['reseller', 'seller'] as const).map((role) => {
            const policy = MARKETPLACE_POLICIES[role]
            const application = applications.find((item) => item.role === role)
            const active = application?.status === 'approved'
            return (
              <article key={role} className="rounded-lg border border-border bg-background p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{role === 'reseller' ? 'Reseller dashboard' : 'Seller dashboard'}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {role === 'reseller'
                        ? 'Share Masidy product links and see referral visits.'
                        : 'Prepare product listings and set country-based shipping zones.'}
                    </p>
                  </div>
                  {application && <StatusBadge status={application.status} />}
                </div>

                <h4 className="mt-5 text-sm font-semibold">{policy.title}</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {policy.rules.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>

                {active ? (
                  <Link
                    href={roleLinks[role]}
                    className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
                  >
                    Open {role} dashboard
                  </Link>
                ) : application?.status === 'pending' ? (
                  <p className="mt-5 text-sm text-muted-foreground">Your application is waiting for Masidy review.</p>
                ) : (
                  <div className="mt-5">
                    {application?.reviewNote && (
                      <p className="mb-3 rounded-md bg-secondary/50 p-3 text-sm">
                        Review note: {application.reviewNote}
                      </p>
                    )}
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={accepted[role]}
                        onChange={(event) => setAccepted((current) => ({
                          ...current,
                          [role]: event.target.checked,
                        }))}
                        className="mt-1 size-4 accent-accent"
                      />
                      <span>I have read and agree to these program rules.</span>
                    </label>
                    <button
                      type="button"
                      disabled={!accepted[role] || busyRole !== null}
                      onClick={() => void apply(role)}
                      className="mt-4 min-h-11 rounded-md border border-border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyRole === role ? 'Submitting...' : 'Apply for access'}
                    </button>
                  </div>
                )}
                <Link
                  href={`/marketplace/demo/${role}`}
                  className="mt-4 inline-flex min-h-11 items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary/40"
                >
                  Preview {role} dashboard
                </Link>
              </article>
            )
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Live dashboard access requires an approved application. Previews use sample data only and never create listings, referrals, orders, or payments.
      </p>
    </section>
  )
}

function StatusBadge({ status }: { status: Application['status'] }) {
  const label = status === 'approved' ? 'Active' : status === 'pending' ? 'Under review' : 'Needs changes'
  return <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{label}</span>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.message === 'string' ? value.message : fallback
}
