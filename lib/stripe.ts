import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

export const PRICES = {
  member:  process.env.STRIPE_PRICE_MEMBER!,   // ex: R$ 97
  general: process.env.STRIPE_PRICE_GENERAL!,  // ex: R$ 197
}
