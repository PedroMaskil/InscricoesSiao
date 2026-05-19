import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const city        = formData.get('city') as string
    const church      = formData.get('church') as string
    const leader      = formData.get('leader') as string
    const leaderPhone = formData.get('leaderPhone') as string
    const leaderEmail = formData.get('leaderEmail') as string
    const peopleCount = parseInt(formData.get('peopleCount') as string)
    const file        = formData.get('file') as File | null

    if (!city || !church || !leader || !leaderPhone || !leaderEmail || !peopleCount) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }

    let listFileUrl  = null
    let listFileName = null

    if (file && file.size > 0) {
      const db = supabaseAdmin()
      const bytes    = await file.arrayBuffer()
      const buffer   = Buffer.from(bytes)
      const safeName = file.name
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `caravanas/${Date.now()}-${safeName}`

      const { error } = await db.storage
        .from('event-files')
        .upload(fileName, buffer, { contentType: file.type, upsert: false })

      if (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: `Upload falhou: ${error.message}` }, { status: 500 })
      }

      const { data: { publicUrl } } = db.storage.from('event-files').getPublicUrl(fileName)
      listFileUrl  = publicUrl
      listFileName = file.name
    }

    const amount = peopleCount * 4000 // R$40 por pessoa em centavos

    const caravan = await prisma.caravan.create({
      data: {
        city, church, leader, leaderPhone, leaderEmail,
        peopleCount,
        amount,
        listFileUrl,
        listFileName,
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
        redirect_url: `${appUrl}/caravana/sucesso?caravan_id=${caravan.id}`,
        webhook_url:  `${appUrl}/api/webhook`,
        order_nsu:    `caravan_${caravan.id}`,
        items: [{
          quantity:    1,
          price:       amount,
          description: `LightHouse 2026 — Caravana ${church} (${peopleCount} ${peopleCount === 1 ? 'pessoa' : 'pessoas'})`,
        }],
        customer: {
          name:         leader,
          email:        leaderEmail,
          phone_number: `+55${leaderPhone.replace(/\D/g, '')}`,
        },
      }),
    })

    if (!ipResponse.ok) {
      const errText = await ipResponse.text()
      throw new Error(`InfinitePay: ${errText}`)
    }

    const { url } = await ipResponse.json()
    return NextResponse.json({ url, caravanId: caravan.id, amount })
  } catch (err: any) {
    console.error('Caravan error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const caravans = await prisma.caravan.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ caravans })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
