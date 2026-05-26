'use client'

import { useState } from 'react'

const DAY_FULL: Record<string, string> = {
  quinta: 'Quinta-feira, 25/06',
  sexta:  'Sexta-feira, 26/06',
  sabado: 'Sábado, 27/06',
}

function parseDays(priceTier: string): string[] {
  if (!priceTier.startsWith('maringa_days:')) return []
  return priceTier.replace('maringa_days:', '').split(',').filter(Boolean)
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

export default function QrDownloadButton({
  qrDataUrl,
  name,
  priceTier,
}: {
  qrDataUrl: string
  name: string
  priceTier: string
}) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = () => {
    setDownloading(true)

    const SCALE = 2          // retina
    const W = 440, H = 600
    const canvas = document.createElement('canvas')
    canvas.width  = W * SCALE
    canvas.height = H * SCALE
    const ctx = canvas.getContext('2d')!
    ctx.scale(SCALE, SCALE)

    const days = parseDays(priceTier)
    const daysText = days.length > 0
      ? days.map(d => DAY_FULL[d] ?? d).join('  ·  ')
      : 'Todos os dias do evento'
    const firstName = name.split(' ')[0]

    // ── fundo ────────────────────────────────────
    ctx.fillStyle = '#080612'
    ctx.fillRect(0, 0, W, H)

    // borda sutil
    ctx.strokeStyle = 'rgba(124,58,237,0.35)'
    ctx.lineWidth = 1.5
    rrect(ctx, 1, 1, W - 2, H - 2, 16)
    ctx.stroke()

    // ── header roxo ──────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0, '#7c3aed')
    grad.addColorStop(1, '#9333ea')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, 90)

    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '500 10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('IGREJA BATISTA SIÃO  ·  MARINGÁ', W / 2, 28)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 27px Arial'
    ctx.fillText('LightHouse 2026', W / 2, 62)

    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = '12px Arial'
    ctx.fillText('Conferência de Jovens', W / 2, 80)

    // ── nome ─────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = '10px Arial'
    ctx.fillText('INSCRIÇÃO CONFIRMADA', W / 2, 118)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px Arial'
    ctx.fillText(name, W / 2, 142)

    // ── dias ─────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '10px Arial'
    ctx.fillText('INGRESSO PARA', W / 2, 167)

    ctx.fillStyle = '#e9d5ff'
    ctx.font = 'bold 14px Arial'
    ctx.fillText(daysText, W / 2, 187)

    // separador
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(40, 202); ctx.lineTo(W - 40, 202); ctx.stroke()

    // ── QR Code ───────────────────────────────────
    const img = new Image()
    img.onload = () => {
      const qrSize = 220
      const qrX    = W / 2 - qrSize / 2
      const qrY    = 214

      ctx.fillStyle = '#ffffff'
      rrect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14)
      ctx.fill()

      ctx.drawImage(img, qrX, qrY, qrSize, qrSize)

      // separador
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(40, 454); ctx.lineTo(W - 40, 454); ctx.stroke()

      // ── check-in ──────────────────────────────
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('PONTO DE CHECK-IN', W / 2, 475)

      ctx.fillStyle = '#c084fc'
      ctx.font = 'bold 26px Arial'
      ctx.fillText(`Fila 02`, W / 2, 510)

      // ── rodapé ────────────────────────────────
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, 535); ctx.lineTo(W, 535); ctx.stroke()

      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '10px Arial'
      ctx.fillText('Igreja Batista Sião · Maringá, PR · 2026', W / 2, 553)
      ctx.fillText('inscricoes.batistasiao.org.br', W / 2, 570)

      // ── download ──────────────────────────────
      const link = document.createElement('a')
      link.download = `ingresso-lighthouse-2026-${firstName.toLowerCase()}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
      setDownloading(false)
    }
    img.onerror = () => setDownloading(false)
    img.src = qrDataUrl
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      style={{
        width: '100%',
        padding: '14px 24px',
        borderRadius: 100,
        border: '1px solid rgba(192,132,252,0.35)',
        background: downloading ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.14)',
        color: '#c084fc',
        fontFamily: 'Outfit, sans-serif',
        fontSize: '0.92rem',
        fontWeight: 700,
        cursor: downloading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        marginBottom: 12,
      }}
    >
      {downloading ? 'Gerando imagem...' : '↓ Baixar ingresso'}
    </button>
  )
}
