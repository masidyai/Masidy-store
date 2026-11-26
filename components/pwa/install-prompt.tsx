'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.log('[SW] Registration failed:', err)
      })
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      if (daysSinceDismiss < 7) {
        return // Don't show again for 7 days
      }
    }

    // For iOS, show prompt after a delay
    if (iOS && !window.matchMedia('(display-mode: standalone)').matches) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds
      return () => clearTimeout(timer)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    setShowPrompt(false)
  }

  if (!showPrompt || isInstalled || pathname.startsWith('/checkout')) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-background shadow-lg md:bottom-6 md:left-6">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary">
          {isIOS ? <Share className="size-5 text-primary-foreground" /> : <Download className="size-5 text-primary-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base">Install Masidy</h3>
          {isIOS ? (
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Tap <Share className="inline size-3.5 sm:size-4" /> then "Add to Home Screen"
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Get quick access right from your home screen
            </p>
          )}
          {!isIOS && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary sm:px-4 sm:py-2 sm:text-sm"
              >
                Later
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4 sm:size-5" />
        </button>
      </div>
    </div>
  )
}
