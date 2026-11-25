import { InfoPage } from '@/components/info-page'

const sections = [
  {
    title: 'Return policy',
    body:
      "We want you to love your purchase. If you're not completely satisfied, you can return unworn, unwashed items with original tags within 30 days of delivery for a full refund or exchange.",
  },
  {
    title: 'How to start a return',
    body:
      "Contact us at hello@masidy.store with your order number and the items you'd like to return. We'll send you a prepaid return label and instructions. Once we receive your return, we'll process your refund within 5-7 business days.",
  },
  {
    title: 'Exchanges and exceptions',
    body:
      "Need a different size or color? We're happy to exchange items subject to availability. Items that arrive damaged or defective will be replaced at no cost to you.",
    points: [
      'Returns accepted within 30 days of delivery',
      'Items must be unworn with original tags attached',
      'Damaged or defective items replaced free of charge',
      'Free return shipping on all domestic orders',
    ],
  },
]

export default function ReturnsPage() {
  return (
    <InfoPage
      title="Returns & Exchanges"
      intro="We stand behind the quality of our products. If something isn't quite right, we'll make it right."
      sections={sections}
      cta={{ href: '/contact', label: 'Contact support' }}
    />
  )
}
