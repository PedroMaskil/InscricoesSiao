import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

// Necessário para ler o raw body do webhook
export const config = { api: { bodyParser: false } }

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

  const db = supabaseAdmin()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const registrationId = session.metadata?.registration_id

    if (registrationId) {
      // Atualiza status para 'confirmed'
      await db
        .from('registrations')
        .update({
          status: 'confirmed',
          stripe_session_id: session.id,
          paid_at: new Date().toISOString(),
        })
        .eq('id', registrationId)
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const registrationId = session.metadata?.registration_id
    if (registrationId) {
      await db
        .from('registrations')
        .update({ status: 'expired' })
        .eq('id', registrationId)
    }
  }

  return NextResponse.json({ received: true })
}
