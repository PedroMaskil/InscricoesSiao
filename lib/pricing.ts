// ─── Configurações do evento ──────────────────────────────
export const EVENT = {
  name:          'Light House 2026',
  dates:         '25, 26 e 27 de junho',
  schedule:      'Qui e Sex: 20h–22h · Sáb: 16h–21h',
  registrationDeadline: new Date('2025-06-21T23:59:59-03:00'),
  member2ndLoteCutoff:  new Date('2025-06-14T23:59:59-03:00'), // após essa data: R$80
  member1stLoteLimit:   50, // primeiras 50 vagas de membro = R$60
}

// ─── Faixas de preço ──────────────────────────────────────
export type PriceTier = 'outside' | 'local' | 'member_1st' | 'member_2nd' | 'member_final'

export const PRICES: Record<PriceTier, { label: string; amount: number; priceId: string }> = {
  outside:      { label: 'Fora de Maringá',        amount: 4000, priceId: process.env.STRIPE_PRICE_OUTSIDE!      },
  local:        { label: 'Maringá',                amount: 6000, priceId: process.env.STRIPE_PRICE_LOCAL!        },
  member_1st:   { label: 'Membro — 1º lote',       amount: 6000, priceId: process.env.STRIPE_PRICE_LOCAL!        },
  member_2nd:   { label: 'Membro — 2º lote',       amount: 7000, priceId: process.env.STRIPE_PRICE_MEMBER_2ND!  },
  member_final: { label: 'Membro — Lote final',    amount: 8000, priceId: process.env.STRIPE_PRICE_MEMBER_FINAL! },
}

// ─── Lógica de precificação ───────────────────────────────
export function calcPriceTier(params: {
  isMaringa: boolean
  isMember:  boolean
  memberCount: number  // membros confirmados no 1º lote
  now?: Date
}): PriceTier {
  const { isMaringa, isMember, memberCount, now = new Date() } = params

  // Fora de Maringá → sempre R$40
  if (!isMaringa) return 'outside'

  // Não-membro de Maringá → sempre R$60
  if (!isMember) return 'local'

  // Membro → verifica data e quantidade
  const isPast14Jun = now > EVENT.member2ndLoteCutoff

  if (isPast14Jun)          return 'member_final'  // após 14/06 → R$80
  if (memberCount >= EVENT.member1stLoteLimit)
                            return 'member_2nd'     // 50+ membros → R$70
  return 'member_1st'                               // menos de 50 → R$60
}

// ─── CEP helpers ──────────────────────────────────────────
// CEPs de Maringá: 87000-000 até 87139-999
export function isCepMaringa(cep: string): boolean {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return false
  const num = parseInt(digits, 10)
  return num >= 87000000 && num <= 87139999
}

export function formatCep(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9)
}
