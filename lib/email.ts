import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendCaravanConfirmationEmail(params: {
  id: string
  leader: string
  email: string
  city: string
  church: string
  peopleCount: number
  amount: number
}) {
  const { id, leader, email, city, church, peopleCount, amount } = params
  const firstName = leader.split(' ')[0]
  const valor = (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inscricoes.batistasiao.org.br'
  const checkinUrl = `${baseUrl}/caravana/sucesso?caravan_id=${id}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkinUrl)}&margin=10`

  await resend.emails.send({
    from: 'LightHouse 2026 <noreply@inscricoes.batistasiao.org.br>',
    to: email,
    subject: '✓ Caravana confirmada — LightHouse 2026',
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080612;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080612;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0f0a1a;border-radius:20px;border:1px solid rgba(124,58,237,0.22);overflow:hidden;">

        <tr><td style="background:linear-gradient(135deg,#7c3aed,#9333ea);padding:36px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.7);">Igreja Batista Sião · Maringá</p>
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#fff;">LightHouse 2026</h1>
        </td></tr>

        <tr><td style="padding:28px 40px 0;text-align:center;">
          <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:rgba(79,200,120,0.12);border:2px solid rgba(79,200,120,0.4);line-height:72px;font-size:32px;color:#4fc878;">✓</div>
        </td></tr>

        <tr><td style="padding:20px 40px 0;text-align:center;">
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Caravana confirmada, ${firstName}!</h2>
          <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.6;">Pagamento de <strong style="color:#c084fc;">${valor}</strong> processado com sucesso.</p>
        </td></tr>

        <tr><td style="padding:20px 24px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Detalhes da caravana</p>

              <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">🏛️ Igreja</p>
              <p style="margin:0 0 10px;font-size:13px;color:#fff;font-weight:500;">${church} — ${city}</p>

              <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">👤 Líder</p>
              <p style="margin:0 0 10px;font-size:13px;color:#fff;font-weight:500;">${leader}</p>

              <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">👥 Pessoas</p>
              <p style="margin:0 0 10px;font-size:13px;color:#fff;font-weight:500;">${peopleCount} ${peopleCount === 1 ? 'pessoa' : 'pessoas'}</p>

              <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">💰 Total pago</p>
              <p style="margin:0;font-size:13px;color:#c084fc;font-weight:600;">${valor}</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:16px 40px 8px;text-align:center;">
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">QR Code da caravana</p>
          <div style="display:inline-block;background:#fff;border-radius:12px;padding:10px;">
            <img src="${qrImageUrl}" width="180" height="180" alt="QR Code" style="display:block;" />
          </div>
          <p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,0.35);">Apresente este QR code na entrada do evento</p>
        </td></tr>

        <tr><td style="padding:16px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Detalhes do evento</p>

              <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">📅 Data</p>
              <p style="margin:0 0 10px;font-size:13px;color:#fff;font-weight:500;">25, 26 e 27 de Junho de 2026</p>

              <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">🕗 Horários</p>
              <p style="margin:0 0 10px;font-size:13px;color:#fff;font-weight:500;">Qui/Sex 20h–22h · Sáb 16h–21h</p>

              <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">📍 Local</p>
              <p style="margin:0;font-size:13px;color:#fff;font-weight:500;">Igreja Batista Sião</p>
              <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">R. Manoel de Macedo, 37 - Zona 7, Maringá</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 40px 40px;text-align:center;">
          <p style="margin:16px 0 8px;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.7;">
            Dúvidas? Entre em contato pelo Instagram:
          </p>
          <a href="https://www.instagram.com/vetormaringa" style="color:#c084fc;font-weight:600;font-size:14px;text-decoration:none;">@vetormaringa</a>
          <p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.35);line-height:1.7;">
            Suporte direto:<br>
            <strong style="color:rgba(255,255,255,0.55);">(44) 99960-5447</strong> — Pedro
          </p>
          <p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.25);">Aguardamos ansiosamente para receber sua caravana! 🙏</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}


export async function sendConfirmationEmail(params: {
  id: string
  name: string
  email: string
  amount: number
}) {
  const { id, name, email, amount } = params
  const firstName = name.split(' ')[0]
  const valor = (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inscricoes.batistasiao.org.br'
  const checkinUrl = `${baseUrl}/checkin/${id}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkinUrl)}&margin=10`

  await resend.emails.send({
    from: 'LightHouse 2026 <noreply@inscricoes.batistasiao.org.br>',
    to: email,
    subject: '✓ Inscrição confirmada — LightHouse 2026',
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080612;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080612;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0f0a1a;border-radius:20px;border:1px solid rgba(124,58,237,0.22);overflow:hidden;">

        <!-- Header roxo -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#9333ea);padding:36px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.7);">Igreja Batista Sião · Maringá</p>
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#fff;">LightHouse 2026</h1>
        </td></tr>

        <!-- Ícone check -->
        <tr><td style="padding:28px 40px 0;text-align:center;">
          <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:rgba(79,200,120,0.12);border:2px solid rgba(79,200,120,0.4);line-height:72px;font-size:32px;color:#4fc878;">✓</div>
        </td></tr>

        <!-- Título -->
        <tr><td style="padding:20px 40px 0;text-align:center;">
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Inscrição confirmada, ${firstName}!</h2>
          <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.6;">Seu pagamento de <strong style="color:#c084fc;">${valor}</strong> foi processado com sucesso.</p>
        </td></tr>

        <!-- QR Code -->
        <tr><td style="padding:24px 40px 8px;text-align:center;">
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Seu QR Code de check-in</p>
          <div style="display:inline-block;background:#fff;border-radius:12px;padding:10px;">
            <img src="${qrImageUrl}" width="180" height="180" alt="QR Code" style="display:block;" />
          </div>
          <p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,0.35);">Apresente este QR code na entrada do evento</p>
        </td></tr>

        <!-- Detalhes do evento -->
        <tr><td style="padding:24px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
            <tr><td style="padding:20px 20px;">
              <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Detalhes do evento</p>

              <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">📅 Data</p>
              <p style="margin:0 12px 0 0;font-size:13px;color:#fff;font-weight:500;">25, 26 e 27 de Junho de 2026</p>

              <p style="margin:12px 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">🕗 Horários</p>
              <p style="margin:0;font-size:13px;color:#fff;font-weight:500;">Qui/Sex 20h–22h · Sáb 16h–21h</p>

              <p style="margin:12px 0 2px;font-size:11px;color:rgba(255,255,255,0.4);">📍 Local</p>
              <p style="margin:0;font-size:13px;color:#fff;font-weight:500;">Igreja Batista Sião</p>
              <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">R. Manoel de Macedo, 37 - Zona 7, Maringá</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Dúvidas -->
        <tr><td style="padding:0 40px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.7;">
            Dúvidas? Entre em contato pelo Instagram:
          </p>
          <a href="https://www.instagram.com/vetormaringa" style="color:#c084fc;font-weight:600;font-size:14px;text-decoration:none;">@vetormaringa</a>
          <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.35);line-height:1.7;">
            Para reembolso do ingresso nos contate:<br>
            <strong style="color:rgba(255,255,255,0.55);">(44) 99960-5447</strong>
          </p>
          <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.25);">Aguardamos ansiosamente para te receber! 🙏</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
