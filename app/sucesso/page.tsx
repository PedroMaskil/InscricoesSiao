import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { sendConfirmationEmail } from '@/lib/email'
import QrDownloadButton from './QrDownloadButton'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: {
    registration_id?: string
    order_nsu?: string
    slug?: string
    transaction_nsu?: string
  }
}) {
  const registrationId = searchParams.registration_id ?? searchParams.order_nsu ?? null
  let qrDataUrl:  string | null = null
  let regName:    string        = ''
  let regTier:    string        = ''

  // Verifica pagamento com InfinitePay e confirma inscrição
  if (registrationId && searchParams.slug && searchParams.transaction_nsu) {
    try {
      const checkRes = await fetch('https://api.checkout.infinitepay.io/payment_check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle:          process.env.INFINITEPAY_HANDLE!,
          order_nsu:       registrationId,
          transaction_nsu: searchParams.transaction_nsu,
          slug:            searchParams.slug,
        }),
      })

      if (checkRes.ok) {
        const { paid } = await checkRes.json()
        if (paid) {
          const reg = await prisma.registration.findUnique({ where: { id: registrationId } })
          if (reg) {
            regName = reg.name
            regTier = reg.priceTier
          }
          if (reg && reg.status === 'pending') {
            await prisma.registration.update({
              where: { id: registrationId },
              data: {
                status:          'confirmed',
                paidAt:          new Date(),
                stripeSessionId: searchParams.slug,
              },
            })
            await sendConfirmationEmail({
              id:        reg.id,
              name:      reg.name,
              email:     reg.email,
              amount:    reg.amount,
              priceTier: reg.priceTier,
            }).catch(err => console.error('Email error:', err))
          }
        }
      }
    } catch (err) {
      console.error('Payment check error:', err)
    }
  }

  // Busca nome/tier se ainda não preenchido (acesso direto à página)
  if (registrationId && !regName) {
    try {
      const r = await prisma.registration.findUnique({
        where: { id: registrationId },
        select: { name: true, priceTier: true },
      })
      if (r) { regName = r.name; regTier = r.priceTier }
    } catch { /* silently ignore */ }
  }

  // Gera QR code de check-in
  if (registrationId) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inscricoes.batistasiao.org.br'
      qrDataUrl = await QRCode.toDataURL(`${baseUrl}/checkin/${registrationId}`, {
        width: 220,
        margin: 2,
        color: { dark: '#1a0a2e', light: '#ffffff' },
      })
    } catch {
      // QR generation failed — show page without QR
    }
  }

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <img src="/banner.jpeg" aria-hidden="true" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', filter: 'blur(5px)', transform: 'scale(1.08)',
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,6,18,0.55)' }} />
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 550, width: '100%', textAlign: 'center',
        background: 'var(--dark-2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '48px 40px',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(79,200,120,0.12)',
          border: '2px solid rgba(79,200,120,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: '2.4rem', color: '#4fc878',
        }}>
          ✓
        </div>

        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '2rem', fontWeight: 700, marginBottom: 12,
        }}>
          Inscrição confirmada!
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 2, marginBottom: 4 }}>
          Obrigado! Seu pagamento foi processado com sucesso.
        </p>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28 }}>
          Aguardamos ansiosamente para te receber na Conferência LightHouse 2026.
        </p>

        {qrDataUrl && (
          <div style={{
            background: 'rgba(124,58,237,0.07)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 16, padding: '24px 20px', marginBottom: 28,
          }}>
            <p style={{ fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
              Seu QR Code de check-in
            </p>
            {regName && (
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 4 }}>{regName}</p>
            )}
            <div style={{ display: 'inline-block', background: '#fff', borderRadius: 12, padding: 10, marginBottom: 12, marginTop: 8 }}>
              <img src={qrDataUrl} width={180} height={180} alt="QR Code de check-in" style={{ display: 'block' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600, marginBottom: 16 }}>
              Check-in: Fila 02
            </p>
            <QrDownloadButton qrDataUrl={qrDataUrl} name={regName} priceTier={regTier} />
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              O e-mail com o QR Code também foi enviado para você.
            </p>
          </div>
        )}

        <div style={{
          background: 'rgba(201,168,76,0.07)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 0,
          fontSize: '0.85rem', color: 'var(--cream)', lineHeight: 1.6,
        }}>
          Dúvidas? Entre em contato conosco nas redes sociais. Até breve!<br />
          <a
            href="https://www.instagram.com/vetormaringa?igsh=ang5dTRqYmQxa25i"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#c084fc', fontWeight: 600, textDecoration: 'none' }}
          >
            @vetormaringa
          </a>
        </div>
      </div>
    </main>
  )
}
