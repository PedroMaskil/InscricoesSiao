'use client'

import { useState } from 'react'

type CaravanOption = {
  id:          string
  city:        string
  church:      string
  leader:      string
  leaderPhone: string
  peopleCount: number
}

type Step = 'phone' | 'choose' | 'form'

function formatPhone(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15)
}

export default function AdicionarPage() {
  const [step,     setStep]     = useState<Step>('phone')
  const [phone,    setPhone]    = useState('')
  const [caravans, setCaravans] = useState<CaravanOption[]>([])
  const [selected, setSelected] = useState<CaravanOption | null>(null)
  const [extra,    setExtra]    = useState('')
  const [file,     setFile]     = useState<File | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const searchByPhone = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Digite um telefone válido com DDD.'); return
    }
    setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/caravana/adicionar?phone=${encodeURIComponent(phone)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (json.caravans.length === 1) {
        setSelected(json.caravans[0])
        setStep('form')
      } else {
        setCaravans(json.caravans)
        setStep('choose')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !extra || parseInt(extra) < 1) {
      setError('Informe o número de pessoas a adicionar.'); return
    }
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('caravanId',   selected.id)
      fd.append('peopleCount', extra)
      if (file) fd.append('file', file)

      const res  = await fetch('/api/caravana/adicionar', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      window.location.href = json.url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const extraCount = parseInt(extra) || 0
  const total      = extraCount * 4000

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
    padding: '12px 16px', color: '#fff',
    fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem',
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.45)', marginBottom: 6,
  }

  return (
    <main style={{ minHeight: '100vh', background: '#13101f', fontFamily: 'Outfit, sans-serif', color: '#fff' }}>

      {/* Banner */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden', height: 140 }}>
        <img src="/banner.jpeg" aria-hidden="true" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', filter: 'blur(4px)', transform: 'scale(1.1)', opacity: 0.4,
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,16,31,0.65)' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
            Igreja Batista Sião · Maringá
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
            LightHouse 2026
          </h1>
          <p style={{ color: '#c084fc', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
            Adicionar pessoas à caravana
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── STEP: PHONE ── */}
        {step === 'phone' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
              Identificação
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', textAlign: 'center', marginBottom: 36, lineHeight: 1.6 }}>
              Digite o WhatsApp cadastrado pelo líder da caravana para localizar a inscrição.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>WhatsApp do líder *</label>
                <input
                  type="tel"
                  placeholder="(44) 99999-9999"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  onKeyDown={e => e.key === 'Enter' && searchByPhone()}
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(229,115,115,0.1)', border: '1px solid rgba(229,115,115,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', color: '#e57373' }}>
                  {error}
                </div>
              )}

              <button
                onClick={searchByPhone}
                disabled={loading}
                style={{
                  width: '100%', padding: '16px 24px', borderRadius: 100, border: 'none',
                  background: loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                  color: '#fff', fontFamily: 'Outfit, sans-serif',
                  fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(124,58,237,0.3)',
                  transition: 'all 0.25s ease',
                }}
              >
                {loading ? 'Buscando...' : 'Buscar caravana →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: CHOOSE ── */}
        {step === 'choose' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
              Escolha a caravana
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', textAlign: 'center', marginBottom: 28 }}>
              Encontramos {caravans.length} caravanas para esse número. Selecione a que deseja atualizar.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {caravans.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelected(c); setStep('form') }}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14, padding: '18px 20px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s', fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                >
                  <p style={{ fontWeight: 700, fontSize: '0.97rem', color: '#fff', margin: '0 0 4px' }}>
                    {c.church}
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> — {c.city}</span>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>
                    Líder: {c.leader}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#c084fc', margin: 0 }}>
                    {c.peopleCount} {c.peopleCount === 1 ? 'pessoa' : 'pessoas'} inscritas
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setStep('phone'); setError('') }}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                padding: 0, textDecoration: 'underline',
              }}
            >
              ← Voltar
            </button>
          </div>
        )}

        {/* ── STEP: FORM ── */}
        {step === 'form' && selected && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
              Adicionar pessoas
            </h2>

            {/* Caravana selecionada */}
            <div style={{
              background: 'rgba(124,58,237,0.07)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 14, padding: '16px 20px', marginBottom: 28,
            }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                Caravana selecionada
              </p>
              <p style={{ fontWeight: 700, fontSize: '0.97rem', margin: '0 0 4px' }}>
                {selected.church}
                <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> — {selected.city}</span>
              </p>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Líder: {selected.leader} · {selected.peopleCount} pessoas já inscritas
              </p>
            </div>

            {/* Card de preço */}
            <div style={{
              background: 'rgba(124,58,237,0.07)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 14, padding: '18px 20px', marginBottom: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Valor por pessoa
                  </p>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1, margin: 0 }}>
                    R$ 40,00
                  </p>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', maxWidth: 160, textAlign: 'right', lineHeight: 1.5, margin: 0 }}>
                  Preço único para caravanas
                </p>
              </div>

              {extraCount > 0 && (
                <div style={{
                  marginTop: 14, paddingTop: 14,
                  borderTop: '1px solid rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                    {extraCount} {extraCount === 1 ? 'pessoa' : 'pessoas'} × R$ 40,00
                  </p>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                      Total
                    </p>
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 700, color: '#c084fc', lineHeight: 1, margin: 0 }}>
                      {(total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div>
                  <label style={labelStyle}>Pessoas a adicionar *</label>
                  <input
                    type="number"
                    placeholder="Ex: 5"
                    min="1"
                    value={extra}
                    onChange={e => setExtra(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* PDF upload */}
                <div>
                  <label style={labelStyle}>Lista atualizada de participantes (PDF)</label>
                  <div
                    onClick={() => document.getElementById('file-input-add')?.click()}
                    style={{
                      border: `2px dashed ${file ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 12, padding: '24px 20px',
                      textAlign: 'center', cursor: 'pointer',
                      background: file ? 'rgba(124,58,237,0.05)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      id="file-input-add"
                      type="file"
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                    {file ? (
                      <>
                        <p style={{ fontSize: '1.5rem', margin: '0 0 6px' }}>📄</p>
                        <p style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 500, margin: '0 0 4px' }}>{file.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                          {(file.size / 1024).toFixed(0)} KB · clique para trocar
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: '1.5rem', margin: '0 0 6px' }}>📎</p>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>
                          Clique para anexar o PDF atualizado
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', margin: 0 }}>Máx. 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(229,115,115,0.1)', border: '1px solid rgba(229,115,115,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', color: '#e57373' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '16px 24px', borderRadius: 100, border: 'none',
                    background: loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                    color: '#fff', fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 24px rgba(124,58,237,0.3)',
                    transition: 'all 0.25s ease', marginTop: 8,
                  }}
                >
                  {loading ? 'Aguarde...' : 'Ir para pagamento →'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep(caravans.length > 1 ? 'choose' : 'phone'); setError('') }}
                  style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                    padding: 0, textDecoration: 'underline', textAlign: 'center',
                  }}
                >
                  ← Voltar
                </button>

              </div>
            </form>
          </div>
        )}

      </div>
    </main>
  )
}
