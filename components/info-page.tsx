import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type InfoSection = {
  title: string
  body: string
  points?: string[]
}

type InfoPageProps = {
  title: string
  intro: string
  sections: InfoSection[]
  cta?: {
    href: string
    label: string
  }
}

export function InfoPage({ title, intro, sections, cta }: InfoPageProps) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:py-14">
      <nav>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowRight className="size-4 rotate-180" />
          Back to home
        </Link>
      </nav>

      <header className="rounded-3xl border border-border bg-secondary/40 p-8 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          Masidy
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
          {intro}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {sections.map((section, index) => (
          <article key={section.title} className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              0{index + 1}
            </p>
            <h2 className="mt-3 font-serif text-xl font-semibold text-foreground">
              {section.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
            {section.points ? (
              <ul className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 size-1.5 rounded-full bg-accent" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>

      {cta ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-primary px-6 py-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-foreground/70">
              Ready to explore?
            </p>
            <p className="mt-1 text-sm text-primary-foreground/80">
              Browse the full catalog and find the piece that fits your daily rhythm.
            </p>
          </div>
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            {cta.label}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : null}
    </main>
  )
}
