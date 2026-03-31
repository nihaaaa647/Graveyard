import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Graveyard | Failure Intelligence',
  description: 'Graveyard indexes failure so you don\'t have to repeat it.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased text-gray-200 bg-[#0a0a0a]`}>
        {children}
      </body>
    </html>
  )
}
