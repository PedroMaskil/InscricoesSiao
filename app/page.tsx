'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

// ─── tipos ────────────────────────────────────────────────
type FormData = {
  name: string
  email: string
  phone: string
  cpf: string
  source: string
  isMember: boolean
}

// ─── helpers ──────────────────────────────────────────────
function formatCPF(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

function formatPhone(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15)
}

// ─── preços (altere conforme seu evento) ──────────────────
const PRICE_MEMBER  = 97
const PRICE_GENERAL = 197

// ─── componente principal ─────────────────────────────────
export default function RegistrationPage() {
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { isMember: false } })

  // Formata CPF e telefone em tempo real
  const handleCPF = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValue('cpf', formatCPF(e.target.value))

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValue('phone', formatPhone(e.target.value))

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isMember }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro desconhecido')
      window.location.href = json.url // redireciona para o Stripe
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const price = isMember ? PRICE_MEMBER : PRICE_GENERAL

  return (
    <main style={{ minHeight: '100vh', background: 'var(--dark)', padding: '0 0 80px' }}>

      {/* ── Header ── */}
      <header style={{ textAlign: 'center', padding: '72px 24px 48px' }}>
        <p style={{
          fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'var(--gold)', marginBottom: '16px', fontWeight: 500,
        }}>
          Inscrições Abertas
        </p>
        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(2.2rem, 5vw, 4rem)',
          fontWeight: 700, lineHeight: 1.1, marginBottom: '16px',
        }}>
          Garanta sua<br />
          <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>vaga no evento</span>
        </h1>
        <div style={{
          width: 48, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
          margin: '24px auto',
        }} />
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
          Preencha o formulário abaixo. Membros têm acesso a um valor especial.
        </p>
      </header>

      {/* ── Card ── */}
      <div style={{
        maxWidth: 520, margin: '0 auto', padding: '0 20px',
      }}>
        <div style={{
          background: 'var(--dark-2)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '40px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* glow de fundo */}
          <div style={{
            position: 'absolute', top: -80, right: -80,
            width: 260, height: 260,
            background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* ── Toggle membro ── */}
          <div style={{
            background: 'var(--dark-3)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: '18px 20px',
            marginBottom: 32, cursor: 'pointer',
          }}
            onClick={() => setIsMember(!isMember)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <input
                type="checkbox"
                className="custom-check"
                checked={isMember}
                onChange={e => setIsMember(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>
                  Sou membro ativo
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Declaro que sou membro e tenho direito ao valor exclusivo.
                  Ao marcar esta opção, concordo que o desconto se aplica apenas a membros ativos.
                </p>
              </div>
            </div>
          </div>

          {/* ── Preço dinâmico ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 32, padding: '16px 20px',
            background: isMember ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isMember ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 12,
            transition: 'all 0.3s ease',
          }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                {isMember ? '✦ Valor para membros' : 'Valor geral'}
              </p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', fontWeight: 700, lineHeight: 1 }}>
                <span style={{ fontSize: '1rem', fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>R$</span>
                {' '}{price}
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>,00</span>
              </p>
            </div>
            {isMember && (
              <div style={{
                background: 'rgba(201,168,76,0.15)',
                border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: 100, padding: '4px 12px',
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)',
                letterSpacing: '0.08em',
              }}>
                −{Math.round((1 - PRICE_MEMBER / PRICE_GENERAL) * 100)}% OFF
              </div>
            )}
          </div>

          {/* ── Formulário ── */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Nome */}
              <div>
                <label className="field-label">Nome completo</label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  {...register('name', { required: 'Nome é obrigatório' })}
                />
                {errors.name && <p className="error-msg">{errors.name.message}</p>}
              </div>

              {/* E-mail */}
              <div>
                <label className="field-label">E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email', {
                    required: 'E-mail é obrigatório',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
                  })}
                />
                {errors.email && <p className="error-msg">{errors.email.message}</p>}
              </div>

              {/* Telefone + CPF lado a lado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="field-label">WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="(44) 99999-9999"
                    {...register('phone', { required: 'Telefone é obrigatório' })}
                    onChange={handlePhone}
                  />
                  {errors.phone && <p className="error-msg">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="field-label">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    {...register('cpf', {
                      required: 'CPF é obrigatório',
                      minLength: { value: 14, message: 'CPF inválido' },
                    })}
                    onChange={handleCPF}
                  />
                  {errors.cpf && <p className="error-msg">{errors.cpf.message}</p>}
                </div>
              </div>

              {/* Como ficou sabendo */}
              <div>
                <label className="field-label">Como ficou sabendo do evento?</label>
                <select {...register('source')}>
                  <option value="">Selecione uma opção</option>
                  <option value="instagram">Instagram</option>
                  <option value="indicacao">Indicação de amigo</option>
                  <option value="email">E-mail / Newsletter</option>
                  <option value="whatsapp">Grupo de WhatsApp</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              {/* Erro geral */}
              {error && (
                <div style={{
                  background: 'rgba(229,115,115,0.1)',
                  border: '1px solid rgba(229,115,115,0.3)',
                  borderRadius: 10, padding: '12px 16px',
                  fontSize: '0.85rem', color: '#e57373',
                }}>
                  {error}
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '16px 24px',
                  borderRadius: 12, border: 'none',
                  background: loading
                    ? 'rgba(201,168,76,0.4)'
                    : 'linear-gradient(135deg, var(--gold), #a87a28)',
                  color: 'var(--dark)', fontFamily: 'Outfit, sans-serif',
                  fontSize: '0.95rem', fontWeight: 700,
                  letterSpacing: '0.04em', cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(201,168,76,0.3)',
                  transition: 'all 0.25s ease',
                  marginTop: 8,
                }}
              >
                {loading ? 'Redirecionando...' : `Pagar R$ ${price},00 →`}
              </button>

            </div>
          </form>

          {/* Trust */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {['🔒 Pagamento seguro', '↩ Garantia 7 dias', '💳 Pix · Cartão'].map(t => (
              <span key={t} style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
