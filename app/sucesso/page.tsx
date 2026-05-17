import Link from 'next/link'

export default function SuccessPage() {
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
        borderRadius: 20, padding: '56px 40px',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(79,200,120,0.12)',
          border: '2px solid rgba(79,200,120,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 30px', fontSize: '2.4rem', color: '#4fc878',
        }}>
          ✓
        </div>
        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '2rem', fontWeight: 700, marginBottom: 16,
        }}>
          Inscrição confirmada!
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 2, marginBottom:5 }}>
          Obrigado! Seu pagamento foi processado com sucesso.
        </p>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom:32}}>
          Aguardamos ansiosamente para te receber na Conferência LightHouse 2026. 
        </p>
        <div style={{
          background: 'rgba(201,168,76,0.07)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 32,
          fontSize: '0.85rem', color: 'var(--cream)', lineHeight: 1.6,
        }}>
          Se tiver qualquer dúvida, entre em contato conosco nas redes sociais. <br /> Até breve!<br />
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
