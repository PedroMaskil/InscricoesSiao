import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICES } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, cpf, source, isMember } = body

    // Validação básica
    if (!name || !email || !phone || !cpf) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }

    const priceId = isMember ? PRICES.member : PRICES.general
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    // Salva lead no Supabase antes do pagamento
    const db = supabaseAdmin()
    const { data: registration, error: dbError } = await db
      .from('registrations')
      .insert({
        name,
        email,
        phone,
        cpf,
        source: source || null,
        is_member: isMember,
        status: 'pending',
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Supabase error:', dbError)
      return NextResponse.json({ error: 'Erro ao salvar inscrição.' }, { status: 500 })
    }

    // Cria sessão no Stripe
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],  // adicione 'boleto' se quiser
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        registration_id: registration.id,
        name,
        phone,
        cpf,
        is_member: String(isMember),
      },
      success_url: `${appUrl}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/?canceled=true`,
      locale: 'pt-BR',
      // Pix: adicione payment_method_types: ['card', 'pix'] e
      // payment_intent_data: { payment_method_options: { pix: { expires_after_seconds: 3600 } } }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
