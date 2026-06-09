'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { isCepMaringa, formatCep, calcPriceTier, PRICES } from '@/lib/pricing'
import { CalendarDays, Clock, MapPin, ClipboardList, Phone } from 'lucide-react'

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

const DAYS = [
  {
    id:       'quinta_sexta',
    label:    'Quinta + Sexta-feira',
    sublabel: 'Duas noites',
    date:     '25 e 26 de Junho',
    time:     '20h às 22h',
    amount:   5500,
  },
  {
    id:       'sabado',
    label:    'Sábado',
    sublabel: 'Tarde e noite inteiros',
    date:     '27 de Junho',
    time:     '16h às 21h',
    amount:   4000,
  },
]

function calcDayTotal(days: string[]): number {
  if (days.length === 2) return 8000
  return days.reduce((sum, id) => sum + (DAYS.find(d => d.id === id)?.amount ?? 0), 0)
}

export default function RegistrationPagePacote() {
  const [isOtherMember, setIsOtherMember] = useState(false)
  const [otherChurch, setOtherChurch]     = useState('')
  const [isNotSiao, setIsNotSiao]         = useState(true)
  const [selectedDays, setSelectedDays]   = useState<string[]>([])
  const [cepCity, setCepCity]             = useState('')
  const [cepValid, setCepValid]           = useState<boolean | null>(null)
  const [cepLoading, setCepLoading]       = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [showForm, setShowForm]           = useState(false)

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
    ? calcPriceTier({ isMaringa, isMember: false, memberCount: 0 })
    : null
  const previewPrice = previewTier ? PRICES[previewTier] : null

  const dayTotal  = calcDayTotal(selectedDays)
  const canSubmit = cepValid === true && (!isMaringa || selectedDays.length > 0)

  const toggleDay = (id: string) => {
    setSelectedDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          isMember: false,
          city: cepCity,
          isOtherMember,
          otherChurch: isOtherMember ? otherChurch : null,
          isNotSiao,
          selectedDays: isMaringa ? selectedDays : [],
          fullPackage: isMaringa && selectedDays.length === 2,
        }),
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
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 0' }}>

        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Nunito', sans-serif", fontSize: '2.2rem', fontWeight: 900, color: '#fff', marginBottom: 24, letterSpacing: '-0.01em' }}>
            Conferência LightHouse 2026
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: <CalendarDays size={17} />, label: 'Data', value: '25, 26 e 27 de Junho' },
              { icon: <Clock size={17} />,        label: 'Horários', value: 'Qui/Sex 20h–22h · Sáb 16h–21h' },
              { icon: <MapPin size={17} />,       label: 'Local', value: 'Igreja Batista Sião, Maringá', address: 'R. Manoel de Macedo, 37 - Zona 7', maps: 'https://maps.google.com/?q=R.+Manoel+de+Macedo,+37,+Zona+7,+Maringá,+PR' },
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

        {/* ── SOBRE O EVENTO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '28px 28px',
        }}>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: 20 }}>
            INFORMAÇÕES SOBRE O EVENTO
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
            {(() => {
              const hl = (word: string) => <span style={{ color: '#c084fc', fontWeight: 600 }}>{word}</span>
              return <>
                <p><span style={{ color: '#c084fc', fontWeight: 600 }}>LIGHTHOUSE</span> é a Conferência de Jovens e Adolescentes da Igreja Batista Sião de Maringá, que acontecerá nos dias 25, 26 e 27 de Junho.</p>
                <p>Nossa missão como ministério é clara - {hl('ALCANÇAR')}, {hl('DISCIPULAR')} e {hl('ENVIAR')} jovens para viverem suas vocações, a partir da igreja local, para a Glória de Deus. Nessa conferência nosso foco é um: {hl('ENVIAR')}.</p>
                <p>Somos uma geração que não foi chamada para se esconder, mas para brilhar, como um {hl('FAROL')}.</p>
                <p>Essa é a nossa {hl('IDENTIDADE')}, esse é o nosso {hl('CHAMADO')}.</p>
                <p>Não fomos levantados por acaso, fomos posicionados como faróis: firmes e constantes, apontando para uma direção - {hl('VERDADE')} e {hl('VIDA')}.</p>
                <p>Somos uma geração que entende que foi enviada para {hl('TRANSFORMAR')} ambientes, {hl('INFLUENCIAR')} pessoas, carregando aquilo que recebeu, {hl('CRISTO')}.</p>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16, marginTop: 4 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Não existimos para assistir.</p>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}> {hl('EXISTIMOS PARA IR')}.</p>
                </div>
              </>
            })()}
          </div>
        </div>

        {/* ── PROGRAMAÇÃO ── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '28px 28px',
        }}>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#c084fc', display: 'flex' }}><ClipboardList size={18} /></span>
            Programação:
          </h3>
<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

  <div>
    <div style={{ display: 'flex', gap: 8, fontSize: '0.9rem', padding: '10px 0' }}>
      <span style={{ color: '#c084fc', fontWeight: 600, flexShrink: 0 }}>Sessão 1:</span>
      <span style={{ color: 'rgba(255,255,255,0.65)' }}>dia 25, quinta-feira às 20h.</span>
    </div>
    <div style={{ fontSize: '0.9rem', paddingBottom: 10, paddingLeft: 2 }}>
      <span style={{ color: 'rgba(192,132,252,0.5)', fontWeight: 500 }}>Adlin Rodrigues + Pedro Vuks</span>
    </div>
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
  </div>

  <div>
    <div style={{ display: 'flex', gap: 8, fontSize: '0.9rem', padding: '10px 0' }}>
      <span style={{ color: '#c084fc', fontWeight: 600, flexShrink: 0 }}>Sessão 2:</span>
      <span style={{ color: 'rgba(255,255,255,0.65)' }}>dia 26, sexta-feira às 20h.</span>
    </div>
    <div style={{ fontSize: '0.9rem', paddingBottom: 10, paddingLeft: 2 }}>
      <span style={{ color: 'rgba(192,132,252,0.5)', fontWeight: 500 }}>Preletor:</span>
      {' '}<span style={{ color: 'rgba(255,255,255,0.3)' }}>Em breve</span>
    </div>
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
  </div>

  <div>
    <div style={{ display: 'flex', gap: 8, fontSize: '0.9rem', padding: '10px 0' }}>
      <span style={{ color: '#c084fc', fontWeight: 600, flexShrink: 0 }}>Sessão 3:</span>
      <span style={{ color: 'rgba(255,255,255,0.65)' }}>dia 27, sábado às 16h.</span>
    </div>
    <div style={{ fontSize: '0.9rem', paddingBottom: 10, paddingLeft: 2 }}>
      <span style={{ color: 'rgba(192,132,252,0.5)', fontWeight: 500 }}>Preletor:</span>
      {' '}<span style={{ color: 'rgba(255,255,255,0.3)' }}>Em breve</span>
    </div>
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
  </div>

  <div>
    <div style={{ display: 'flex', gap: 8, fontSize: '0.9rem', padding: '10px 0' }}>
      <span style={{ color: '#c084fc', fontWeight: 600, flexShrink: 0 }}>Sessão 4:</span>
      <span style={{ color: 'rgba(255,255,255,0.65)' }}>dia 27, sábado às 19h.</span>
    </div>
    <div style={{ fontSize: '0.9rem', paddingBottom: 10, paddingLeft: 2 }}>
      <span style={{ color: 'rgba(192,132,252,0.5)', fontWeight: 500 }}>Preletor:</span>
      {' '}<span style={{ color: 'rgba(255,255,255,0.3)' }}>Em breve</span>
    </div>
  </div>

</div>
        </div>

        </div>{/* fim grid */}

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
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

        <div style={{ textAlign: 'center', paddingBottom: 64 }}>
          <button
            onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' }), 100) }}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
              color: '#fff', border: 'none', borderRadius: 100,
              padding: '16px 48px', fontSize: '1rem', fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
              boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
              width: '100%', maxWidth: 360,
            }}
          >
            Inscrever-se agora
          </button>
        </div>
      </div>

      {/* ── FORMULÁRIO ── */}
      {showForm && (
        <div id="form-section" style={{ background: '#0a0815', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '56px 24px 80px' }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, marginBottom: 8, color: '#fff', textAlign: 'center' }}>
              Inscrição
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', textAlign: 'center', marginBottom: 36 }}>
              Preencha os dados abaixo para garantir sua vaga
            </p>

            {/* Toggle membro de outra igreja */}
            <div
              onClick={() => { setIsOtherMember(!isOtherMember); setOtherChurch('') }}
              style={{
                background: isOtherMember ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isOtherMember ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 14, padding: '16px 18px', marginBottom: 12,
                cursor: 'pointer', transition: 'all 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <input type="checkbox" className="custom-check" checked={isOtherMember} onChange={e => setIsOtherMember(e.target.checked)} style={{ marginTop: 2 }} />
                <p style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>Sou membro de outra igreja</p>
              </div>
            </div>

            {isOtherMember && (
              <div style={{ marginBottom: 12 }}>
                <label className="field-label">Qual?</label>
                <input
                  type="text"
                  placeholder="Nome da sua igreja"
                  value={otherChurch}
                  onChange={e => setOtherChurch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            )}

            {/* Toggle não faz parte da Sião */}
            <div
              onClick={() => setIsNotSiao(!isNotSiao)}
              style={{
                background: isNotSiao ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isNotSiao ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 14, padding: '16px 18px', marginBottom: 28,
                cursor: 'pointer', transition: 'all 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <input type="checkbox" className="custom-check" checked={isNotSiao} onChange={e => setIsNotSiao(e.target.checked)} style={{ marginTop: 2 }} />
                <p style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>Não faço parte da Sião</p>
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
                      onChange={e => { setValue('cep', formatCep(e.target.value)); setCepValid(null); setSelectedDays([]) }}
                      onBlur={e => handleCepBlur(e.target.value)}
                    />
                    {cepLoading && (
                      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                        buscando...
                      </span>
                    )}
                  </div>
                  {cepValid === true && (
                    <p style={{ fontSize: '0.78rem', color: '#c084fc', marginTop: 5 }}>
                      📍 {cepCity} {isMaringa ? '— Maringá ✓' : '— fora de Maringá'}
                    </p>
                  )}
                  {cepValid === false && <p className="error-msg">CEP não encontrado</p>}
                  {errors.cep && <p className="error-msg">{errors.cep.message}</p>}
                </div>

                {/* Seleção de ingressos — apenas para Maringá */}
                {isMaringa && cepValid === true && (
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <label className="field-label" style={{ fontSize: '1rem', letterSpacing: '0.03em' }}>
                        Escolha seus ingressos
                      </label>
                      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: 5, lineHeight: 1.5 }}>
                        Selecione os dias que você vai participar. Pode escolher um ou os dois — clique para marcar!
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {DAYS.map(day => {
                        const selected = selectedDays.includes(day.id)
                        return (
                          <div
                            key={day.id}
                            onClick={() => toggleDay(day.id)}
                            style={{
                              background: selected ? 'rgba(124,58,237,0.13)' : 'rgba(255,255,255,0.03)',
                              border: `1.5px solid ${selected ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.09)'}`,
                              borderRadius: 14,
                              padding: '16px 18px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              userSelect: 'none' as const,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                border: `2px solid ${selected ? '#7c3aed' : 'rgba(255,255,255,0.2)'}`,
                                background: selected ? '#7c3aed' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease',
                              }}>
                                {selected && <span style={{ fontSize: '0.65rem', color: '#fff', lineHeight: 1 }}>✓</span>}
                              </div>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: '0.97rem', color: '#fff', marginBottom: 3 }}>{day.label}</p>
                                <p style={{ fontSize: '0.78rem', color: selected ? 'rgba(192,132,252,0.8)' : 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{day.sublabel}</p>
                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)' }}>{day.date} · {day.time}</p>
                              </div>
                            </div>
                            <p style={{
                              fontFamily: 'Cormorant Garamond, serif',
                              fontSize: '1.45rem', fontWeight: 700,
                              color: selected ? '#c084fc' : 'rgba(255,255,255,0.55)',
                              flexShrink: 0,
                              transition: 'color 0.2s ease',
                            }}>
                              {formatMoney(day.amount)}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {selectedDays.length === 0 && (
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: 10, textAlign: 'center' }}>
                        Selecione pelo menos um ingresso para continuar
                      </p>
                    )}

                    {selectedDays.length === 1 && (
                      <div style={{
                        marginTop: 12,
                        background: 'rgba(124,58,237,0.07)',
                        border: '1px solid rgba(124,58,237,0.2)',
                        borderRadius: 12,
                        padding: '14px 18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.7rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                          {formatMoney(dayTotal)}
                        </p>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', maxWidth: 130, textAlign: 'right', lineHeight: 1.4 }}>
                          Valor final confirmado no próximo passo
                        </span>
                      </div>
                    )}

                    {selectedDays.length === 2 && (
                      <div style={{
                        marginTop: 12,
                        background: 'rgba(124,58,237,0.1)',
                        border: '1px solid rgba(124,58,237,0.35)',
                        borderRadius: 12,
                        padding: '14px 18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div>
                          <p style={{ fontSize: '0.72rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                            Pacote completo — todos os dias
                          </p>
                          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.7rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                            {formatMoney(dayTotal)}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                            Qui, Sex e Sáb — 25, 26 e 27/06
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            background: 'rgba(74,222,128,0.12)',
                            border: '1px solid rgba(74,222,128,0.3)',
                            borderRadius: 8, padding: '4px 10px',
                            fontSize: '0.72rem', color: '#4ade80', fontWeight: 600,
                          }}>
                            R$ 15 de desconto
                          </span>
                          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: 6, lineHeight: 1.4 }}>
                            Valor final confirmado<br />no próximo passo
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="field-label">Como ficou sabendo?</label>
                  <select {...register('source')}>
                    <option value="">Selecione uma opção</option>
                    <option value="instagram">Instagram</option>
                    <option value="indicacao">Indicação de amigo</option>
                    <option value="whatsapp">Grupo de WhatsApp</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                {/* Preview preço — apenas para fora de Maringá */}
                {!isMaringa && previewPrice && cepValid === true && (
                  <div style={{
                    background: 'rgba(124,58,237,0.07)',
                    border: '1px solid rgba(124,58,237,0.2)',
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
                  disabled={loading || !canSubmit}
                  style={{
                    width: '100%', padding: '16px 24px', borderRadius: 100, border: 'none',
                    background: (loading || !canSubmit) ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                    color: '#fff', fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em',
                    cursor: (loading || !canSubmit) ? 'not-allowed' : 'pointer',
                    boxShadow: (loading || !canSubmit) ? 'none' : '0 4px 24px rgba(124,58,237,0.3)',
                    transition: 'all 0.25s ease', marginTop: 8,
                  }}
                >
                  {loading ? 'Redirecionando...' : 'Continuar para pagamento →'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginTop: 4 }}>
                  {['🔒 Pagamento seguro', '⏰ Inscrições até 25/06', '💳 Pix · Cartão'].map(t => (
                    <span key={t} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{t}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                  <Phone size={13} color="rgba(192,132,252,0.6)" />
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                    Suporte:{' '}
                    <a href="https://wa.me/5544999605447" target="_blank" rel="noreferrer"
                      style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, textDecoration: 'none' }}>
                      (44) 99960-5447
                    </a>
                    {' '}— Pedro
                  </p>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
