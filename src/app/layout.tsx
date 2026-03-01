import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { ColorThemeProvider } from "@/components/providers/color-theme-provider"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Store POS",
  description: "Point of Sale System",
}

// Viewport configuration for mobile devices with notches
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // Enables safe-area-inset-* CSS variables
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent FOUC: apply saved color theme before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("color-theme");if(t&&t!=="default")document.documentElement.setAttribute("data-color-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <ColorThemeProvider>
            {children}
            <Toaster />
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
