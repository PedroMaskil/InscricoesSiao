'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const TIER_LABELS: Record<string, string> = {
  outside: 'Fora de Maringá', local: 'Maringá',
  member_1st: 'Membro 1º lote', member_2nd: 'Membro 2º lote', member_final: 'Membro final',
}

type Registration = {
  id: string; name: string; email: string; phone: string
  priceTier: string; amount: number; checkedIn: boolean; checkedInAt: string | null
}

export default function CheckinPage() {
  const { id } = useParams() as { id: string }
  const [reg, setReg]       = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [done, setDone]     = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    fetch(`/api/registration/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setReg(data)
        setDone(data.checkedIn)
        setLoading(false)
      })
      .catch(() => { setError('Erro ao carregar inscrição.'); setLoading(false) })
  }, [id])

  const confirm = async () => {
    if (!reg || done) return
    setConfirming(true)
    await fetch('/api/checkin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type: 'individual' }),
    })
    setDone(true)
    setConfirming(false)
  }

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: '#080612', fontFamily: 'Outfit, sans-serif', color: '#fff',
    }}>
      <div style={{
        maxWidth: 440, width: '100%', background: '#0f0a1a',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px 32px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c084fc', marginBottom: 6 }}>
          Check-in · LightHouse 2026
        </p>

        {loading && (
          <p style={{ color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>Carregando...</p>
        )}

        {error && (
          <div style={{ color: '#f87171', padding: '24px 0' }}>
            <p style={{ fontSize: '2rem', marginBottom: 12 }}>✕</p>
            <p>{error}</p>
          </div>
        )}

        {reg && !error && (
          <>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '16px auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem',
              background: done ? 'rgba(79,200,120,0.12)' : 'rgba(124,58,237,0.12)',
              border: `2px solid ${done ? 'rgba(79,200,120,0.4)' : 'rgba(124,58,237,0.3)'}`,
              color: done ? '#4fc878' : '#c084fc',
            }}>
              {done ? '✓' : '○'}
            </div>

            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.7rem', fontWeight: 700, marginBottom: 6 }}>
              {reg.name}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{reg.email}</p>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>{reg.phone}</p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
              <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 100, padding: '4px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {TIER_LABELS[reg.priceTier] || reg.priceTier}
              </span>
              <span style={{ background: 'rgba(79,200,120,0.1)', borderRadius: 100, padding: '4px 12px', fontSize: '0.75rem', color: '#4fc878', fontWeight: 600 }}>
                R$ {(reg.amount / 100).toFixed(0)}
              </span>
            </div>

            {done ? (
              <div style={{ background: 'rgba(79,200,120,0.08)', border: '1px solid rgba(79,200,120,0.25)', borderRadius: 12, padding: '16px 20px' }}>
                <p style={{ color: '#4fc878', fontWeight: 600, fontSize: '1rem' }}>Check-in realizado!</p>
                {reg.checkedInAt && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: 4 }}>
                    {new Date(reg.checkedInAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={confirm}
                disabled={confirming}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                  color: '#fff', fontSize: '1rem', fontWeight: 700,
                  cursor: confirming ? 'not-allowed' : 'pointer', opacity: confirming ? 0.7 : 1,
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                {confirming ? 'Confirmando...' : 'Confirmar Check-in'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  )
}
