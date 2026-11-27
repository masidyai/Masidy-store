'use client'

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface MarketplaceCartItem {
  listingId: string
  title: string
  imageUrl: string
  category: string
  priceMinor: number
  currency: string
  quantity: number
}

interface MarketplaceCartValue {
  items: MarketplaceCartItem[]
  itemCount: number
  subtotalMinor: number
  currency: string
  currencyMismatch: boolean
  addItem: (item: Omit<MarketplaceCartItem, 'quantity'>) => boolean
  setQuantity: (listingId: string, quantity: number) => void
  removeItem: (listingId: string) => void
  clear: () => void
}

const STORAGE_KEY = 'masidy-marketplace-cart'
const MarketplaceCartContext = createContext<MarketplaceCartValue | null>(null)

export function MarketplaceCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MarketplaceCartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const clear = useCallback(() => setItems([]), [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (Array.isArray(parsed)) setItems(parsed.filter(isMarketplaceCartItem))
      }
    } catch (error) {
      console.error('[Marketplace] Could not restore marketplace cart:', error)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('[Marketplace] Could not save marketplace cart:', error)
    }
  }, [items, hydrated])

  const currency = items[0]?.currency ?? 'EUR'
  const currencyMismatch = items.some((item) => item.currency !== currency)
  const value = useMemo<MarketplaceCartValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalMinor: items.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0),
    currency,
    currencyMismatch,
    addItem: (item) => {
      if (items.some((existing) => existing.currency !== item.currency)) return false
      setItems((current) => {
        const existing = current.find((entry) => entry.listingId === item.listingId)
        if (existing) {
          return current.map((entry) => entry.listingId === item.listingId
            ? { ...entry, quantity: Math.min(20, entry.quantity + 1) }
            : entry)
        }
        return [...current, { ...item, quantity: 1 }]
      })
      return true
    },
    setQuantity: (listingId, quantity) => {
      if (!Number.isInteger(quantity) || quantity < 1) {
        setItems((current) => current.filter((item) => item.listingId !== listingId))
        return
      }
      setItems((current) => current.map((item) => item.listingId === listingId
        ? { ...item, quantity: Math.min(20, quantity) }
        : item))
    },
    removeItem: (listingId) => setItems((current) => current.filter((item) => item.listingId !== listingId)),
    clear,
  }), [items, currency, currencyMismatch, clear])

  return <MarketplaceCartContext.Provider value={value}>{children}</MarketplaceCartContext.Provider>
}

export function useMarketplaceCart() {
  const context = useContext(MarketplaceCartContext)
  if (!context) throw new Error('useMarketplaceCart must be used within a MarketplaceCartProvider')
  return context
}

function isMarketplaceCartItem(value: unknown): value is MarketplaceCartItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return typeof item.listingId === 'string' &&
    typeof item.title === 'string' &&
    typeof item.imageUrl === 'string' &&
    typeof item.category === 'string' &&
    typeof item.priceMinor === 'number' && Number.isSafeInteger(item.priceMinor) &&
    typeof item.currency === 'string' &&
    typeof item.quantity === 'number' && Number.isInteger(item.quantity) &&
    item.quantity >= 1 && item.quantity <= 20
}
