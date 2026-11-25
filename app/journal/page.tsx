import { InfoPage } from '@/components/info-page'

const sections = [
  {
    title: 'Stories behind the products',
    body:
      'The Masidy Journal shares the inspiration, design process, and stories behind our collections. From fabric choices to color palettes, we document the journey of each piece.',
  },
  {
    title: 'New arrivals and updates',
    body:
      "Stay updated on new product launches, seasonal collections, and restocks. We'll share what's coming next and give you a first look at upcoming releases.",
  },
  {
    title: 'The Masidy approach',
    body:
      'We believe in creating timeless pieces that work for everyday life. Our focus is on quality materials, thoughtful design, and products that get better with wear.',
    points: [
      'Collection previews and launch announcements',
      'Product spotlights and styling ideas',
      'Behind-the-scenes and design notes',
      'Company updates and sustainability initiatives',
    ],
  },
]

export default function JournalPage() {
  return (
    <InfoPage
      title="Journal"
      intro="Welcome to the Masidy Journal — where we share our latest collections, design inspiration, and brand updates."
      sections={sections}
      cta={{ href: '/search', label: 'Shop new arrivals' }}
    />
  )
}
