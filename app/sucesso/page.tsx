import Link from 'next/link'

export default function SuccessPage() {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24, background: 'var(--dark)',
    }}>
      <div style={{
        maxWidth: 480, width: '100%', textAlign: 'center',
        background: 'var(--dark-2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '56px 40px',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(201,168,76,0.12)',
          border: '1px solid rgba(201,168,76,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', fontSize: '2rem',
        }}>
          ✦
        </div>
        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '2.2rem', fontWeight: 700, marginBottom: 16,
        }}>
          Inscrição confirmada!
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32 }}>
          Obrigado! Seu pagamento foi processado com sucesso. Você receberá um e-mail
          de confirmação em breve com todos os detalhes do evento.
        </p>
        <div style={{
          background: 'rgba(201,168,76,0.07)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 32,
          fontSize: '0.85rem', color: 'var(--cream)', lineHeight: 1.6,
        }}>
          📅 Verifique seu e-mail para o ingresso e instruções de acesso.
        </div>
      </div>
    </main>
  )
}
