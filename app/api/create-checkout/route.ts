import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { calcPriceTier, PRICES, isCepMaringa, EVENT } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, cpf, source, cep, city, isMember, isOtherMember, otherChurch } = body

    if (!name || !email || !phone || !cpf || !cep) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }

    // Verifica se inscrições estão abertas
    const now = new Date()
    if (now > EVENT.registrationDeadline) {
      return NextResponse.json({ error: 'As inscrições foram encerradas.' }, { status: 400 })
    }

    const isMaringa = isCepMaringa(cep)

    // Conta membros confirmados no 1º lote via Prisma
    let memberCount = 0
    if (isMember && isMaringa) {
      memberCount = await prisma.registration.count({
        where: {
          isMember: true,
          status: 'confirmed',
          priceTier: 'member_1st',
        },
      })
    }

    // Calcula o lote correto
    const tier      = calcPriceTier({ isMaringa, isMember, memberCount, now })
    const priceInfo = PRICES[tier]

    // Salva inscrição como pending via Prisma
    const registration = await prisma.registration.create({
      data: {
        name, email, phone, cpf,
        source: source || null,
        cep, city: city || null,
        isMember,
        isOtherMember: isOtherMember || false,
        otherChurch: isOtherMember ? (otherChurch || null) : null,
        priceTier: tier,
        amount: priceInfo.amount,
        status: 'pending',
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    // Cria sessão no Stripe
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceInfo.priceId, quantity: 1 }],
      metadata: {
        registration_id: registration.id,
        name, phone, cpf,
        price_tier: tier,
        is_member: String(isMember),
      },
      success_url: `${appUrl}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/?canceled=true`,
      locale: 'pt-BR',
    })

    return NextResponse.json({ url: session.url, tier, amount: priceInfo.amount, label: priceInfo.label })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
