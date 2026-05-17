'use client'

import { useState } from 'react'

function formatPhone(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15)
}

export default function CaravanaPage() {
  const [form, setForm] = useState({
    city: '', church: '', leader: '', leaderPhone: '', peopleCount: '',
  })
  const [file, setFile]         = useState<File | null>(null)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.city || !form.church || !form.leader || !form.leaderPhone || !form.peopleCount) {
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
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <main style={{ minHeight: '100vh', background: '#080612', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', background: '#0f0a1a', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 20, padding: '52px 36px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 20 }}>✦</div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: 12 }}>
          Caravana registrada!
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontSize: '0.9rem' }}>
          Os dados da sua caravana foram recebidos com sucesso.<br />
          Entraremos em contato com o líder responsável em breve.
        </p>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#080612', padding: '0 0 80px', fontFamily: 'Outfit, sans-serif' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#c084fc', marginBottom: 14, fontWeight: 500 }}>
          LightHouse 2026 · 25–27 de Junho
        </p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', fontWeight: 700, color: '#fff', marginBottom: 12, lineHeight: 1.1 }}>
          Inscrição de Caravana
        </h1>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)', margin: '20px auto' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
          Registre sua caravana com os dados do grupo e anexe a lista de participantes em PDF.
        </p>
      </div>

      {/* Form card */}
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ background: '#0f0a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '40px 36px' }}>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Cidade + Igreja */}
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

              {/* Líder */}
              <div>
                <label className="field-label">Líder responsável *</label>
                <input type="text" placeholder="Nome completo do líder"
                  value={form.leader} onChange={e => update('leader', e.target.value)} />
              </div>

              {/* Telefone líder + Qtd pessoas */}
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

              {/* Upload PDF */}
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
                {loading ? 'Enviando...' : 'Registrar caravana →'}
              </button>

            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
