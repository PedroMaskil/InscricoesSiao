import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { sendCaravanConfirmationEmail } from '@/lib/email'

export default async function CaravanSuccessPage({
  searchParams,
}: {
  searchParams: {
    caravan_id?: string
    slug?: string
    transaction_nsu?: string
  }
}) {
  const caravanId = searchParams.caravan_id ?? null
  let qrDataUrl: string | null = null
  let caravan: Awaited<ReturnType<typeof prisma.caravan.findUnique>> | null = null

  if (caravanId && searchParams.slug && searchParams.transaction_nsu) {
    try {
      const checkRes = await fetch('https://api.checkout.infinitepay.io/payment_check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle:          process.env.INFINITEPAY_HANDLE!,
          order_nsu:       `caravan_${caravanId}`,
          transaction_nsu: searchParams.transaction_nsu,
          slug:            searchParams.slug,
        }),
      })

      if (checkRes.ok) {
        const { paid } = await checkRes.json()
        if (paid) {
          const existing = await prisma.caravan.findUnique({ where: { id: caravanId } })
          if (existing && existing.status === 'pending') {
            await prisma.caravan.update({
              where: { id: caravanId },
              data: {
                status:      'confirmed',
                paidAt:      new Date(),
                invoiceSlug: searchParams.slug,
              },
            })
            if (existing.leaderEmail) {
              await sendCaravanConfirmationEmail({
                id:          existing.id,
                leader:      existing.leader,
                email:       existing.leaderEmail,
                city:        existing.city,
                church:      existing.church,
                peopleCount: existing.peopleCount,
                amount:      existing.amount,
              }).catch(err => console.error('Caravan email error:', err))
            }
          }
        }
      }
    } catch (err) {
      console.error('Payment check error:', err)
    }
  }

  if (caravanId) {
    caravan = await prisma.caravan.findUnique({ where: { id: caravanId } })

    if (caravan) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inscricoes.batistasiao.org.br'
        qrDataUrl = await QRCode.toDataURL(`${baseUrl}/caravana/sucesso?caravan_id=${caravanId}`, {
          width: 220, margin: 2,
          color: { dark: '#1a0a2e', light: '#ffffff' },
        })
      } catch { /* QR generation failed */ }
    }
  }

  const valor = caravan
    ? (caravan.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null

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
        maxWidth: 560, width: '100%', textAlign: 'center',
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
          Caravana confirmada!
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: 4 }}>
          Pagamento processado com sucesso.
        </p>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
          Aguardamos ansiosamente para receber sua caravana na Conferência LightHouse 2026.
        </p>

        {caravan && (
          <div style={{
            background: 'rgba(124,58,237,0.07)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 14, padding: '20px',
            marginBottom: 24, textAlign: 'left',
          }}>
            <p style={{
              fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)', marginBottom: 14,
            }}>
              Resumo da inscrição
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Igreja',     value: `${caravan.church} — ${caravan.city}` },
                { label: 'Líder',      value: caravan.leader },
                { label: 'Pessoas',    value: `${caravan.peopleCount} ${caravan.peopleCount === 1 ? 'pessoa' : 'pessoas'}` },
                { label: 'Total pago', value: valor ?? '' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
                  <span style={{
                    fontSize: '0.88rem', fontWeight: 600,
                    color: item.label === 'Total pago' ? '#c084fc' : '#fff',
                  }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {qrDataUrl && (
          <div style={{
            background: 'rgba(124,58,237,0.07)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 16, padding: '24px 20px', marginBottom: 24,
          }}>
            <p style={{
              fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)', marginBottom: 16,
            }}>
              QR Code da caravana
            </p>
            <div style={{ display: 'inline-block', background: '#fff', borderRadius: 12, padding: 10 }}>
              <img src={qrDataUrl} width={180} height={180} alt="QR Code da caravana" style={{ display: 'block' }} />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 12 }}>
              Salve esta tela ou use o QR do e-mail na entrada do evento
            </p>
          </div>
        )}

        <div style={{
          background: 'rgba(201,168,76,0.07)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 12, padding: '16px 20px',
          fontSize: '0.85rem', color: 'var(--cream)', lineHeight: 1.6,
        }}>
          Dúvidas? Fale conosco pelo Instagram ou WhatsApp.<br />
          <a
            href="https://www.instagram.com/vetormaringa?igsh=ang5dTRqYmQxa25i"
            target="_blank" rel="noreferrer"
            style={{ color: '#c084fc', fontWeight: 600, textDecoration: 'none' }}
          >
            @vetormaringa
          </a>
          {' '}·{' '}
          <a
            href="https://wa.me/5544999605447"
            target="_blank" rel="noreferrer"
            style={{ color: '#c084fc', fontWeight: 600, textDecoration: 'none' }}
          >
            (44) 99960-5447
          </a>
        </div>
      </div>
    </main>
  )
}
