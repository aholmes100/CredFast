import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from './components/Sidebar'
import { createClient } from './lib/supabase-server'

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifData } = user
    ? await supabase
        .from('notifications')
        .select('id, type, title, body, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: null }

  const notifications = (notifData ?? []) as import('./components/NotificationBell').AppNotification[]

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ height: '100%' }}
    >
      <body style={{ display: 'flex', minHeight: '100vh', margin: 0 }}>
        {user && <Sidebar initialNotifications={notifications} />}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
