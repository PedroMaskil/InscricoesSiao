import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendConfirmationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { order_nsu, invoice_slug } = body

    if (!order_nsu) {
      return NextResponse.json({ error: 'Missing order_nsu' }, { status: 400 })
    }

    const registration = await prisma.registration.update({
      where: { id: order_nsu },
      data: {
        status: 'confirmed',
        stripeSessionId: invoice_slug ?? null,
        paidAt: new Date(),
      },
    })

    await sendConfirmationEmail({
      id:     registration.id,
      name:   registration.name,
      email:  registration.email,
      amount: registration.amount,
    }).catch(err => console.error('Email error:', err))

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
