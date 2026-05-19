'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'

export default function PagarPage() {
  const searchParams  = useSearchParams()
  const caravanId     = searchParams.get('id')
  const brcodeParam   = searchParams.get('brcode')
  const amountParam   = searchParams.get('amount')
  const router        = useRouter()

  const [qrDataUrl, setQrDataUrl]   = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)
  const [status, setStatus]         = useState<'pending' | 'confirmed'>('pending')
  const pollRef                     = useRef<ReturnType<typeof setInterval> | null>(null)

  const brcode = brcodeParam ?? ''
  const amount = amountParam ? parseInt(amountParam) : 0
  const valor  = (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Gera QR Code a partir do brcode
  useEffect(() => {
    if (!brcode) return
    QRCode.toDataURL(brcode, {
      width: 240, margin: 2,
      color: { dark: '#1a0a2e', light: '#ffffff' },
    }).then(setQrDataUrl).catch(console.error)
  }, [brcode])

  // Polling: verifica se pagamento foi confirmado
  useEffect(() => {
    if (!caravanId) return

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/caravana/status?id=${caravanId}`)
        const json = await res.json()
        if (json.status === 'confirmed') {
          setStatus('confirmed')
          clearInterval(pollRef.current!)
          setTimeout(() => router.push(`/caravana/sucesso?caravan_id=${caravanId}`), 1500)
        }
      } catch { /* ignora erros de rede no polling */ }
    }, 3000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [caravanId, router])

  const handleCopy = () => {
    navigator.clipboard.writeText(brcode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (!caravanId || !brcode) {
    return (
      <main style={{
        minHeight: '100vh', background: '#080612', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: 'Outfit, sans-serif',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Link de pagamento inválido.</p>
      </main>
    )
  }

  if (status === 'confirmed') {
    return (
      <main style={{
        minHeight: '100vh', background: '#080612', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: 'Outfit, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(79,200,120,0.12)',
            border: '2px solid rgba(79,200,120,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '2.4rem', color: '#4fc878',
          }}>✓</div>
          <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>
            Pagamento confirmado! Redirecionando...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#080612', fontFamily: 'Outfit, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        maxWidth: 480, width: '100%',
        background: '#0f0a1a', border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 20, padding: '44px 36px', textAlign: 'center',
      }}>
        {/* Header */}
        <p style={{
          fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)', marginBottom: 8,
        }}>
          Igreja Batista Sião · LightHouse 2026
        </p>
        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '1.9rem', fontWeight: 700, color: '#fff', marginBottom: 6,
        }}>
          Pagamento via PIX
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginBottom: 28 }}>
          Escaneie o QR code ou copie o código abaixo para pagar
        </p>

        {/* Valor */}
        <div style={{
          display: 'inline-block',
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 100, padding: '8px 20px',
          marginBottom: 28,
        }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginRight: 8 }}>Total:</span>
          <span style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.4rem', fontWeight: 700, color: '#c084fc',
          }}>{valor}</span>
        </div>

        {/* QR Code */}
        {qrDataUrl ? (
          <div style={{
            display: 'inline-block', background: '#fff',
            borderRadius: 16, padding: 12, marginBottom: 24,
          }}>
            <img src={qrDataUrl} width={220} height={220} alt="PIX QR Code" style={{ display: 'block' }} />
          </div>
        ) : (
          <div style={{
            width: 244, height: 244, background: 'rgba(255,255,255,0.05)',
            borderRadius: 16, margin: '0 auto 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Gerando QR...</p>
          </div>
        )}

        {/* Copia e Cola */}
        <div style={{ marginBottom: 28 }}>
          <p style={{
            fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)', marginBottom: 10,
          }}>
            PIX copia e cola
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px 14px',
            fontFamily: 'monospace', fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.5)',
            wordBreak: 'break-all', lineHeight: 1.5,
            marginBottom: 10, textAlign: 'left',
          }}>
            {brcode.slice(0, 60)}...
          </div>
          <button
            onClick={handleCopy}
            style={{
              width: '100%', padding: '13px 20px',
              borderRadius: 100, border: '1px solid rgba(124,58,237,0.4)',
              background: copied ? 'rgba(79,200,120,0.12)' : 'rgba(124,58,237,0.1)',
              color: copied ? '#4fc878' : '#c084fc',
              fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ Código copiado!' : 'Copiar código PIX'}
          </button>
        </div>

        {/* Instrução de aguardo */}
        <div style={{
          background: 'rgba(201,168,76,0.07)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 12, padding: '14px 18px',
          fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#f59e0b', display: 'inline-block',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            Aguardando confirmação do pagamento...
          </span>
          <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
            Esta página atualiza automaticamente após o pagamento.
          </p>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    </main>
  )
}
