import { createClient } from '@supabase/supabase-js'

// Client-side (anon key — só leitura pública)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_URL! // will use anon key from env
)

// Server-side (service role — acesso total, só usar em Server Components / API routes)
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
