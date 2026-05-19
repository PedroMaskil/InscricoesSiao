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

    // Cria o registro no banco como pending
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

    // Cria cobrança PIX via InfinitePay API direta
    // Docs: https://developers.infinitepay.io
    const ipResponse = await fetch('https://api.infinitepay.io/v2/pix/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INFINITEPAY_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        amount,
        description: `LightHouse 2026 — Caravana ${church} (${peopleCount} ${peopleCount === 1 ? 'pessoa' : 'pessoas'})`,
        expiration_in_minutes: 2880,
        notification_url: `${appUrl}/api/pix-webhook`,
        metadata: { caravan_id: caravan.id },
      }),
    })

    if (!ipResponse.ok) {
      const errText = await ipResponse.text()
      // Remove caravan criada para não deixar registro órfão
      await prisma.caravan.delete({ where: { id: caravan.id } }).catch(() => {})
      throw new Error(`InfinitePay PIX: ${errText}`)
    }

    const pixData = await ipResponse.json()
    // pixData esperado: { id, brcode, status, expiration_at, ... }

    await prisma.caravan.update({
      where: { id: caravan.id },
      data: {
        pixChargeId: pixData.id ?? null,
        pixBrcode:   pixData.brcode ?? pixData.br_code ?? pixData.qr_code ?? null,
      },
    })

    return NextResponse.json({
      caravanId: caravan.id,
      brcode:    pixData.brcode ?? pixData.br_code ?? pixData.qr_code ?? null,
      amount,
    })
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
