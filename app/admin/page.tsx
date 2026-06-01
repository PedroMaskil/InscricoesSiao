'use client'

import { useEffect, useRef, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import jsQR from 'jsqr'

type Caravan = {
  id: string; city: string; church: string; leader: string
  leaderPhone: string; peopleCount: number; listFileUrl: string | null
  listFileName: string | null; status: string; checkedIn: boolean
  checkedInAt: string | null; createdAt: string
}

type Individual = {
  id: string; name: string; email: string; phone: string; cpf: string
  city: string | null; isMember: boolean; priceTier: string; amount: number
  status: string; checkedIn: boolean; checkedInAt: string | null; createdAt: string
}

const TIER_LABELS: Record<string, string> = {
  outside: 'Fora de Maringá', local: 'Maringá',
  member_1st: 'Membro 1º lote', member_2nd: 'Membro 2º lote', member_final: 'Membro final',
}

const DAY_LABEL: Record<string, string> = { quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado' }

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

export default function AdminPage() {
  const [tab, setTab]             = useState<'caravans' | 'individuals'>('caravans')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [caravans, setCaravans]   = useState<Caravan[]>([])
  const [individuals, setIndividuals] = useState<Individual[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [pdfModal, setPdfModal]   = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<Record<string, 'sending' | 'sent' | 'error'>>({})
  const [bulk, setBulk] = useState<{ status: 'idle' | 'sending' | 'done'; sent: number; errors: number; total: number }>
    ({ status: 'idle', sent: 0, errors: 0, total: 0 })

  const resendEmail = async (id: string) => {
    setEmailStatus(prev => ({ ...prev, [id]: 'sending' }))
    try {
      const res = await fetch('/api/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
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
    const list = individuals
    setBulk({ status: 'sending', sent: 0, errors: 0, total: list.length })
    let sent = 0, errors = 0
    for (const i of list) {
      try {
        const res = await fetch('/api/resend-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: i.id }),
        })
        if (res.ok) sent++ ; else errors++
      } catch {
        errors++
      }
      setBulk(prev => ({ ...prev, sent, errors }))
    }
    setBulk({ status: 'done', sent, errors, total: list.length })
    setTimeout(() => setBulk({ status: 'idle', sent: 0, errors: 0, total: 0 }), 6000)
  }

  // Scanner state
  const [scanning, setScanning]       = useState(false)
  const [scanResult, setScanResult]   = useState<Individual | null>(null)
  const [scanError, setScanError]     = useState<string | null>(null)
  const [checkinDone, setCheckinDone] = useState(false)
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef         = useRef<number | null>(null)
  const individualsRef = useRef<Individual[]>([])
  const processingRef  = useRef(false)

  useEffect(() => { individualsRef.current = individuals }, [individuals])
  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (!scannerOpen) stopScanner() }, [scannerOpen])

  const fetchData = async () => {
    setLoading(true)
    const res  = await fetch('/api/checkin')
    const json = await res.json()
    setCaravans(json.caravans || [])
    setIndividuals(json.individuals || [])
    setLoading(false)
  }

  const toggleCheckin = async (id: string, type: 'caravan' | 'individual') => {
    await fetch('/api/checkin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type }),
    })
    fetchData()
  }

  // ── Scanner ──────────────────────────────────────────────
  const startScanner = async () => {
    setScanResult(null)
    setScanError(null)
    setCheckinDone(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setScanning(true)
        requestAnimationFrame(scanFrame)
      }
    } catch {
      setScanError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
    }
  }

  const stopScanner = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (videoRef.current?.srcObject) {
      ;(videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    processingRef.current = false
    setScanning(false)
    setScanResult(null)
    setCheckinDone(false)
  }

  const scanFrame = () => {
    rafRef.current = requestAnimationFrame(scanFrame)
    if (processingRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(img.data, img.width, img.height)
    if (code) {
      const raw = code.data
      const id  = raw.includes('/checkin/') ? raw.split('/checkin/')[1].split('?')[0] : raw
      const found = individualsRef.current.find(i => i.id === id)
      if (found) {
        processingRef.current = true
        setScanResult(found)
      } else {
        setScanError('QR inválido ou inscrito não encontrado.')
      }
    }
  }

  const confirmCheckin = async () => {
    if (!scanResult) return
    await toggleCheckin(scanResult.id, 'individual')
    setCheckinDone(true)
    setScanResult(null)
    setTimeout(() => {
      setCheckinDone(false)
      setScanError(null)
      processingRef.current = false
    }, 1800)
  }

  const cancelScan = () => {
    setScanResult(null)
    setScanError(null)
    processingRef.current = false
  }

  // ── Filters ──────────────────────────────────────────────
  const filteredCaravans    = caravans.filter(c =>
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.church.toLowerCase().includes(search.toLowerCase()) ||
    c.leader.toLowerCase().includes(search.toLowerCase())
  )
  const filteredIndividuals = individuals.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase()) ||
    i.cpf.includes(search)
  )

  const caravansChecked    = caravans.filter(c => c.checkedIn).length
  const individualsChecked = individuals.filter(i => i.checkedIn).length
  const totalPeople        = caravans.reduce((s, c) => s + c.peopleCount, 0)

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Inscritos Individuais — LightHouse 2026', 14, 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · Total: ${individuals.length} inscritos`, 14, 26)

    autoTable(doc, {
      startY: 32,
      head: [['Nome', 'E-mail', 'Telefone', 'CPF', 'Cidade', 'Valor', 'Check-in']],
      body: individuals.map(i => [
        i.name,
        i.email,
        i.phone,
        i.cpf,
        i.city || '—',
        `R$ ${(i.amount / 100).toFixed(0)}`,
        i.checkedIn ? `✓ ${new Date(i.checkedInAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    })

    doc.save(`inscritos-lighthouse-2026-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#13101f', fontFamily: 'Outfit, sans-serif', color: '#fff' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c084fc', marginBottom: 4 }}>Painel de Check-in</p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700 }}>LightHouse 2026</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={exportPDF} style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10, padding: '8px 18px', color: '#c084fc', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
            ↓ Exportar PDF
          </button>
          <button onClick={fetchData} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 18px', color: '#fff', cursor: 'pointer', fontSize: '0.82rem' }}>
            ↻ Atualizar
          </button>
          <button
            onClick={sendAllEmails}
            disabled={bulk.status === 'sending' || individuals.length === 0}
            style={{
              borderRadius: 10, padding: '8px 18px', fontSize: '0.82rem', fontWeight: 600,
              cursor: (bulk.status === 'sending' || individuals.length === 0) ? 'not-allowed' : 'pointer',
              border: `1px solid ${bulk.status === 'done' ? (bulk.errors > 0 ? 'rgba(248,113,113,0.4)' : 'rgba(79,200,120,0.4)') : 'rgba(192,132,252,0.3)'}`,
              background: bulk.status === 'done'
                ? (bulk.errors > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(79,200,120,0.1)')
                : 'rgba(192,132,252,0.1)',
              color: bulk.status === 'done'
                ? (bulk.errors > 0 ? '#f87171' : '#4fc878')
                : '#c084fc',
              transition: 'all 0.25s',
              minWidth: 160,
            }}
          >
            {bulk.status === 'idle' && `✉ Enviar para todos`}
            {bulk.status === 'sending' && `Enviando ${bulk.sent + bulk.errors}/${bulk.total}…`}
            {bulk.status === 'done' && bulk.errors === 0 && `✓ ${bulk.sent} enviados`}
            {bulk.status === 'done' && bulk.errors > 0  && `✓ ${bulk.sent} · ✗ ${bulk.errors} erros`}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: '24px 28px 0' }}>
        {[
          { label: 'Caravanas',          value: caravans.length,                        sub: `${caravansChecked} fizeram check-in` },
          { label: 'Pessoas em caravana',value: totalPeople,                            sub: 'total registrado' },
          { label: 'Individuais',        value: individuals.length,                     sub: `${individualsChecked} fizeram check-in` },
          { label: 'Total geral',        value: individuals.length + caravans.length,   sub: 'inscrições' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1528', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + Tabs */}
      <div style={{ padding: '24px 28px 0', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" placeholder="Buscar por nome, cidade, CPF..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: '#1a1528', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: '0.88rem', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {(['caravans', 'individuals'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 20px', borderRadius: 100, border: 'none', cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif', fontSize: '0.82rem', fontWeight: 600,
              background: tab === t ? 'linear-gradient(135deg, #7c3aed, #7b5ea7)' : 'rgba(255,255,255,0.06)',
              color: '#fff', transition: 'all 0.2s',
            }}>
              {t === 'caravans' ? `Caravanas (${caravans.length})` : `Individuais (${individuals.length})`}
            </button>
          ))}
          <button onClick={() => { setScannerOpen(true); startScanner() }} style={{
            padding: '9px 20px', borderRadius: 100, border: 'none', cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif', fontSize: '0.82rem', fontWeight: 600,
            background: 'rgba(255,255,255,0.06)', color: '#fff',
          }}>
            📷 Ler QrCode
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 28px 60px' }}>
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '60px 0' }}>Carregando...</p>

        ) : tab === 'caravans' ? (

          /* ── CARAVANAS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredCaravans.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}>Nenhuma caravana encontrada.</p>}
            {filteredCaravans.map(c => (
              <div key={c.id} style={{
                background: c.checkedIn ? 'rgba(79,200,120,0.06)' : '#111',
                border: `1px solid ${c.checkedIn ? 'rgba(79,200,120,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 14, padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                transition: 'all 0.2s',
              }}>
                <button onClick={() => toggleCheckin(c.id, 'caravan')} style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
                  background: c.checkedIn ? '#4fc878' : 'rgba(255,255,255,0.08)',
                  color: c.checkedIn ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {c.checkedIn ? '✓' : '○'}
                </button>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 3 }}>
                    {c.church} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>— {c.city}</span>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                    Líder: {c.leader} · {c.leaderPhone}
                  </p>
                  {c.checkedIn && c.checkedInAt && (
                    <p style={{ fontSize: '0.72rem', color: '#4fc878', marginTop: 3 }}>
                      ✓ Check-in às {new Date(c.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                <div style={{ textAlign: 'center', padding: '8px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>{c.peopleCount}</p>
                  <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>pessoas</p>
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
            ))}
          </div>

        ) : (

          /* ── INDIVIDUAIS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredIndividuals.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}>Nenhum inscrito encontrado.</p>}
            {filteredIndividuals.map(i => (
              <div key={i.id} style={{
                background: i.checkedIn ? 'rgba(79,200,120,0.06)' : '#111',
                border: `1px solid ${i.checkedIn ? 'rgba(79,200,120,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                transition: 'all 0.2s',
              }}>
                {/* Botão check-in */}
                <button onClick={() => toggleCheckin(i.id, 'individual')} style={{
                  width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0, marginTop: 2,
                  background: i.checkedIn ? '#4fc878' : 'rgba(255,255,255,0.08)',
                  color: i.checkedIn ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i.checkedIn ? '✓' : '○'}
                </button>

                {/* Conteúdo */}
                <div style={{ flex: 1, minWidth: 0 }}>

                  {/* Linha 1: nome + preço + botão e-mail */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {i.name}
                    </p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ background: 'rgba(79,200,120,0.12)', borderRadius: 100, padding: '2px 10px', fontSize: '0.78rem', color: '#4fc878', fontWeight: 700 }}>
                        R$ {(i.amount / 100).toFixed(0)}
                      </span>
                      <button
                        onClick={() => resendEmail(i.id)}
                        disabled={!!emailStatus[i.id]}
                        title="Reenviar e-mail com QR Code"
                        style={{
                          width: 30, height: 30, borderRadius: 8, border: 'none',
                          cursor: emailStatus[i.id] ? 'default' : 'pointer',
                          fontSize: '0.8rem', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                          background: emailStatus[i.id] === 'sent'
                            ? 'rgba(79,200,120,0.15)'
                            : emailStatus[i.id] === 'error'
                              ? 'rgba(248,113,113,0.15)'
                              : emailStatus[i.id] === 'sending'
                                ? 'rgba(255,255,255,0.04)'
                                : 'rgba(192,132,252,0.1)',
                          color: emailStatus[i.id] === 'sent'
                            ? '#4fc878'
                            : emailStatus[i.id] === 'error'
                              ? '#f87171'
                              : '#c084fc',
                        }}
                      >
                        {emailStatus[i.id] === 'sending' ? '…'
                          : emailStatus[i.id] === 'sent'  ? '✓'
                          : emailStatus[i.id] === 'error' ? '✗'
                          : '✉'}
                      </button>
                    </div>
                  </div>

                  {/* Linha 2: email · telefone */}
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginBottom: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i.email} · {i.phone}
                  </p>

                  {/* Linha 3: dias ou tier + check-in time */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {parseDays(i.priceTier).length > 0
                      ? parseDays(i.priceTier).map(d => (
                          <span key={d} style={{ background: 'rgba(192,132,252,0.13)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: '0.73rem', color: '#e9d5ff', fontWeight: 700 }}>
                            {DAY_LABEL[d] ?? d}
                          </span>
                        ))
                      : (
                          <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.38)' }}>
                            {getTierLabel(i.priceTier)}
                          </span>
                        )
                    }
                    {i.isMember && (
                      <span style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 6, padding: '3px 10px', fontSize: '0.73rem', color: '#c084fc', fontWeight: 600 }}>
                        Membro
                      </span>
                    )}
                    {i.checkedIn && i.checkedInAt && (
                      <span style={{ fontSize: '0.72rem', color: '#4fc878', fontWeight: 600 }}>
                        ✓ {new Date(i.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scanner Modal fullscreen */}
      {scannerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#13101f', display: 'flex', flexDirection: 'column', fontFamily: 'Outfit, sans-serif' }}>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Topo */}
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c084fc', fontWeight: 600 }}>Ler QR Code</p>
            <button
              onClick={() => { stopScanner(); setScannerOpen(false) }}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif' }}
            >
              ✕ Fechar
            </button>
          </div>

          {/* Área da câmera */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
            <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} />

            {!scanning && (
              <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                <p style={{ fontSize: '4rem', marginBottom: 12 }}>📷</p>
                <p>Iniciando câmera...</p>
              </div>
            )}

            {/* Mira */}
            {scanning && !scanResult && !checkinDone && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '60%', maxWidth: 280, aspectRatio: '1', border: '2px solid #c084fc', borderRadius: 20, boxShadow: '0 0 0 9999px rgba(19,16,31,0.55)' }} />
              </div>
            )}

            {/* Overlay — check-in confirmado */}
            {checkinDone && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,16,31,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(79,200,120,0.15)', border: '2px solid rgba(79,200,120,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', color: '#4fc878' }}>✓</div>
                <p style={{ color: '#4fc878', fontWeight: 700, fontSize: '1.3rem' }}>Check-in confirmado!</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Continuando em instantes...</p>
              </div>
            )}

            {/* Overlay — inscrito encontrado */}
            {scanResult && !checkinDone && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(19,16,31,0.98) 75%, transparent)', padding: '40px 24px 32px' }}>
                <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Inscrito encontrado</p>
                <p style={{ fontWeight: 700, fontSize: '1.4rem', marginBottom: 8, color: '#fff' }}>{scanResult.name}</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 100, padding: '4px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {getTierLabel(scanResult.priceTier)}
                  </span>
                  <span style={{ background: 'rgba(79,200,120,0.12)', borderRadius: 100, padding: '4px 12px', fontSize: '0.75rem', color: '#4fc878', fontWeight: 600 }}>
                    R$ {(scanResult.amount / 100).toFixed(0)}
                  </span>
                  {scanResult.checkedIn && (
                    <span style={{ background: 'rgba(251,191,36,0.12)', borderRadius: 100, padding: '4px 12px', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                      Já fez check-in
                    </span>
                  )}
                </div>

                {parseDays(scanResult.priceTier).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>Dias comprados</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {parseDays(scanResult.priceTier).map(d => (
                        <span key={d} style={{
                          background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.4)',
                          borderRadius: 8, padding: '6px 14px', fontSize: '0.85rem', color: '#e9d5ff', fontWeight: 700,
                        }}>
                          {DAY_LABEL[d] ?? d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={cancelScan} style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem' }}>
                    Cancelar
                  </button>
                  <button onClick={confirmCheckin} style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: scanResult.checkedIn ? 'rgba(251,191,36,0.25)' : 'linear-gradient(135deg,#7c3aed,#9333ea)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'Outfit, sans-serif', fontSize: '1rem' }}>
                    {scanResult.checkedIn ? 'Confirmar mesmo assim' : '✓ Confirmar Check-in'}
                  </button>
                </div>
              </div>
            )}

            {/* Erro */}
            {scanError && !scanResult && (
              <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
                <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{scanError}</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                <button onClick={() => setPdfModal(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
              </div>
            </div>
            <iframe src={pdfModal} style={{ flex: 1, border: 'none', width: '100%' }} />
          </div>
        </div>
      )}
    </main>
  )
}
