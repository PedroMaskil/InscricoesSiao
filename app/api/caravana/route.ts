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
    const peopleCount = parseInt(formData.get('peopleCount') as string)
    const file        = formData.get('file') as File | null

    if (!city || !church || !leader || !leaderPhone || !peopleCount) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }

    let listFileUrl  = null
    let listFileName = null

    // Upload do PDF para o Supabase Storage
    if (file && file.size > 0) {
      const db = supabaseAdmin()
      const bytes    = await file.arrayBuffer()
      const buffer   = Buffer.from(bytes)
      const fileName = `caravanas/${Date.now()}-${file.name.replace(/\s/g, '_')}`

      const { data, error } = await db.storage
        .from('event-files')
        .upload(fileName, buffer, { contentType: file.type, upsert: false })

      if (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'Erro ao fazer upload do arquivo.' }, { status: 500 })
      }

      const { data: { publicUrl } } = db.storage.from('event-files').getPublicUrl(fileName)
      listFileUrl  = publicUrl
      listFileName = file.name
    }

    // Salva caravana no banco
    const caravan = await prisma.caravan.create({
      data: {
        city, church, leader, leaderPhone,
        peopleCount,
        listFileUrl,
        listFileName,
        status: 'confirmed',
      },
    })

    return NextResponse.json({ success: true, id: caravan.id })
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
