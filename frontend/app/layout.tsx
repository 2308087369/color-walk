import type { Metadata, Viewport } from 'next'
import { Toaster } from "@/components/ui/toaster"
import { ReportDialog } from "@/components/report-dialog"
import './globals.css'

export const metadata: Metadata = {
  title: '色彩漫步 - Color City Walk',
  description: '探索中国传统色彩，用颜色记录你的城市漫步',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased min-h-screen flex flex-col pb-24 relative">
        <main className="flex-1">
          {children}
        </main>
        <div className="fixed bottom-0 w-full z-40 bg-background/80 backdrop-blur-sm pb-16 pt-2 pointer-events-none">
          <div className="text-center text-[10px] text-muted-foreground/60 pointer-events-auto flex justify-center items-center">
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              渝ICP备2026006056号
            </a>
            <ReportDialog />
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
