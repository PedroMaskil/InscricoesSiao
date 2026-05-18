import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcPriceTier, PRICES, isCepMaringa, EVENT } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, cpf, source, cep, city, isMember, isOtherMember, otherChurch } = body

    if (!name || !email || !phone || !cpf || !cep) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }

    const now = new Date()
    if (now > EVENT.registrationDeadline) {
      return NextResponse.json({ error: 'As inscrições foram encerradas.' }, { status: 400 })
    }

    const isMaringa = isCepMaringa(cep)

    let memberCount = 0
    if (isMember && isMaringa) {
      memberCount = await prisma.registration.count({
        where: { isMember: true, status: 'confirmed', priceTier: 'member_1st' },
      })
    }

    const tier      = calcPriceTier({ isMaringa, isMember, memberCount, now })
    const priceInfo = PRICES[tier]

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inscricoes.batistasiao.org.br'
    const handle = process.env.INFINITEPAY_HANDLE!

    const ipResponse = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle,
        redirect_url: `${appUrl}/sucesso?registration_id=${registration.id}`,
        webhook_url:  `${appUrl}/api/webhook`,
        order_nsu:    registration.id,
        items: [{
          quantity:    1,
          price:       priceInfo.amount,
          description: `LightHouse 2026 — ${priceInfo.label}`,
        }],
        customer: {
          name:         name,
          email:        email,
          phone_number: `+55${phone.replace(/\D/g, '')}`,
        },
      }),
    })

    if (!ipResponse.ok) {
      const errText = await ipResponse.text()
      throw new Error(`InfinitePay: ${errText}`)
    }

    const { url } = await ipResponse.json()
    return NextResponse.json({ url, tier, amount: priceInfo.amount, label: priceInfo.label })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
