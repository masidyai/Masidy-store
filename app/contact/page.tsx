import { InfoPage } from '@/components/info-page'

const sections = [
  {
    title: 'Get in touch',
    body:
      "Have a question about our products, your order, or anything else? Email us at hello@masidy.store and we'll get back to you within 1-2 business days.",
  },
  {
    title: 'Order support',
    body:
      'For order-related questions, please include your order number in your email so we can help you quickly. We can assist with tracking, order changes, and delivery questions.',
  },
  {
    title: 'Before you reach out',
    body:
      'Many common questions are answered in our FAQ, shipping, and returns pages. Check those first for quick answers, or contact us directly if you need more help.',
    points: [
      'Order tracking and delivery questions',
      'Product sizing and availability',
      'Returns, exchanges, and refunds',
      'General inquiries and product questions',
    ],
  },
]

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact"
      intro="We are here to help with orders, product questions, and anything else you need to know before you buy."
      sections={sections}
      cta={{ href: '/faq', label: 'Read the FAQ' }}
    />
  )
}
