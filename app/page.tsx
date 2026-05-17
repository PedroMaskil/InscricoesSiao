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
  const [isMember, setIsMember]         = useState(false)
  const [cepCity, setCepCity]           = useState('')
  const [cepValid, setCepValid]         = useState<boolean | null>(null)
  const [cepLoading, setCepLoading]     = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>()
  const watchedCep = watch('cep', '')

  // Busca CEP na API pública
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

  // Calcula preço estimado para exibir (sem contar membros confirmados — isso é feito no servidor)
  const isMaringa  = isCepMaringa(watchedCep)
  const previewTier = watchedCep.replace(/\D/g, '').length === 8
    ? calcPriceTier({ isMaringa, isMember, memberCount: 0 }) // conservador: mostra 1º lote
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
    <main style={{ minHeight: '100vh', background: 'var(--dark)', padding: '0 0 80px' }}>

      {/* Header */}
      <header style={{ textAlign: 'center', padding: '64px 24px 40px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '14px', fontWeight: 500 }}>
          25 · 26 · 27 de Junho de 2025
        </p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', fontWeight: 700, lineHeight: 1.1, marginBottom: '12px' }}>
          {EVENT.name}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{EVENT.schedule}</p>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', margin: '24px auto' }} />

        {/* Tabela de preços */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', maxWidth: 560, margin: '0 auto' }}>
          {[
            { label: 'Fora de Maringá', value: 'R$ 40' },
            { label: 'Maringá / Membro 1º lote', value: 'R$ 60' },
            { label: 'Membro 2º lote', value: 'R$ 70' },
            { label: 'Membro lote final', value: 'R$ 80' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10, padding: '10px 16px', textAlign: 'center',
            }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>{item.label}</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold)' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Card do formulário */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px' }}>
        <div style={{
          background: 'var(--dark-2)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '36px 32px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Toggle membro */}
          <div
            onClick={() => setIsMember(!isMember)}
            style={{
              background: isMember ? 'rgba(201,168,76,0.07)' : 'var(--dark-3)',
              border: `1px solid ${isMember ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 14, padding: '16px 18px', marginBottom: 28,
              cursor: 'pointer', transition: 'all 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <input type="checkbox" className="custom-check" checked={isMember} onChange={e => setIsMember(e.target.checked)} style={{ marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 3 }}>Sou membro da igreja</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Declaro que sou membro ativo e tenho direito ao valor exclusivo de membro.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Nome */}
              <div>
                <label className="field-label">Nome completo</label>
                <input type="text" placeholder="Seu nome completo"
                  {...register('name', { required: 'Nome é obrigatório' })} />
                {errors.name && <p className="error-msg">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="field-label">E-mail</label>
                <input type="email" placeholder="seu@email.com"
                  {...register('email', {
                    required: 'E-mail é obrigatório',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
                  })} />
                {errors.email && <p className="error-msg">{errors.email.message}</p>}
              </div>

              {/* Telefone + CPF */}
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

              {/* CEP */}
              <div>
                <label className="field-label">CEP</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="00000-000"
                    {...register('cep', { required: 'CEP é obrigatório', minLength: { value: 9, message: 'CEP inválido' } })}
                    onChange={e => { setValue('cep', formatCep(e.target.value)); setCepValid(null) }}
                    onBlur={e => handleCepBlur(e.target.value)}
                  />
                  {cepLoading && (
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      buscando...
                    </span>
                  )}
                </div>
                {cepValid === true && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--gold)', marginTop: 5 }}>
                    📍 {cepCity} {isMaringa ? '— Maringá ✓' : '— fora de Maringá'}
                  </p>
                )}
                {cepValid === false && <p className="error-msg">CEP não encontrado</p>}
                {errors.cep && <p className="error-msg">{errors.cep.message}</p>}
              </div>

              {/* Como ficou sabendo */}
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

              {/* Preview do preço */}
              {previewPrice && cepValid === true && (
                <div style={{
                  background: 'rgba(201,168,76,0.07)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 12, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                      {previewPrice.label}
                    </p>
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.7rem', fontWeight: 700, lineHeight: 1 }}>
                      {formatMoney(previewPrice.amount)}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', maxWidth: 130, textAlign: 'right', lineHeight: 1.4 }}>
                    Valor final confirmado no próximo passo
                  </span>
                </div>
              )}

              {/* Erro */}
              {error && (
                <div style={{ background: 'rgba(229,115,115,0.1)', border: '1px solid rgba(229,115,115,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', color: '#e57373' }}>
                  {error}
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '16px 24px', borderRadius: 12, border: 'none',
                  background: loading ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, var(--gold), #a87a28)',
                  color: 'var(--dark)', fontFamily: 'Outfit, sans-serif',
                  fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(201,168,76,0.3)',
                  transition: 'all 0.25s ease', marginTop: 8,
                }}
              >
                {loading ? 'Redirecionando...' : 'Continuar para pagamento →'}
              </button>

            </div>
          </form>

          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {['🔒 Pagamento seguro', `⏰ Inscrições até 21/06`, '💳 Pix · Cartão'].map(t => (
              <span key={t} style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
