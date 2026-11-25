import Link from 'next/link'
import Image from 'next/image'

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/search' },
      { label: 'Apparel', href: '/search/apparel' },
      { label: 'Accessories', href: '/search/accessories' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Sustainability', href: '/sustainability' },
      { label: 'Journal', href: '/journal' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Shipping', href: '/shipping' },
      { label: 'Returns', href: '/returns' },
      { label: 'Size Guide', href: '/size-guide' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="inline-block">
              <Image
                src="/masidy-wordmark-dark.png"
                alt="Masidy"
                width={450}
                height={120}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-primary-foreground/70">
              Premium apparel and lifestyle goods in warm, considered tones. Quality crafted for
              everyday wear.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary-foreground/80 transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-primary-foreground/20 pt-6 text-xs text-primary-foreground/60 md:flex-row">
          <p>© {new Date().getFullYear()} Masidy. All rights reserved.</p>
          <p>Premium goods for everyday life.</p>
        </div>
      </div>
    </footer>
  )
}
