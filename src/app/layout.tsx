import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Skill Graph',
  description: 'Explore skills, roles, and companies in the AI engineering landscape',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
