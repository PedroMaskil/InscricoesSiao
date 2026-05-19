'use client'

import { useState } from 'react'
import { CalendarDays, Clock, MapPin, ClipboardList, Phone } from 'lucide-react'

function formatPhone(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15)
}

export default function CaravanaPage() {
  const [form, setForm] = useState({
    city: '', church: '', leader: '', leaderPhone: '', leaderEmail: '', peopleCount: '',
  })
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.city || !form.church || !form.leader || !form.leaderPhone || !form.leaderEmail || !form.peopleCount) {
      setError('Preencha todos os campos obrigatórios.'); return
    }
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('file', file)

      const res  = await fetch('/api/caravana', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      window.location.href = json.url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#080612', fontFamily: 'Outfit, sans-serif' }}>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>

        <img
          src="/banner.jpeg"
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'blur(4px)',
            transform: 'scale(1.12)',
            opacity: 0.55,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,6,18,0.6)' }} />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 0' }}>
          <img
            src="/banner.jpeg"
            alt="LightHouse 2026"
            style={{
              width: '100%', maxWidth: 860,
              height: 'auto', display: 'block',
              borderRadius: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            background: 'linear-gradient(to bottom, transparent, #080612)',
            borderRadius: '0 0 16px 16px',
          }} />
        </div>

        <div style={{ position: 'absolute', top: 28, left: 28, zIndex: 2 }}>
          <p style={{ fontSize: '0.78rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
            Igreja Batista Sião · Maringá
          </p>
        </div>
      </div>

      {/* ── DETALHES DO EVENTO ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 0' }}>

        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: '2.2rem', fontWeight: 900, color: '#fff', marginBottom: 4, letterSpacing: '-0.01em' }}>
            Conferência LightHouse 2026
          </h2>
          <p style={{ color: '#c084fc', fontSize: '0.9rem', fontWeight: 600, marginBottom: 24 }}>
            Inscrição de Caravana
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: <CalendarDays size={17} />, label: 'Data',                value: '25, 26 e 27 de Junho' },
              { icon: <Clock size={17} />,        label: 'Horários',            value: 'Qui/Sex 20h–22h · Sáb 16h–21h' },
              { icon: <MapPin size={17} />,       label: 'Local',               value: 'Igreja Batista Sião, Maringá', address: 'R. Manoel de Macedo, 37 - Zona 7', maps: 'https://maps.google.com/?q=R.+Manoel+de+Macedo,+37,+Zona+7,+Maringá,+PR' },
              { icon: <ClipboardList size={17} />,label: 'Período de Inscrição', value: 'Até 25 de Junho' },
            ].map((item: any) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.95rem' }}>
                <span style={{ color: '#c084fc', flexShrink: 0, display: 'flex', marginTop: 2 }}>{item.icon}</span>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: 4 }}>{item.label}:</span>
                  <span style={{ color: '#fff', fontWeight: 500 }}>{item.value}</span>
                  {item.address && (
                    <div style={{ marginTop: 3 }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>{item.address} · </span>
                      <a href={item.maps} target="_blank" rel="noreferrer"
                        style={{ fontSize: '0.8rem', color: '#c084fc', textDecoration: 'none', fontWeight: 500 }}>
                        Ver no Maps ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contato */}
        <div style={{ marginBottom: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Phone size={15} color="#c084fc" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Dúvidas e suporte:{' '}
            <a href="https://wa.me/5544999605447" target="_blank" rel="noreferrer"
              style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>
              (44) 99960-5447
            </a>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}> — Pedro</span>
          </p>
        </div>
      </div>

      {/* ── FORMULÁRIO ── */}
      <div style={{ background: '#0a0815', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '56px 24px 80px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>

          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, marginBottom: 8, color: '#fff', textAlign: 'center' }}>
            Inscrição de Caravana
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', textAlign: 'center', marginBottom: 36 }}>
            Registre seu grupo e anexe a lista de participantes em PDF
          </p>

          {/* Card de preço */}
          {(() => {
            const count = parseInt(form.peopleCount) || 0
            const total = count * 4000
            return (
              <div style={{
                background: 'rgba(124,58,237,0.07)',
                border: '1px solid rgba(124,58,237,0.25)',
                borderRadius: 14, padding: '18px 20px',
                marginBottom: 32,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Valor por pessoa
                    </p>
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                      R$ 40,00
                    </p>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', maxWidth: 160, textAlign: 'right', lineHeight: 1.5 }}>
                    Preço único para caravanas, independente da cidade de origem
                  </p>
                </div>

                {count > 0 && (
                  <div style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: '1px solid rgba(124,58,237,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
                      {count} {count === 1 ? 'pessoa' : 'pessoas'} × R$ 40,00
                    </p>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                        Total da inscrição
                      </p>
                      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 700, color: '#c084fc', lineHeight: 1 }}>
                        {(total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="field-label">Cidade *</label>
                  <input type="text" placeholder="Ex: Londrina"
                    value={form.city} onChange={e => update('city', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Igreja *</label>
                  <input type="text" placeholder="Nome da igreja"
                    value={form.church} onChange={e => update('church', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="field-label">Líder responsável *</label>
                <input type="text" placeholder="Nome completo do líder"
                  value={form.leader} onChange={e => update('leader', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="field-label">WhatsApp do líder *</label>
                  <input type="tel" placeholder="(44) 99999-9999"
                    value={form.leaderPhone}
                    onChange={e => update('leaderPhone', formatPhone(e.target.value))} />
                </div>
                <div>
                  <label className="field-label">Nº de pessoas *</label>
                  <input type="number" placeholder="Ex: 25" min="1"
                    value={form.peopleCount} onChange={e => update('peopleCount', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="field-label">E-mail do líder *</label>
                <input type="email" placeholder="lider@igreja.com.br"
                  value={form.leaderEmail} onChange={e => update('leaderEmail', e.target.value)} />
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                  Enviaremos a confirmação e o QR code para este e-mail
                </p>
              </div>

              <div>
                <label className="field-label">Lista de participantes (PDF)</label>
                <div
                  onClick={() => document.getElementById('file-input')?.click()}
                  style={{
                    border: `2px dashed ${file ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 12, padding: '24px 20px',
                    textAlign: 'center', cursor: 'pointer',
                    background: file ? 'rgba(124,58,237,0.05)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    id="file-input" type="file" accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <>
                      <p style={{ fontSize: '1.5rem', marginBottom: 6 }}>📄</p>
                      <p style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 500 }}>{file.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                        {(file.size / 1024).toFixed(0)} KB · clique para trocar
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: '1.5rem', marginBottom: 6 }}>📎</p>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                        Clique para anexar o PDF
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                        Máx. 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(229,115,115,0.1)', border: '1px solid rgba(229,115,115,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', color: '#e57373' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '16px 24px', borderRadius: 100, border: 'none',
                background: loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                color: '#fff', fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(124,58,237,0.3)',
                transition: 'all 0.25s ease', marginTop: 8,
              }}>
                {loading ? 'Aguarde...' : 'Ir para pagamento →'}
              </button>

            </div>
          </form>
        </div>
      </div>

    </main>
  )
}
