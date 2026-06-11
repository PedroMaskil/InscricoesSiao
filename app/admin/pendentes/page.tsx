'use client'

import { useEffect, useState } from 'react'

type PendingCaravan = {
  id: string; city: string; church: string; leader: string
  leaderPhone: string; leaderEmail: string | null; peopleCount: number
  amount: number; createdAt: string
}

type PendingIndividual = {
  id: string; name: string; email: string; phone: string; cpf: string
  city: string | null; isOtherMember: boolean; otherChurch: string | null
  source: string | null; priceTier: string; amount: number; createdAt: string
}

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram', indicacao: 'Indicação', whatsapp: 'WhatsApp', outro: 'Outro',
}

const TIER_LABELS: Record<string, string> = {
  outside: 'Fora de Maringá', local: 'Maringá',
  member_1st: 'Membro 1º lote', member_2nd: 'Membro 2º lote', member_final: 'Membro final',
}

const DAY_LABEL: Record<string, string> = { quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado', quinta_sexta: 'Qui + Sex' }

function parseDays(priceTier: string): string[] {
  if (!priceTier.startsWith('maringa_days:')) return []
  return priceTier.replace('maringa_days:', '').split(',').filter(Boolean)
}

function getTierLabel(priceTier: string): string {
  if (priceTier.startsWith('maringa_days')) {
    const days = parseDays(priceTier)
    return days.length > 0 ? `Maringá — ${days.map(d => DAY_LABEL[d] ?? d).join(' + ')}` : 'Maringá'
  }
  return TIER_LABELS[priceTier] ?? priceTier
}

function fmtCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(min / 60)
  const d    = Math.floor(h / 24)
  if (d > 0)  return `há ${d} dia${d > 1 ? 's' : ''}`
  if (h > 0)  return `há ${h}h`
  if (min > 0) return `há ${min}min`
  return 'agora'
}

type DeleteTarget = { id: string; type: 'individual' | 'caravan'; label: string }

