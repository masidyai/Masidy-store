import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import type { Order } from '@/lib/db/orders'

interface OrderConfirmationEmailProps {
  order: Order
  orderUrl: string
}

export function OrderConfirmationEmail({ order, orderUrl }: OrderConfirmationEmailProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.masidy.store'

  return (
    <Html>
      <Head />
      <Preview>Your order #{order.id.slice(0, 8)} has been confirmed</Preview>
      <Body style={{ backgroundColor: '#f5f5f5' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '20px', marginTop: '20px', borderRadius: '4px' }}>
          <Section style={{ textAlign: 'center', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
            <Link href={siteUrl} style={{ fontSize: '24px', fontWeight: 'bold', textDecoration: 'none', color: '#000' }}>
              Masidy
            </Link>
          </Section>

          <Section style={{ paddingTop: '20px' }}>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Order Confirmed</Text>
            <Text style={{ color: '#666', margin: '0 0 20px 0' }}>
              Thank you for your purchase! We're preparing your order and will send you a tracking number soon.
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
            <Text style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>Order Number: {order.id.slice(0, 8)}</Text>
            <Text style={{ margin: '0 0 5px 0', color: '#666' }}>Order Date: {new Date(order.createdAt).toLocaleDateString()}</Text>
            <Text style={{ margin: '0', color: '#666' }}>Status: <strong>{order.status}</strong></Text>
          </Section>

          <Section style={{ marginBottom: '20px' }}>
            <Text style={{ fontWeight: 'bold', marginBottom: '10px' }}>Items</Text>
            {order.items.map((item) => (
              <Row key={item.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                <Section style={{ width: '60%' }}>
                  <Text style={{ margin: '0', fontWeight: '500' }}>{item.title}</Text>
                  <Text style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
                    {item.color} / {item.size} × {item.quantity}
                  </Text>
                </Section>
                <Section style={{ width: '40%', textAlign: 'right' }}>
                  <Text style={{ margin: '0', fontWeight: '500' }}>
                    {item.currency} {(item.price * item.quantity).toFixed(2)}
                  </Text>
                </Section>
              </Row>
            ))}
          </Section>

          <Section style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
            <Row style={{ marginBottom: '10px' }}>
              <Section style={{ width: '60%' }}>
                <Text style={{ margin: '0', color: '#666' }}>Subtotal</Text>
              </Section>
              <Section style={{ width: '40%', textAlign: 'right' }}>
                <Text style={{ margin: '0', color: '#666' }}>{order.currency} {order.subtotal.toFixed(2)}</Text>
              </Section>
            </Row>
            {order.shippingCost > 0 && (
              <Row style={{ marginBottom: '10px' }}>
                <Section style={{ width: '60%' }}>
                  <Text style={{ margin: '0', color: '#666' }}>Shipping</Text>
                </Section>
                <Section style={{ width: '40%', textAlign: 'right' }}>
                  <Text style={{ margin: '0', color: '#666' }}>{order.currency} {order.shippingCost.toFixed(2)}</Text>
                </Section>
              </Row>
            )}
            {order.tax > 0 && (
              <Row style={{ marginBottom: '10px' }}>
                <Section style={{ width: '60%' }}>
                  <Text style={{ margin: '0', color: '#666' }}>Tax</Text>
                </Section>
                <Section style={{ width: '40%', textAlign: 'right' }}>
                  <Text style={{ margin: '0', color: '#666' }}>{order.currency} {order.tax.toFixed(2)}</Text>
                </Section>
              </Row>
            )}
            <Hr style={{ margin: '10px 0' }} />
            <Row>
              <Section style={{ width: '60%' }}>
                <Text style={{ margin: '0', fontWeight: 'bold', fontSize: '16px' }}>Total</Text>
              </Section>
              <Section style={{ width: '40%', textAlign: 'right' }}>
                <Text style={{ margin: '0', fontWeight: 'bold', fontSize: '16px' }}>{order.currency} {order.total.toFixed(2)}</Text>
              </Section>
            </Row>
          </Section>

          <Section style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Button
              href={orderUrl}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '4px',
                display: 'inline-block',
              }}
            >
              View Order
            </Button>
          </Section>

          <Section style={{ borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center' }}>
            <Text style={{ fontSize: '12px', color: '#999', margin: '0' }}>
              Questions? Reply to this email or contact support at support@masidy.store
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
