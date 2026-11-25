import { InfoPage } from '@/components/info-page'

const sections = [
  {
    title: 'Less waste, more intention',
    body:
      'We carefully manage our inventory and production to minimize waste. Each piece is thoughtfully made and only stocked when there is demand, ensuring fewer products end up unsold.',
  },
  {
    title: 'Materials chosen for longevity',
    body:
      'Our catalog leans toward comfortable, durable fabrics and quality finishes that can handle repeated use. We favor a clean, understated look that is easy to live in and simple to style.',
  },
  {
    title: 'Shipping that stays practical',
    body:
      'We work with fulfillment partners who help us ship closer to the customer whenever possible. The result is a more efficient delivery process with less unnecessary transit and a smaller environmental impact.',
    points: [
      'Made-to-order production to avoid overproduction',
      'Packaging kept minimal and functional',
      'Fulfillment coordinated through a distributed network',
    ],
  },
]

export default function SustainabilityPage() {
  return (
    <InfoPage
      title="Sustainability"
      intro="Sustainability for us means designing products that are useful, durable, and produced with care — never just for volume."
      sections={sections}
      cta={{ href: '/search', label: 'See the latest drops' }}
    />
  )
}
