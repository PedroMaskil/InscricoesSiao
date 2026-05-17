import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, phone: true,
        priceTier: true, amount: true, status: true,
        checkedIn: true, checkedInAt: true,
      },
    })
    if (!registration || registration.status !== 'confirmed') {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
    }
    return NextResponse.json(registration)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
