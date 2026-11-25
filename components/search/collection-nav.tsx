import Link from 'next/link'
import type { Collection } from '@/lib/products/types'
import { cn } from '@/lib/utils'

export function CollectionNav({
  collections,
  active,
}: {
  collections: Collection[]
  active: string
}) {
  return (
    <nav aria-label="Collections">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Collections
      </h2>
      <ul className="flex flex-row gap-x-4 gap-y-1 overflow-x-auto md:flex-col">
        {collections.map((c) => {
          const href = c.handle === 'all' ? '/search' : `/search/${c.handle}`
          const isActive = active === c.handle
          return (
            <li key={c.handle}>
              <Link
                href={href}
                className={cn(
                  'block whitespace-nowrap py-1 text-sm transition-colors',
                  isActive
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {c.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
