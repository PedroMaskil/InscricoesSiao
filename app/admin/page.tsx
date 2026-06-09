'use client'

import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Caravan = {
  id: string; city: string; church: string; leader: string
  leaderPhone: string; leaderEmail: string; peopleCount: number
  listFileUrl: string | null; listFileName: string | null
  status: string; checkedIn: boolean; checkedInAt: string | null
  amount: number; paidAt: string | null; createdAt: string
}

type Individual = {
  id: string; name: string; email: string; phone: string; cpf: string
  city: string | null; isMember: boolean; priceTier: string; amount: number
  status: string; paidAt: string | null; checkedIn: boolean; checkedInAt: string | null; createdAt: string
}

const DAY_LABEL: Record<string, string> = { quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado', quinta_sexta: 'Qui + Sex' }

const TIER_LABELS: Record<string, string> = {
  outside: 'Fora de Maringá', local: 'Maringá',
  member_1st: 'Membro 1º lote', member_2nd: 'Membro 2º lote', member_final: 'Membro final',
}

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function InscritsPage() {
  const [tab, setTab]     = useState<'individuals' | 'caravans'>('individuals')
  const [caravans, setCaravans]   = useState<Caravan[]>([])
  const [individuals, setIndividuals] = useState<Individual[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [pdfModal, setPdfModal]   = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<Record<string, 'sending' | 'sent' | 'error'>>({})
  const [bulk, setBulk] = useState<{ status: 'idle' | 'sending' | 'done'; sent: number; errors: number; total: number }>
    ({ status: 'idle', sent: 0, errors: 0, total: 0 })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const res  = await fetch('/api/checkin')
    const json = await res.json()
    setCaravans(json.caravans || [])
    setIndividuals(json.individuals || [])
    setLoading(false)
  }

  const resendEmail = async (id: string) => {
    setEmailStatus(prev => ({ ...prev, [id]: 'sending' }))
    try {
      const res  = await fetch('/api/resend-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setEmailStatus(prev => ({ ...prev, [id]: 'sent' }))
    } catch {
      setEmailStatus(prev => ({ ...prev, [id]: 'error' }))
    } finally {
      setTimeout(() => setEmailStatus(prev => { const n = { ...prev }; delete n[id]; return n }), 3000)
    }
  }

  const sendAllEmails = async () => {
    if (bulk.status === 'sending') return
    setBulk({ status: 'sending', sent: 0, errors: 0, total: individuals.length })
    let sent = 0, errors = 0
    for (const i of individuals) {
      try {
        const res = await fetch('/api/resend-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: i.id }) })
        if (res.ok) sent++; else errors++
      } catch { errors++ }
      setBulk(prev => ({ ...prev, sent, errors }))
    }
    setBulk({ status: 'done', sent, errors, total: individuals.length })
    setTimeout(() => setBulk({ status: 'idle', sent: 0, errors: 0, total: 0 }), 6000)
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    const gerado = `Gerado em ${new Date().toLocaleString('pt-BR')}`

    // ── Capa / título ──
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(124, 58, 237)
    doc.text('LightHouse 2026 — Lista de Inscritos', 14, 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(gerado, 14, 25)

    // ── Resumo ──
    const confirmedCar = caravans.filter(c => c.status === 'confirmed')
    const totalArr = individuals.reduce((s, i) => s + i.amount, 0) + confirmedCar.reduce((s, c) => s + c.amount, 0)
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.text(
      `Individuais: ${individuals.length}   |   Caravanas confirmadas: ${confirmedCar.length}   |   Total arrecadado: ${fmtCurrency(totalArr)}`,
      14, 31,
    )

    // ── Seção Individuais ──
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(124, 58, 237)
    doc.text(`Inscritos Individuais (${individuals.length})`, 14, 41)

    autoTable(doc, {
      startY: 45,
      head: [['Nome', 'E-mail', 'Telefone', 'CPF', 'Cidade', 'Tier / Dias', 'Valor', 'Inscrição', 'Check-in']],
      body: individuals.map(i => [
        i.name,
        i.email,
        i.phone,
        i.cpf,
        i.city || '—',
        getTierLabel(i.priceTier),
        `R$ ${(i.amount / 100).toFixed(0)}`,
        fmtDate(i.createdAt),
        i.checkedIn
          ? `✓ ${new Date(i.checkedInAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          : '—',
      ]),
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    })

    // ── Seção Caravanas ──
    const afterIndividuals = (doc as any).lastAutoTable.finalY + 12
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(124, 58, 237)
    doc.text(`Caravanas (${caravans.length})`, 14, afterIndividuals)

    autoTable(doc, {
      startY: afterIndividuals + 4,
      head: [['Igreja', 'Cidade', 'Líder', 'Telefone', 'E-mail líder', 'Pessoas', 'Valor', 'Status', 'Check-in']],
      body: caravans.map(c => [
        c.church,
        c.city,
        c.leader,
        c.leaderPhone,
        c.leaderEmail || '—',
        c.peopleCount,
        c.amount > 0 ? `R$ ${(c.amount / 100).toFixed(0)}` : '—',
        c.status === 'confirmed' ? 'Confirmada' : 'Pendente',
        c.checkedIn
          ? `✓ ${new Date(c.checkedInAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          : '—',
      ]),
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 20, 60], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    })

    doc.save(`inscritos-lighthouse-2026-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // Stats
  const confirmedCaravans  = caravans.filter(c => c.status === 'confirmed')
  const totalCaravanPeople = caravans.reduce((s, c) => s + c.peopleCount, 0)
  const confirmedCaravanPeople = confirmedCaravans.reduce((s, c) => s + c.peopleCount, 0)
  const totalArrecadado    =
    individuals.reduce((s, i) => s + i.amount, 0) +
    confirmedCaravans.reduce((s, c) => s + c.amount, 0)

  const filteredCaravans = caravans.filter(c =>
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.church.toLowerCase().includes(search.toLowerCase()) ||
    c.leader.toLowerCase().includes(search.toLowerCase()) ||
    (c.leaderEmail || '').toLowerCase().includes(search.toLowerCase())
  )
  const filteredIndividuals = individuals.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase()) ||
    i.cpf.includes(search) ||
    i.phone.includes(search)
  )

  const btnBase: React.CSSProperties = {
    borderRadius: 10, padding: '8px 18px', fontSize: '0.82rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Outfit, sans-serif', border: 'none',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#13101f', fontFamily: 'Outfit, sans-serif', color: '#fff' }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c084fc', marginBottom: 4 }}>Painel Administrativo</p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700 }}>Inscritos - LightHouse 2026</h1>
        </div>
        <div className="admin-header-actions">
          <button onClick={exportPDF} style={{ ...btnBase, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c084fc' } as React.CSSProperties}>
            ↓ Exportar PDF
          </button>
          <button onClick={fetchData} style={{ ...btnBase, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } as React.CSSProperties}>
            ↻ Atualizar
          </button>
          <button
            className="send-all-btn"
            onClick={sendAllEmails}
            disabled={bulk.status === 'sending' || individuals.length === 0}
            style={{
              ...btnBase,
              cursor: (bulk.status === 'sending' || individuals.length === 0) ? 'not-allowed' : 'pointer',
              border: `1px solid ${bulk.status === 'done' ? (bulk.errors > 0 ? 'rgba(248,113,113,0.4)' : 'rgba(79,200,120,0.4)') : 'rgba(192,132,252,0.3)'}`,
              background: bulk.status === 'done' ? (bulk.errors > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(79,200,120,0.1)') : 'rgba(192,132,252,0.1)',
              color: bulk.status === 'done' ? (bulk.errors > 0 ? '#f87171' : '#4fc878') : '#c084fc',
            } as React.CSSProperties}
          >
            {bulk.status === 'idle'    && '✉ Re-enviar todos os Qr-Codes nos e-mails'}
            {bulk.status === 'sending' && `Enviando ${bulk.sent + bulk.errors}/${bulk.total}…`}
            {bulk.status === 'done' && bulk.errors === 0 && `✓ ${bulk.sent} enviados`}
            {bulk.status === 'done' && bulk.errors > 0  && `✓ ${bulk.sent} · ✗ ${bulk.errors} erros`}
          </button>

          <a href="/admin/pendentes" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 10, padding: '9px 20px',
            color: '#fbbf24', textDecoration: 'none',
            fontSize: '0.88rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif',
          }}>
            ⏳ Pendentes
          </a>
          <a href="/admin/checkin" className="checkin-btn" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
            borderRadius: 10, padding: '9px 20px',
            color: '#fff', textDecoration: 'none',
            fontSize: '0.88rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif',
            boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          }}>
            Tela de Check-in →
          </a>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: '24px 28px 0' }}>
        {[
          { label: 'Individuais confirmados', value: individuals.length,       sub: 'inscrições pagas' },
          { label: 'Caravanas confirmadas',   value: confirmedCaravans.length, sub: `${confirmedCaravanPeople} pessoas confirmadas` },
          { label: 'Total de pessoas',        value: individuals.length + totalCaravanPeople, sub: 'individuais + caravanas' },
          { label: 'Total arrecadado',        value: fmtCurrency(totalArrecadado), sub: 'individuais + caravanas' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1528', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: typeof s.value === 'string' ? '1.5rem' : '2rem', fontWeight: 700, lineHeight: 1, marginBottom: 4, color: typeof s.value === 'string' ? '#c084fc' : '#fff' }}>{s.value}</p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Search + Tabs ── */}
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
              background: tab === t ? 'linear-gradient(135deg, #7c3aed, #7b5ea7)' : 'rgba(255,255,255,0.06)',
              color: '#fff', transition: 'all 0.2s',
            }}>
              {t === 'individuals' ? `Individuais (${individuals.length})` : `Caravanas (${caravans.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '20px 28px 60px' }}>
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '60px 0' }}>Carregando...</p>

        ) : tab === 'individuals' ? (

          /* ── INDIVIDUAIS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredIndividuals.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}>Nenhum inscrito encontrado.</p>
            )}
            {filteredIndividuals.map(i => (
              <div key={i.id} style={{
                background: '#111', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: '14px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                {/* Indicador check-in */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 8,
                  background: i.checkedIn ? '#4fc878' : 'rgba(255,255,255,0.15)',
                }} />

                {/* Dados principais */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Linha 1: nome + valor + email btn */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.97rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{i.name}</p>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, borderRadius: 100, padding: '2px 10px', background: 'rgba(79,200,120,0.12)', color: '#4fc878', border: '1px solid rgba(79,200,120,0.3)', flexShrink: 0 }}>
                      Pago
                    </span>
                    <span style={{ background: 'rgba(79,200,120,0.12)', borderRadius: 100, padding: '3px 12px', fontSize: '0.82rem', color: '#4fc878', fontWeight: 700, flexShrink: 0 }}>
                      {fmtCurrency(i.amount)}
                    </span>
                    <button
                      onClick={() => resendEmail(i.id)}
                      disabled={!!emailStatus[i.id]}
                      title="Reenviar e-mail com QR Code"
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none', flexShrink: 0,
                        cursor: emailStatus[i.id] ? 'default' : 'pointer',
                        fontSize: '0.82rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', fontFamily: 'Outfit, sans-serif',
                        background: emailStatus[i.id] === 'sent' ? 'rgba(79,200,120,0.15)' : emailStatus[i.id] === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(192,132,252,0.1)',
                        color: emailStatus[i.id] === 'sent' ? '#4fc878' : emailStatus[i.id] === 'error' ? '#f87171' : '#c084fc',
                      }}
                    >
                      {emailStatus[i.id] === 'sending' ? '…' : emailStatus[i.id] === 'sent' ? '✓' : emailStatus[i.id] === 'error' ? '✗' : '✉'}
                    </button>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>CPF: {i.cpf}</p>

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
                    {i.isMember && (
                      <span style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 6, padding: '2px 9px', fontSize: '0.72rem', color: '#c084fc', fontWeight: 600 }}>
                        Membro
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginLeft: 2 }}>
                      Inscrito em {fmtDate(i.createdAt)}
                    </span>
                    {i.paidAt && (
                      <span style={{ fontSize: '0.7rem', color: 'rgba(79,200,120,0.6)' }}>
                        · Pago em {fmtDate(i.paidAt)}
                      </span>
                    )}
                    {i.checkedIn && i.checkedInAt && (
                      <span style={{ fontSize: '0.72rem', color: '#4fc878', fontWeight: 600 }}>
                        · Check-in {new Date(i.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        ) : (

          /* ── CARAVANAS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredCaravans.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}>Nenhuma caravana encontrada.</p>
            )}
            {filteredCaravans.map(c => {
              const confirmed = c.status === 'confirmed'
              return (
                <div key={c.id} style={{
                  background: '#111', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '18px 20px',
                  display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
                }}>
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 8,
                    background: confirmed ? '#4fc878' : '#fbbf24',
                  }} />

                  {/* Dados da caravana */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.97rem' }}>
                        {c.church} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>— {c.city}</span>
                      </p>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600, borderRadius: 100, padding: '2px 10px',
                        background: confirmed ? 'rgba(79,200,120,0.12)' : 'rgba(251,191,36,0.12)',
                        color: confirmed ? '#4fc878' : '#fbbf24',
                        border: `1px solid ${confirmed ? 'rgba(79,200,120,0.3)' : 'rgba(251,191,36,0.3)'}`,
                      }}>
                        {confirmed ? 'Pago' : 'Pendente'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                      Líder: {c.leader} · {c.leaderPhone}
                      {c.leaderEmail ? ` · ${c.leaderEmail}` : ''}
                    </p>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                        Inscrita em {fmtDate(c.createdAt)}
                      </span>
                      {c.paidAt && (
                        <span style={{ fontSize: '0.72rem', color: '#4fc878' }}>
                          · Pago em {fmtDate(c.paidAt)}
                        </span>
                      )}
                      {c.checkedIn && c.checkedInAt && (
                        <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 600 }}>
                          · Check-in {new Date(c.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pessoas + valor */}
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{c.peopleCount}</p>
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>pessoas</p>
                    </div>
                    {c.amount > 0 && (
                      <div style={{ textAlign: 'center', padding: '8px 14px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10 }}>
                        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1, color: '#c084fc' }}>{fmtCurrency(c.amount)}</p>
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>valor</p>
                      </div>
                    )}
                  </div>

                  {c.listFileUrl && (
                    <button onClick={() => setPdfModal(c.listFileUrl!)} style={{
                      background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)',
                      borderRadius: 10, padding: '8px 14px', color: '#c084fc',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                      fontFamily: 'Outfit, sans-serif',
                    }}>
                      📄 Ver lista
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* PDF Modal */}
      {pdfModal && (
        <div
          onClick={() => setPdfModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 800, height: '80vh', background: '#1a1528', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Lista de participantes</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href={pdfModal} target="_blank" rel="noreferrer" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: '6px 14px', color: '#c084fc', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 600 }}>
                  ↗ Abrir em nova aba
                </a>
                <button onClick={() => setPdfModal(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif' }}>✕</button>
              </div>
            </div>
            <iframe src={pdfModal} style={{ flex: 1, border: 'none', width: '100%' }} />
          </div>
        </div>
      )}
    </main>
  )
}
