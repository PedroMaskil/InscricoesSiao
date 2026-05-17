import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendConfirmationEmail } from '@/lib/email'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const registrationId = session.metadata?.registration_id

    if (registrationId) {
      const registration = await prisma.registration.update({
        where: { id: registrationId },
        data: {
          status: 'confirmed',
          stripeSessionId: session.id,
          paidAt: new Date(),
        },
      })

      await sendConfirmationEmail({
        id:     registration.id,
        name:   registration.name,
        email:  registration.email,
        amount: registration.amount,
      }).catch(err => console.error('Email error:', err))
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const registrationId = session.metadata?.registration_id

    if (registrationId) {
      await prisma.registration.update({
        where: { id: registrationId },
        data: { status: 'expired' },
      })
    }
  }

  return NextResponse.json({ received: true })
}
