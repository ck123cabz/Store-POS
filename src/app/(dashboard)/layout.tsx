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
    <SessionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1">{children}</main>
        </SidebarInset>
        <OnboardingTour />
      </SidebarProvider>
    </SessionProvider>
  )
}
