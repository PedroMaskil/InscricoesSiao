import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/caravana/adicionar?phone=XXXXX
export async function GET(req: NextRequest) {
  try {
    const phone  = req.nextUrl.searchParams.get('phone') ?? ''
    const digits = phone.replace(/\D/g, '')

    if (digits.length < 10) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
    }

    const all = await prisma.caravan.findMany({
      where:   { status: 'confirmed' },
      select:  { id: true, city: true, church: true, leader: true, leaderPhone: true, peopleCount: true },
      orderBy: { createdAt: 'desc' },
    })

    const matched = all.filter(c => c.leaderPhone.replace(/\D/g, '') === digits)

    if (matched.length === 0) {
      return NextResponse.json({ error: 'Nenhuma caravana encontrada para este telefone.' }, { status: 404 })
    }

    return NextResponse.json({ caravans: matched })
  } catch (err: any) {
    console.error('Adicionar GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/caravana/adicionar
export async function POST(req: NextRequest) {
  try {
    const formData    = await req.formData()
    const caravanId   = formData.get('caravanId') as string
    const peopleCount = parseInt(formData.get('peopleCount') as string)
    const file        = formData.get('file') as File | null

    if (!caravanId || !peopleCount || peopleCount < 1) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    const caravan = await prisma.caravan.findUnique({ where: { id: caravanId } })
    if (!caravan) return NextResponse.json({ error: 'Caravana não encontrada.' }, { status: 404 })

    let listFileUrl  = null
    let listFileName = null

    if (file && file.size > 0) {
      const db      = supabaseAdmin()
      const bytes   = await file.arrayBuffer()
      const buffer  = Buffer.from(bytes)
      const safeName = file.name
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `caravanas/adicional-${Date.now()}-${safeName}`

      const { error } = await db.storage
        .from('event-files')
        .upload(fileName, buffer, { contentType: file.type, upsert: false })

      if (error) throw new Error(`Upload falhou: ${error.message}`)

      const { data: { publicUrl } } = db.storage.from('event-files').getPublicUrl(fileName)
      listFileUrl  = publicUrl
      listFileName = file.name
    }

    const amount   = peopleCount * 4000
    const addition = await prisma.caravanAddition.create({
      data: { caravanId, peopleCount, amount, listFileUrl, listFileName, status: 'pending' },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inscricoes.batistasiao.org.br'
    const handle = process.env.INFINITEPAY_HANDLE!

    const ipResponse = await fetch('https://api.checkout.infinitepay.io/links', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle,
        redirect_url: `${appUrl}/caravana/sucesso?caravan_id=${caravanId}`,
        webhook_url:  `${appUrl}/api/webhook`,
        order_nsu:    `caravan_addition_${addition.id}`,
        items: [{
          quantity:    1,
          price:       amount,
          description: `LightHouse 2026 — Adicional ${caravan.church} (+${peopleCount} ${peopleCount === 1 ? 'pessoa' : 'pessoas'})`,
        }],
        customer: {
          name:         caravan.leader,
          email:        caravan.leaderEmail ?? '',
          phone_number: `+55${caravan.leaderPhone.replace(/\D/g, '')}`,
        },
      }),
    })

    if (!ipResponse.ok) {
      const errText = await ipResponse.text()
      throw new Error(`InfinitePay: ${errText}`)
    }

    const { url } = await ipResponse.json()
    return NextResponse.json({ url, additionId: addition.id, amount })
  } catch (err: any) {
    console.error('Caravan addition error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