export default function PendentesPage() {
  const [tab, setTab]           = useState<'individuals' | 'caravans'>('individuals')
  const [caravans, setCaravans] = useState<PendingCaravan[]>([])
  const [individuals, setIndividuals] = useState<PendingIndividual[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const res  = await fetch('/api/pendentes')
    const json = await res.json()
    setCaravans(json.caravans || [])
    setIndividuals(json.individuals || [])
    setLoading(false)
  }

  const openDelete = (id: string, type: 'individual' | 'caravan', label: string) => {
    setDeleteTarget({ id, type, label })
    setDeleteConfirm('')
    setDeleteError('')
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleteConfirm !== 'EXCLUIR') return
    setDeleting(true)
    setDeleteError('')
    try {
      const res  = await fetch('/api/pendentes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id, type: deleteTarget.type }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDeleteTarget(null)
      await fetchData()
    } catch (err: any) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const filteredCaravans = caravans.filter(c =>
    c.church.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.leader.toLowerCase().includes(search.toLowerCase()) ||
    (c.leaderEmail || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredIndividuals = individuals.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase()) ||
    i.cpf.includes(search) ||
    i.phone.includes(search)
  )

  const totalPendingValue =
    individuals.reduce((s, i) => s + i.amount, 0) +
    caravans.reduce((s, c) => s + c.amount, 0)

  return (
    <main style={{ minHeight: '100vh', background: '#13101f', fontFamily: 'Outfit, sans-serif', color: '#fff' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500 }}>
            ← Inscritos
          </a>
          <div>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: 2 }}>Painel Administrativo</p>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700 }}>Pagamentos Pendentes</h1>
          </div>
        </div>
        <button onClick={fetchData} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 18px', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'Outfit, sans-serif' }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: '24px 28px 0' }}>
        {[
          { label: 'Individuais pendentes',  value: individuals.length,  sub: 'não finalizaram o pagamento' },
          { label: 'Caravanas pendentes',    value: caravans.length,     sub: 'aguardando pagamento' },
          { label: 'Valor em aberto',        value: fmtCurrency(totalPendingValue), sub: 'se todos pagassem' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1528', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: typeof s.value === 'string' ? '1.5rem' : '2rem', fontWeight: 700, lineHeight: 1, marginBottom: 4, color: typeof s.value === 'string' ? '#fbbf24' : '#fff' }}>{s.value}</p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + Tabs */}
      <div style={{ padding: '24px 28px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text" placeholder="Buscar por nome, e-mail, CPF, telefone..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: '#1a1528', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
        />
        <div className="tabs-row">
          {(['individuals', 'caravans'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 20px', borderRadius: 100, border: 'none', cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif', fontSize: '0.82rem', fontWeight: 600,
              background: tab === t ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)',
              color: tab === t ? '#fbbf24' : '#fff',
              outline: tab === t ? '1px solid rgba(251,191,36,0.4)' : 'none',
              transition: 'all 0.2s',
            }}>
              {t === 'individuals' ? `Individuais (${individuals.length})` : `Caravanas (${caravans.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 28px 60px' }}>
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '60px 0' }}>Carregando...</p>

        ) : tab === 'individuals' ? (

          /* ── INDIVIDUAIS PENDENTES ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredIndividuals.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '60px 0' }}>Nenhum pagamento pendente.</p>
            )}
            {filteredIndividuals.map(i => (
              <div key={i.id} style={{
                background: '#111', border: '1px solid rgba(251,191,36,0.12)',
                borderRadius: 14, padding: '14px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 8, background: '#fbbf24' }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.97rem', marginBottom: 1 }}>{i.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>CPF: {i.cpf}</p>
                    </div>
                    <span style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 100, padding: '3px 12px', fontSize: '0.82rem', color: '#fbbf24', fontWeight: 700, flexShrink: 0 }}>
                      {fmtCurrency(i.amount)}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                    {i.email} · {i.phone}{i.city ? ` · ${i.city}` : ''}
                  </p>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {parseDays(i.priceTier).length > 0
                      ? parseDays(i.priceTier).map(d => (
                          <span key={d} style={{ background: 'rgba(192,132,252,0.13)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: 6, padding: '2px 9px', fontSize: '0.72rem', color: '#e9d5ff', fontWeight: 700 }}>
                            {DAY_LABEL[d] ?? d}
                          </span>
                        ))
                      : <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.35)' }}>{getTierLabel(i.priceTier)}</span>
                    }
                    {i.isOtherMember && (
                      <span style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 6, padding: '2px 9px', fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>
                        {i.otherChurch ? `Igreja: ${i.otherChurch}` : 'Outra igreja'}
                      </span>
                    )}
                    {i.source && (
                      <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '2px 9px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                        via {SOURCE_LABELS[i.source] ?? i.source}
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                      · Iniciou {timeAgo(i.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openDelete(i.id, 'individual', i.name)}
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '6px 12px', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', flexShrink: 0 }}
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>

        ) : (

          /* ── CARAVANAS PENDENTES ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredCaravans.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '60px 0' }}>Nenhuma caravana pendente.</p>
            )}
            {filteredCaravans.map(c => (
              <div key={c.id} style={{
                background: '#111', border: '1px solid rgba(251,191,36,0.12)',
                borderRadius: 14, padding: '18px 20px',
                display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 8, background: '#fbbf24' }} />

                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.97rem', marginBottom: 4 }}>
                    {c.church} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>— {c.city}</span>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                    Líder: {c.leader} · {c.leaderPhone}
                    {c.leaderEmail ? ` · ${c.leaderEmail}` : ''}
                  </p>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                    Iniciou {timeAgo(c.createdAt)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{c.peopleCount}</p>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>pessoas</p>
                  </div>
                  {c.amount > 0 && (
                    <div style={{ textAlign: 'center', padding: '8px 14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10 }}>
                      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1, color: '#fbbf24' }}>{fmtCurrency(c.amount)}</p>
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>em aberto</p>
                    </div>
                  )}
                  <button
                    onClick={() => openDelete(c.id, 'caravan', `${c.church} — ${c.city}`)}
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '6px 12px', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', flexShrink: 0 }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ── Modal de exclusão ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1a1528', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 16, padding: '32px 28px', maxWidth: 440, width: '100%' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: 20 }}>
              ⚠
            </div>

            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>
              Excluir registro?
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', marginBottom: 6, lineHeight: 1.6 }}>
              Você está prestes a excluir permanentemente:
            </p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171', marginBottom: 20 }}>
              {deleteTarget.label}
            </p>

            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              Para confirmar, digite <strong style={{ color: '#fff' }}>EXCLUIR</strong> abaixo:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="EXCLUIR"
              autoFocus
              style={{
                width: '100%', background: '#13101f', border: `1px solid ${deleteConfirm === 'EXCLUIR' ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8, padding: '10px 14px', color: '#fff',
                fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', outline: 'none',
                boxSizing: 'border-box', marginBottom: 8,
              }}
            />

            {deleteError && (
              <p style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: 12 }}>{deleteError}</p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirm !== 'EXCLUIR' || deleting}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: deleteConfirm === 'EXCLUIR' ? '#dc2626' : 'rgba(220,38,38,0.2)',
                  color: deleteConfirm === 'EXCLUIR' ? '#fff' : 'rgba(255,255,255,0.3)',
                  cursor: deleteConfirm === 'EXCLUIR' && !deleting ? 'pointer' : 'not-allowed',
                  fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', fontWeight: 700,
                  transition: 'all 0.2s',
                }}
              >
                {deleting ? 'Excluindo...' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
