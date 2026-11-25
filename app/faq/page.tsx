import { InfoPage } from '@/components/info-page'

const sections = [
  {
    title: 'How long does production take?',
    body:
      'Most orders are processed and shipped within 2–5 business days. Timing can vary slightly depending on the product and current order volume.',
  },
  {
    title: 'Do you offer returns or exchanges?',
    body:
      'Returns are available for damaged, defective, or incorrect items. We do not offer regular exchanges for made-to-order products unless a fulfillment issue occurred.',
  },
  {
    title: 'Can I track my order?',
    body:
      'Yes. Once your order ships, you will receive a confirmation email with tracking information so you can follow the delivery progress.',
    points: [
      'Orders are processed and shipped from our fulfillment centers',
      'Support is available for shipping delays and delivery questions',
      'The size guide is recommended before ordering if you are unsure about fit',
    ],
  },
]

export default function FAQPage() {
  return (
    <InfoPage
      title="Frequently Asked Questions"
      intro="A quick overview of the most common questions we hear from customers before they place an order."
      sections={sections}
      cta={{ href: '/contact', label: 'Ask us anything' }}
    />
  )
}
