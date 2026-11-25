'use client'

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import type { CartItem, Product, ProductVariant } from '@/lib/products/types'

interface CartState {
  items: CartItem[]
}

type CartAction =
  | { type: 'ADD'; item: CartItem }
  | { type: 'REMOVE'; variantId: string }
  | { type: 'UPDATE_QTY'; variantId: string; quantity: number }
  | { type: 'CLEAR' }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find((i) => i.variantId === action.item.variantId)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantId === action.item.variantId
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i,
          ),
        }
      }
      return { items: [...state.items, action.item] }
    }
    case 'REMOVE':
      return { items: state.items.filter((i) => i.variantId !== action.variantId) }
    case 'UPDATE_QTY':
      return {
        items: state.items
          .map((i) =>
            i.variantId === action.variantId ? { ...i, quantity: Math.max(0, action.quantity) } : i,
          )
          .filter((i) => i.quantity > 0),
      }
    case 'CLEAR':
      return { items: [] }
    default:
      return state
  }
}

interface CartContextValue {
  items: CartItem[]
  totalQuantity: number
  subtotal: number
  currency: string
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] }, (initial) => {
    // Load cart from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('masidy-cart')
        return saved ? JSON.parse(saved) : initial
      } catch {
        return initial
      }
    }
    return initial
  })
  const [isOpen, setIsOpen] = useState(false)

  // Save cart to localStorage whenever it changes
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('masidy-cart', JSON.stringify(state))
    } catch {
      // Ignore localStorage errors
    }
  }

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const addItem = useCallback(
    (product: Product, variant: ProductVariant, quantity = 1) => {
      dispatch({
        type: 'ADD',
        item: {
          variantId: variant.id,
          productId: product.id,
          productHandle: product.handle,
          title: product.title,
          variantTitle: variant.title,
          size: variant.size,
          color: variant.color,
          price: variant.price,
          currency: variant.currency,
          image: variant.image,
          quantity,
        },
      })
      setIsOpen(true)
    },
    [],
  )

  const removeItem = useCallback((variantId: string) => {
    dispatch({ type: 'REMOVE', variantId })
  }, [])

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QTY', variantId, quantity })
  }, [])

  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const value = useMemo<CartContextValue>(() => {
    const totalQuantity = state.items.reduce((sum, i) => sum + i.quantity, 0)
    const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    return {
      items: state.items,
      totalQuantity,
      subtotal,
      currency: state.items[0]?.currency ?? 'USD',
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      clear,
    }
  }, [state.items, isOpen, openCart, closeCart, addItem, removeItem, updateQuantity, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
