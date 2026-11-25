import { InfoPage } from '@/components/info-page'

const sections = [
  {
    title: 'Processing times',
    body:
      'Orders are typically processed and shipped within 2–5 business days. During busy periods, processing may take slightly longer, but we always work to get your items to you as quickly as possible.',
  },
  {
    title: 'Delivery expectations',
    body:
      'Once your order ships, delivery typically takes 3–7 business days depending on your location and the carrier service. You can select your preferred shipping method at checkout.',
  },
  {
    title: 'Tracking and updates',
    body:
      'You will receive a shipping confirmation email with tracking information as soon as your order leaves our facility. Check your tracking link for real-time updates on your delivery.',
    points: [
      'Free standard shipping on orders over $75',
      'International shipping available to most countries',
      'Express shipping options available at checkout',
      'Tracking provided for all shipments',
    ],
  },
]

export default function ShippingPage() {
  return (
    <InfoPage
      title="Shipping"
      intro="We aim to make shipping clear, predictable, and straightforward from checkout to delivery."
      sections={sections}
      cta={{ href: '/contact', label: 'Contact support' }}
    />
  )
}
