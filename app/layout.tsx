import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Inscrições — Evento',
  description: 'Garanta sua vaga no evento',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
