import type { Metadata } from 'next'
import { Syne, IBM_Plex_Mono, DM_Sans } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '800'],
  variable: '--font-syne'
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono'
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans'
})

export const metadata: Metadata = {
  title: 'Graveyard | Intelligence System',
  description: "Graveyard indexes failure so you don't have to repeat it.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${ibmPlexMono.variable} ${dmSans.variable}`}>
        {children}
      </body>
    </html>
  )
}
