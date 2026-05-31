import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcPriceTier, PRICES, isCepMaringa, EVENT } from '@/lib/pricing'

const DAY_AMOUNTS: Record<string, number> = { quinta_sexta: 5500, sabado: 4000 }
const DAY_LABELS:  Record<string, string>  = { quinta_sexta: 'Qui + Sex', sabado: 'Sáb' }

function calcDayAmount(days: string[]): number {
  if (days.length === 2) return 7000
  return days.reduce((sum, d) => sum + (DAY_AMOUNTS[d] ?? 0), 0)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, cpf, source, cep, city, isMember, isOtherMember, otherChurch, selectedDays } = body

    if (!name || !email || !phone || !cpf || !cep) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }

    const now = new Date()
    if (now > EVENT.registrationDeadline) {
      return NextResponse.json({ error: 'As inscrições foram encerradas.' }, { status: 400 })
    }

    const isMaringa = isCepMaringa(cep)

    let tier: string
    let priceInfo: { label: string; amount: number }

    if (isMaringa) {
      const days: string[] = Array.isArray(selectedDays) ? selectedDays.filter((d: string) => DAY_AMOUNTS[d]) : []
      if (days.length === 0) {
        return NextResponse.json({ error: 'Selecione pelo menos um dia de participação.' }, { status: 400 })
      }
      tier      = `maringa_days:${days.join(',')}`
      priceInfo = {
        label:  `Maringá — ${days.map(d => DAY_LABELS[d]).join(' + ')}`,
        amount: calcDayAmount(days),
      }
    } else {
      const resolvedTier = calcPriceTier({ isMaringa, isMember: isMember || false, memberCount: 0, now })
      tier      = resolvedTier
      priceInfo = PRICES[resolvedTier]
    }

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
