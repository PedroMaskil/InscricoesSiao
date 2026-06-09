import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
