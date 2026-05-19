import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const caravan = await prisma.caravan.findUnique({
    where: { id },
    select: { id: true, status: true },
  })

  if (!caravan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ status: caravan.status })
}
