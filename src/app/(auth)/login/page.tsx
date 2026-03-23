"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { toast } from "sonner"
import { ShoppingBag } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("")

    if (!username || !password) {
      setError("Please enter username and password")
      toast.error("Please enter username and password")
      return
    }

    setLoading(true)

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Incorrect username or password")
      toast.error("Incorrect username or password")
    } else {
      // Check if user is employee-only (no admin permissions + linked employee)
      try {
        const res = await fetch("/api/my-shift")
        if (res.ok) {
          const data = await res.json()
          if (data.employee) {
            // Get fresh session to check permissions
            const sessionRes = await fetch("/api/auth/session")
            const session = await sessionRes.json()
            const user = session?.user
            const hasAdminPerms = user && (
              user.permProducts || user.permCategories || user.permTransactions ||
              user.permUsers || user.permSettings || user.permReports || user.permAuditLog
            )
            if (!hasAdminPerms) {
              router.push("/my-shift")
              router.refresh()
              return
            }
          }
        }
      } catch {
        // Fall through to default /pos routing
      }
      router.push("/pos")
      router.refresh()
    }
  }

  return (
    <Card className="w-[440px] pt-10 pb-10">
      <CardHeader className="items-center space-y-4">
        <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ShoppingBag className="size-8 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Store POS</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue to your account</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              className="h-11"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError("") }}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="h-11"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError("") }}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          {error && (
            <p id="login-error" className="text-sm text-destructive" role="alert">{error}</p>
          )}
          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
