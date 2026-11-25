import { Body, Button, Container, Head, Html, Preview, Section, Text } from '@react-email/components'

interface ShippingNotificationEmailProps {
  customerName: string
  trackingNumber: string
  trackingUrl: string
  estimatedDelivery?: string
}

export function ShippingNotificationEmail({
  customerName,
  trackingNumber,
  trackingUrl,
  estimatedDelivery,
}: ShippingNotificationEmailProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.masidy.store'

  return (
    <Html>
      <Head />
      <Preview>Your order has shipped!</Preview>
      <Body style={{ backgroundColor: '#f5f5f5' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '20px', marginTop: '20px', borderRadius: '4px' }}>
          <Section style={{ textAlign: 'center', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
            <Text style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', textDecoration: 'none', color: '#000' }}>
              Masidy
            </Text>
          </Section>

          <Section style={{ paddingTop: '20px' }}>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
              Your order has shipped, {customerName}!
            </Text>
            <Text style={{ color: '#666', margin: '0 0 20px 0' }}>
              Your package is on its way. Track your delivery below.
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center' }}>
            <Text style={{ fontSize: '14px', color: '#666', margin: '0 0 10px 0' }}>Tracking Number</Text>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 15px 0', fontFamily: 'monospace' }}>
              {trackingNumber}
            </Text>
            {estimatedDelivery && (
              <Text style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                Estimated Delivery: {estimatedDelivery}
              </Text>
            )}
          </Section>

          <Section style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Button
              href={trackingUrl}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '4px',
                display: 'inline-block',
                marginBottom: '10px',
              }}
            >
              Track Order
            </Button>
          </Section>

          <Section style={{ borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center' }}>
            <Text style={{ fontSize: '12px', color: '#999', margin: '0' }}>
              Questions? Reply to this email or visit your order history at {siteUrl}/account/orders
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
