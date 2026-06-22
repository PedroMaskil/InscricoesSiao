import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendConfirmationEmail, sendCaravanConfirmationEmail } from '@/lib/email'

export async function GET() {
  try {
    const [caravans, individuals] = await Promise.all([
      prisma.caravan.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' } }),
      prisma.registration.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' } }),
    ])
    return NextResponse.json({ caravans, individuals })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, type } = await req.json()
    if (!id || !type) return NextResponse.json({ error: 'id e type obrigatórios' }, { status: 400 })

    if (type === 'individual') {
      const reg = await prisma.registration.update({
        where: { id },
        data:  { status: 'confirmed', paidAt: new Date(), stripeSessionId: 'ADMIN_CONFIRMADO' },
      })
      await sendConfirmationEmail({
        id:        reg.id,
        name:      reg.name,
        email:     reg.email,
        amount:    reg.amount,
        priceTier: reg.priceTier,
      }).catch(err => console.error('Email error:', err))
      return NextResponse.json({ confirmed: true })

    } else if (type === 'caravan') {
      const caravan = await prisma.caravan.update({
        where: { id },
        data:  { status: 'confirmed', paidAt: new Date(), invoiceSlug: 'ADMIN_CONFIRMADO' },
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
      return NextResponse.json({ confirmed: true })

    } else {
      return NextResponse.json({ error: 'type inválido' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, type } = await req.json()
    if (!id || !type) return NextResponse.json({ error: 'id e type obrigatórios' }, { status: 400 })

    if (type === 'individual') {
      await prisma.registration.delete({ where: { id, status: 'pending' } })
    } else if (type === 'caravan') {
      await prisma.caravan.delete({ where: { id, status: 'pending' } })
    } else {
      return NextResponse.json({ error: 'type inválido' }, { status: 400 })
    }

    return NextResponse.json({ deleted: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
