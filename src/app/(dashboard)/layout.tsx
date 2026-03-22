import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Header } from "@/components/layout/header"
import { AppSidebar } from "@/components/layout/sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SessionProvider } from "@/components/providers/session-provider"
import { OnboardingTour } from "@/components/onboarding/tour"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:shadow-float focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main id="main-content" className="flex-1 min-h-0">{children}</main>
        </SidebarInset>
        <OnboardingTour />
      </SidebarProvider>
    </SessionProvider>
  )
}
