import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Fraunces } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/lib/cart-context'
import { MarketplaceCartProvider } from '@/components/marketplace/cart-provider'
import { Navbar } from '@/components/navbar'
import { CartDrawer } from '@/components/cart/cart-drawer'
import { Footer } from '@/components/footer'
import { PWAInstallPrompt } from '@/components/pwa/install-prompt'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: {
    default: 'Masidy — Premium apparel and lifestyle goods',
    template: '%s · Masidy',
  },
  description:
    'Masidy is a premium lifestyle brand offering heavyweight apparel and accessories in warm, considered tones. Quality crafted for everyday wear.',
  generator: 'v0.app',
  applicationName: 'Masidy',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    startupImage: [
      {
        url: '/apple-splash-2048-2732.png',
        sizes: '2048x2732',
        type: 'image/png',
      },
      {
        url: '/apple-splash-1668-2224.png',
        sizes: '1668x2224',
        type: 'image/png',
      },
      {
        url: '/apple-splash-1536-2048.png',
        sizes: '1536x2048',
        type: 'image/png',
      },
      {
        url: '/apple-splash-1125-2436.png',
        sizes: '1125x2436',
        type: 'image/png',
      },
      {
        url: '/apple-splash-1242-2688.png',
        sizes: '1242x2688',
        type: 'image/png',
      },
      {
        url: '/apple-splash-828-1792.png',
        sizes: '828x1792',
        type: 'image/png',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/masidy-icon-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/masidy-icon-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/masidy-icon-light.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#FC2F02',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} bg-background`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="font-sans antialiased overflow-x-hidden">
        <CartProvider>
          <MarketplaceCartProvider>
            <Navbar />
            <main className="min-h-[60vh] w-full">{children}</main>
            <Footer />
            <CartDrawer />
            <PWAInstallPrompt />
          </MarketplaceCartProvider>
        </CartProvider>
      </body>
    </html>
  )
}
