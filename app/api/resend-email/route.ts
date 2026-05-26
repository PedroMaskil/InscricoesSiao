import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import QRCode from 'qrcode'

const resend = new Resend(process.env.RESEND_API_KEY)

const DAY_FULL: Record<string, string> = {
  quinta: 'Quinta-feira, 25/06 — 20h às 22h',
  sexta:  'Sexta-feira, 26/06 — 20h às 22h',
  sabado: 'Sábado, 27/06 — 16h às 21h',
}

function parseDays(priceTier: string): string[] {
  if (!priceTier.startsWith('maringa_days:')) return []
  return priceTier.replace('maringa_days:', '').split(',').filter(Boolean)
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

    const reg = await prisma.registration.findUnique({ where: { id } })
    if (!reg) return NextResponse.json({ error: 'Inscrito não encontrado.' }, { status: 404 })
    if (reg.status !== 'confirmed') return NextResponse.json({ error: 'Inscrição não confirmada.' }, { status: 400 })

    const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'https://inscricoes.batistasiao.org.br'
    const qrUrl    = await QRCode.toDataURL(`${appUrl}/checkin/${reg.id}`, {
      width: 240, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })

    const days     = parseDays(reg.priceTier)
    const daysHtml = days.length > 0
      ? days.map(d => `<li style="margin-bottom:4px;">${DAY_FULL[d] ?? d}</li>`).join('')
      : '<li>Todos os dias do evento</li>'

    const { error } = await resend.emails.send({
      from:    process.env.RESEND_FROM ?? 'LightHouse 2026 <noreply@inscricoes.batistasiao.org.br>',
      to:      [reg.email],
      subject: '🎟️ Seu ingresso — LightHouse 2026',
      html:    buildHtml({ name: reg.name, qrUrl, daysHtml, amount: reg.amount }),
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[resend-email]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildHtml({ name, qrUrl, daysHtml, amount }: {
  name: string; qrUrl: string; daysHtml: string; amount: number
}) {
  const price = (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f0f7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0f7;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#080612;border-radius:20px;overflow:hidden;">

        <!-- Header roxo -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#9333ea);padding:36px 32px 28px;text-align:center;">
            <p style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 10px;">
              Igreja Batista Sião · Maringá
            </p>
            <h1 style="color:#fff;font-size:30px;font-weight:800;margin:0;letter-spacing:-0.5px;">LightHouse 2026</h1>
            <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:8px 0 0;">Conferência de Jovens</p>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:32px 28px;">

            <p style="color:#fff;font-size:17px;font-weight:700;margin:0 0 6px;">Olá, ${name}! 👋</p>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.65;margin:0 0 28px;">
              Sua inscrição está confirmada! Apresente o QR Code abaixo na entrada do evento para fazer seu check-in.
            </p>

            <!-- QR Code -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">SEU INGRESSO</p>
                  <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#fff;">${name}</p>
                  <div style="background:#fff;border-radius:16px;padding:16px 16px 12px;display:inline-block;text-align:center;">
                    <img src="${qrUrl}" width="200" height="200" alt="QR Code de check-in" style="display:block;" />
                  </div>
                  <p style="margin:10px 0 2px;font-size:14px;font-weight:700;color:#c084fc;">Check-in: Fila 02</p>
                  <p style="margin:0;color:rgba(255,255,255,0.35);font-size:11px;">Apresente este código na entrada do evento</p>
                </td>
              </tr>
            </table>

            <!-- Detalhes -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <p style="color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 5px;">Dias inscritos</p>
                  <ul style="color:#e9d5ff;font-size:14px;font-weight:600;margin:0;padding-left:18px;line-height:1.8;">
                    ${daysHtml}
                  </ul>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <p style="color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 5px;">Local</p>
                  <p style="color:#fff;font-size:14px;font-weight:600;margin:0;">Igreja Batista Sião</p>
                  <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:3px 0 0;">R. Manoel de Macedo, 37 — Zona 7, Maringá · PR</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <p style="color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 5px;">Valor pago</p>
                  <p style="color:#4fc878;font-size:16px;font-weight:700;margin:0;">${price}</p>
                </td>
              </tr>
            </table>

            <p style="color:rgba(255,255,255,0.3);font-size:12px;line-height:1.7;margin:0;text-align:center;">
              Dúvidas? Fale com a gente pelo WhatsApp:
              <a href="https://wa.me/5544999605447" style="color:#c084fc;text-decoration:none;font-weight:600;">&nbsp;(44) 99960-5447</a>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <p style="color:rgba(255,255,255,0.18);font-size:11px;margin:0;">Igreja Batista Sião · Maringá, PR · 2026</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
