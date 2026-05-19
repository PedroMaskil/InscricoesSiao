import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendCaravanConfirmationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('PIX webhook received:', JSON.stringify(body))

    // InfinitePay pode enviar o payload em formatos variados.
    // Tentamos extrair o charge_id de onde quer que esteja.
    const chargeId: string | undefined =
      body?.id ??
      body?.charge_id ??
      body?.data?.id ??
      body?.data?.charge_id

    const status: string | undefined =
      body?.status ??
      body?.data?.status ??
      body?.event_type

    // Só processa se for pagamento confirmado
    const isPaid =
      status === 'paid' ||
      status === 'charge_paid' ||
      status === 'approved' ||
      status === 'completed'

    if (!isPaid || !chargeId) {
      return NextResponse.json({ received: true })
    }

    const caravan = await prisma.caravan.findFirst({
      where: { pixChargeId: chargeId },
    })

    if (!caravan) {
      // Tenta via metadata.caravan_id
      const caravanId: string | undefined =
        body?.metadata?.caravan_id ??
        body?.data?.metadata?.caravan_id

      if (!caravanId) {
        console.warn('PIX webhook: caravan não encontrada para charge', chargeId)
        return NextResponse.json({ received: true })
      }

      const byId = await prisma.caravan.findUnique({ where: { id: caravanId } })
      if (!byId || byId.status !== 'pending') {
        return NextResponse.json({ received: true })
      }

      await confirmCaravan(byId.id, chargeId, body)
      return NextResponse.json({ received: true })
    }

    if (caravan.status !== 'pending') {
      return NextResponse.json({ received: true })
    }

    await confirmCaravan(caravan.id, chargeId, body)
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('PIX webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function confirmCaravan(caravanId: string, chargeId: string, body: any) {
  const updated = await prisma.caravan.update({
    where: { id: caravanId },
    data: {
      status:      'confirmed',
      paidAt:      new Date(),
      pixChargeId: chargeId,
    },
  })

  if (updated.leaderEmail) {
    await sendCaravanConfirmationEmail({
      id:          updated.id,
      leader:      updated.leader,
      email:       updated.leaderEmail,
      city:        updated.city,
      church:      updated.church,
      peopleCount: updated.peopleCount,
      amount:      updated.amount,
    }).catch(err => console.error('Caravan email error:', err))
  }
}
