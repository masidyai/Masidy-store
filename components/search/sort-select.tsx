'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

const OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'latest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
]

export function SortSelect({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value === 'featured') {
      params.delete('sort')
    } else {
      params.set('sort', e.target.value)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="relative inline-flex items-center">
      <label htmlFor="sort" className="sr-only">
        Sort products
      </label>
      <select
        id="sort"
        value={current}
        onChange={onChange}
        className="appearance-none rounded-md border border-border bg-background py-2 pl-3 pr-9 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" />
    </div>
  )
}
