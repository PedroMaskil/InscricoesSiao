'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { isCepMaringa, formatCep, calcPriceTier, PRICES, EVENT } from '@/lib/pricing'

type FormData = {
  name: string
  email: string
  phone: string
  cpf: string
  cep: string
  source: string
}

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

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RegistrationPage() {
  const [isMember, setIsMember]     = useState(false)
  const [cepCity, setCepCity]       = useState('')
  const [cepValid, setCepValid]     = useState<boolean | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [showForm, setShowForm]     = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>()
  const watchedCep = watch('cep', '')

  const handleCepBlur = async (cep: string) => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) { setCepValid(false); return }
    setCepLoading(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) { setCepValid(false); setCepCity(''); return }
      setCepCity(data.localidade)
      setCepValid(true)
    } catch {
      setCepValid(false)
    } finally {
      setCepLoading(false)
    }
  }

  const isMaringa    = isCepMaringa(watchedCep)
  const previewTier  = watchedCep.replace(/\D/g, '').length === 8
    ? calcPriceTier({ isMaringa, isMember, memberCount: 0 })
    : null
  const previewPrice = previewTier ? PRICES[previewTier] : null

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isMember, city: cepCity }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro desconhecido')
      window.location.href = json.url
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'Outfit, sans-serif' }}>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', width: '100%', height: '100vh', maxHeight: 620, overflow: 'hidden' }}>
        {/* Placeholder de imagem — substitua por <img src="/banner.jpg"> */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #0d1b2a 0%, #1a0a2e 40%, #0d1b0d 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Cruz decorativa */}
          <div style={{ position: 'absolute', opacity: 0.04 }}>
            <svg width="400" height="400" viewBox="0 0 400 400" fill="white">
              <rect x="175" y="40" width="50" height="320" rx="8"/>
              <rect x="60" y="155" width="280" height="50" rx="8"/>
            </svg>
          </div>
          {/* Glow */}
          <div style={{
            position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 500, height: 300,
            background: 'radial-gradient(ellipse, rgba(100,160,255,0.12) 0%, transparent 70%)',
          }} />
        </div>

        {/* Gradiente escurecendo pra baixo */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(to bottom, transparent, #0a0a0a)',
        }} />

        {/* Logo / Igreja */}
        <div style={{ position: 'absolute', top: 28, left: 28 }}>
          <p style={{ fontSize: '0.78rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
            Igreja Batista Sião · Maringá
          </p>
        </div>

        {/* Conteúdo hero */}
        <div style={{
          position: 'absolute', bottom: 48, right: 0,
          padding: '0 28px', maxWidth: 700, margin: '0 auto',
          textAlign: 'center', left: '50%', transform: 'translateX(-50%)',
        }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(100,160,255,0.15)',
            border: '1px solid rgba(100,160,255,0.3)',
            borderRadius: 100, padding: '5px 16px', marginBottom: 16,
            fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#7eb8ff', fontWeight: 600,
          }}>
            25 · 26 · 27 de Junho de 2025
          </div>

          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(3rem, 9vw, 6rem)',
            fontWeight: 700, lineHeight: 1, marginBottom: 12,
            color: '#fff', letterSpacing: '-0.02em',
          }}>
            {EVENT.name}
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginBottom: 28 }}>
            Igreja Batista Sião · Maringá, PR
          </p>

          <button
            onClick={() => setShowForm(true)}
            style={{
              background: 'linear-gradient(135deg, #4f8ef7, #7b5ea7)',
              color: '#fff', border: 'none', borderRadius: 100,
              padding: '14px 36px', fontSize: '0.95rem', fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
              boxShadow: '0 8px 32px rgba(79,142,247,0.4)',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Garantir minha vaga
          </button>
        </div>
      </div>

      {/* ── DETALHES DO EVENTO ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 0' }}>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 48 }}>
          {[
            { icon: '📅', label: 'Datas', value: '25, 26 e 27 de Junho' },
            { icon: '🕐', label: 'Horários', value: 'Qui/Sex 20h–22h · Sáb 16h–21h' },
            { icon: '📍', label: 'Local', value: 'Igreja Batista Sião, Maringá' },
            { icon: '⏰', label: 'Inscrições até', value: '21 de Junho' },
          ].map(item => (
            <div key={item.label} style={{
              background: '#111', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '18px 20px',
            }}>
              <p style={{ fontSize: '1.3rem', marginBottom: 8 }}>{item.icon}</p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{item.label}</p>
              <p style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 500, lineHeight: 1.4 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Tabela de lotes */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 700, marginBottom: 20, color: '#fff' }}>
            Valores
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Fora de Maringá',           value: 'R$ 40', desc: 'CEP fora de Maringá' },
              { label: 'Maringá / Membro 1º lote',  value: 'R$ 60', desc: 'Primeiras 50 vagas de membro ou não-membro de Maringá', highlight: true },
              { label: 'Membro — 2º lote',          value: 'R$ 70', desc: 'Após as 50 vagas do 1º lote' },
              { label: 'Membro — Lote final',       value: 'R$ 80', desc: 'Após 14 de junho' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: item.highlight ? 'rgba(79,142,247,0.07)' : '#111',
                border: `1px solid ${item.highlight ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12, padding: '14px 20px', gap: 12,
              }}>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: 2 }}>{item.label}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</p>
                </div>
                <p style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '1.5rem', fontWeight: 700, flexShrink: 0,
                  color: item.highlight ? '#7eb8ff' : 'rgba(255,255,255,0.7)',
                }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA botão */}
        <div style={{ textAlign: 'center', paddingBottom: 64 }}>
          <button
            onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' }), 100) }}
            style={{
              background: 'linear-gradient(135deg, #4f8ef7, #7b5ea7)',
              color: '#fff', border: 'none', borderRadius: 100,
              padding: '16px 48px', fontSize: '1rem', fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
              boxShadow: '0 8px 32px rgba(79,142,247,0.3)',
              width: '100%', maxWidth: 360,
            }}
          >
            Inscrever-se agora
          </button>
        </div>
      </div>

      {/* ── FORMULÁRIO ── */}
      {showForm && (
        <div id="form-section" style={{ background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '56px 24px 80px' }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, marginBottom: 8, color: '#fff', textAlign: 'center' }}>
              Inscrição
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', textAlign: 'center', marginBottom: 36 }}>
              Preencha os dados abaixo para garantir sua vaga
            </p>

            {/* Toggle membro */}
            <div
              onClick={() => setIsMember(!isMember)}
              style={{
                background: isMember ? 'rgba(79,142,247,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMember ? 'rgba(79,142,247,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 14, padding: '16px 18px', marginBottom: 28,
                cursor: 'pointer', transition: 'all 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <input type="checkbox" className="custom-check" checked={isMember} onChange={e => setIsMember(e.target.checked)} style={{ marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 3, color: '#fff' }}>Sou membro da igreja</p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                    Declaro que sou membro ativo e tenho direito ao valor exclusivo de membro.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                <div>
                  <label className="field-label">Nome completo</label>
                  <input type="text" placeholder="Seu nome completo"
                    {...register('name', { required: 'Nome é obrigatório' })} />
                  {errors.name && <p className="error-msg">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="field-label">E-mail</label>
                  <input type="email" placeholder="seu@email.com"
                    {...register('email', {
                      required: 'E-mail é obrigatório',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
                    })} />
                  {errors.email && <p className="error-msg">{errors.email.message}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="field-label">WhatsApp</label>
                    <input type="tel" placeholder="(44) 99999-9999"
                      {...register('phone', { required: 'Telefone é obrigatório' })}
                      onChange={e => setValue('phone', formatPhone(e.target.value))} />
                    {errors.phone && <p className="error-msg">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="field-label">CPF</label>
                    <input type="text" placeholder="000.000.000-00"
                      {...register('cpf', { required: 'CPF é obrigatório', minLength: { value: 14, message: 'CPF inválido' } })}
                      onChange={e => setValue('cpf', formatCPF(e.target.value))} />
                    {errors.cpf && <p className="error-msg">{errors.cpf.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="field-label">CEP</label>
                  <div style={{ position: 'relative' }}>
                    <input type="text" placeholder="00000-000"
                      {...register('cep', { required: 'CEP é obrigatório', minLength: { value: 9, message: 'CEP inválido' } })}
                      onChange={e => { setValue('cep', formatCep(e.target.value)); setCepValid(null) }}
                      onBlur={e => handleCepBlur(e.target.value)}
                    />
                    {cepLoading && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>buscando...</span>}
                  </div>
                  {cepValid === true && (
                    <p style={{ fontSize: '0.78rem', color: '#7eb8ff', marginTop: 5 }}>
                      📍 {cepCity} {isMaringa ? '— Maringá ✓' : '— fora de Maringá'}
                    </p>
                  )}
                  {cepValid === false && <p className="error-msg">CEP não encontrado</p>}
                  {errors.cep && <p className="error-msg">{errors.cep.message}</p>}
                </div>

                <div>
                  <label className="field-label">Como ficou sabendo?</label>
                  <select {...register('source')}>
                    <option value="">Selecione uma opção</option>
                    <option value="instagram">Instagram</option>
                    <option value="indicacao">Indicação de amigo</option>
                    <option value="email">E-mail / Newsletter</option>
                    <option value="whatsapp">Grupo de WhatsApp</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                {/* Preview preço */}
                {previewPrice && cepValid === true && (
                  <div style={{
                    background: 'rgba(79,142,247,0.07)',
                    border: '1px solid rgba(79,142,247,0.2)',
                    borderRadius: 12, padding: '14px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                        {previewPrice.label}
                      </p>
                      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.7rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                        {formatMoney(previewPrice.amount)}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', maxWidth: 130, textAlign: 'right', lineHeight: 1.4 }}>
                      Valor final confirmado no próximo passo
                    </span>
                  </div>
                )}

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
                    background: loading ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg, #4f8ef7, #7b5ea7)',
                    color: '#fff', fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 24px rgba(79,142,247,0.3)',
                    transition: 'all 0.25s ease', marginTop: 8,
                  }}
                >
                  {loading ? 'Redirecionando...' : 'Continuar para pagamento →'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginTop: 4 }}>
                  {['🔒 Pagamento seguro', '⏰ Inscrições até 21/06', '💳 Pix · Cartão'].map(t => (
                    <span key={t} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{t}</span>
                  ))}
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
