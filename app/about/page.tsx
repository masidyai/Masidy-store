import { InfoPage } from '@/components/info-page'

const sections = [
  {
    title: 'A studio built around everyday essentials',
    body:
      'Masidy is a premium lifestyle brand focused on thoughtful apparel and accessories that feel calm, durable, and easy to wear. We design around subtle color, texture, and timeless shapes so each piece fits seamlessly into real life.',
  },
  {
    title: 'Made only when it is needed',
    body:
      'We believe the best products are the ones that arrive when they are truly wanted. That is why we carefully manage our inventory to reduce overproduction and keep waste low from the start.',
  },
  {
    title: 'What we stand for',
    body:
      'Our work is grounded in considered materials, honest production, and a clear point of view. We want each order to feel personal, useful, and worth keeping for years.',
    points: [
      'Small-batch production with less excess inventory',
      'Thoughtful packaging that is simple and reusable',
      'A growing catalog shaped by customer feedback and everyday use',
    ],
  },
]

export default function AboutPage() {
  return (
    <InfoPage
      title="About Masidy"
      intro="We create modern essentials with a slower, more intentional approach — designed to be worn often, crafted carefully, and shipped with purpose."
      sections={sections}
      cta={{ href: '/search', label: 'Shop the collection' }}
    />
  )
}
