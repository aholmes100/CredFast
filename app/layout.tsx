import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from './components/Sidebar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CredFast',
  description: 'Provider enrollment and credentialing platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ height: '100%' }}
    >
      <body style={{ display: 'flex', minHeight: '100vh', margin: 0 }}>
        <Sidebar />
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
