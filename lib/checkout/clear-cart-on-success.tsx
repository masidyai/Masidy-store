'use client'

import { useEffect } from 'react'
import { useCart } from '@/lib/cart-context'

export function ClearCartOnSuccess({ enabled }: { enabled: boolean }) {
  const { clear } = useCart()

  useEffect(() => {
    if (enabled) clear()
  }, [clear, enabled])

  return null
}
