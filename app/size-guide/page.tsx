import { InfoPage } from '@/components/info-page'

const sections = [
  {
    title: 'Finding your perfect fit',
    body:
      'Our apparel is designed with a relaxed, comfortable fit suitable for everyday wear. Each product page includes detailed measurements to help you choose the right size.',
  },
  {
    title: 'Size recommendations',
    body:
      "Most Masidy items run true to size. If you're between sizes, we recommend sizing up for a more relaxed fit, or staying with your usual size for a standard fit. Check the product-specific measurements for the most accurate sizing.",
  },
  {
    title: 'Measurement guide',
    body:
      'For the best fit, measure a similar item you already own and compare it to our size charts. All measurements are in inches and refer to the actual garment dimensions, not body measurements.',
    points: [
      'Chest: Measure across the chest from armpit to armpit',
      'Length: Measure from the highest point of the shoulder to the hem',
      'Sleeve: Measure from the shoulder seam to the cuff',
      'All measurements are taken with the garment laid flat',
    ],
  },
]

export default function SizeGuidePage() {
  return (
    <InfoPage
      title="Size Guide"
      intro="A good fit makes all the difference. This guide is here to make sizing feel simple and more confident."
      sections={sections}
      cta={{ href: '/search', label: 'Find your fit' }}
    />
  )
}
