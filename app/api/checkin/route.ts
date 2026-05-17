import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/checkin — toggle checkin de caravana ou individual
export async function PATCH(req: NextRequest) {
  try {
    const { id, type } = await req.json()
    // type: 'caravan' | 'individual'

    if (type === 'caravan') {
      const current = await prisma.caravan.findUnique({ where: { id } })
      if (!current) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

      const updated = await prisma.caravan.update({
        where: { id },
        data: {
          checkedIn:   !current.checkedIn,
          checkedInAt: !current.checkedIn ? new Date() : null,
        },
      })
      return NextResponse.json({ checkedIn: updated.checkedIn })
    }

    if (type === 'individual') {
      const current = await prisma.registration.findUnique({ where: { id } })
      if (!current) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

      const updated = await prisma.registration.update({
        where: { id },
        data: {
          checkedIn:   !(current as any).checkedIn,
          checkedInAt: !(current as any).checkedIn ? new Date() : null,
        },
      })
      return NextResponse.json({ checkedIn: (updated as any).checkedIn })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/checkin — busca todos os dados para o painel
export async function GET() {
  try {
    const [caravans, individuals] = await Promise.all([
      prisma.caravan.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.registration.findMany({
        where: { status: 'confirmed' },
        orderBy: { createdAt: 'asc' },
      }),
    ])
    return NextResponse.json({ caravans, individuals })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
