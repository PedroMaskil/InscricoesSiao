import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendConfirmationEmail, sendCaravanConfirmationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { order_nsu, invoice_slug } = body

    if (!order_nsu) {
      return NextResponse.json({ error: 'Missing order_nsu' }, { status: 400 })
    }

    if (order_nsu.startsWith('caravan_')) {
      const caravanId = order_nsu.replace('caravan_', '')

      const caravan = await prisma.caravan.update({
        where: { id: caravanId },
        data: {
          status:      'confirmed',
          invoiceSlug: invoice_slug ?? null,
          paidAt:      new Date(),
        },
      })

      if (caravan.leaderEmail) {
        await sendCaravanConfirmationEmail({
          id:          caravan.id,
          leader:      caravan.leader,
          email:       caravan.leaderEmail,
          city:        caravan.city,
          church:      caravan.church,
          peopleCount: caravan.peopleCount,
          amount:      caravan.amount,
        }).catch(err => console.error('Caravan email error:', err))
      }
    } else {
      const registration = await prisma.registration.update({
        where: { id: order_nsu },
        data: {
          status:          'confirmed',
          stripeSessionId: invoice_slug ?? null,
          paidAt:          new Date(),
        },
      })

      await sendConfirmationEmail({
        id:     registration.id,
        name:   registration.name,
        email:  registration.email,
        amount: registration.amount,
      }).catch(err => console.error('Email error:', err))
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
