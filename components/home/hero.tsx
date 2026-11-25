import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 sm:pb-10 md:px-6 md:pb-16">
      <div className="relative left-1/2 mb-8 h-[clamp(16rem,55vh,36rem)] w-screen -translate-x-1/2 overflow-hidden bg-black sm:mb-10">
        <video
          className="block h-full w-full object-fill"
          src="/black-friday-sale.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          controls
          aria-label="Animated Black Friday sale promotion. Use the shopping links below to browse Masidy products."
        />
      </div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:mb-5">
        Premium Quality · Everyday Essentials
      </p>
      <h1 className="max-w-4xl text-balance font-serif text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl md:text-6xl lg:text-7xl">
        Quality apparel and goods for everyday life.
      </h1>
      <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-base md:text-lg">
        Masidy is a premium lifestyle brand offering heavyweight apparel and everyday accessories
        in warm, quiet tones designed to last.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href="/search"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 sm:w-auto"
        >
          Shop the collection
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/search/apparel"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto"
        >
          Browse apparel
        </Link>
      </div>
    </section>
  )
}
