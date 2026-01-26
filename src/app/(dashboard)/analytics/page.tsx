"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, Users, Clock, DollarSign, Package, BarChart3, Utensils } from "lucide-react"
import Link from "next/link"

interface DashboardData {
  period: {
    weekStart: string
    weekEnd: string
    today: string
  }
  summary: {
    todayRevenue: number
    todayTransactions: number
    weekRevenue: number
    weekTransactions: number
  }
  levers: {
    unitEconomics: {
      avgTrueMargin: number
      target: number
      status: "green" | "yellow" | "red"
      foodCostPercent: number
      foodCostTarget: number
      foodCostStatus: "green" | "yellow" | "red"
    }
    trafficSource: {
      destinationPercent: number
      target: number
      status: "green" | "yellow" | "red"
    }
    ticketSize: {
      avgTicket: number
      todayAvgTicket: number
      target: number
      status: "green" | "yellow" | "red"
      foodAttachmentRate: number
    }
    menuFocus: {
      topItems: Array<{ name: string; quantity: number; revenue: number }>
      heroItemsCount: number
    }
    daypartEconomics: {
      dayparts: Array<{ name: string; revenue: number; transactions: number; avgTicket: number }>
    }
    cashConversion: {
      wasteCost: number
      spoilageRate: number
      target: number
      status: "green" | "yellow" | "red"
    }
    repeatRate: {
      repeatRate: number
      repeatCustomers: number
      totalCustomers: number
      target: number
      status: "green" | "yellow" | "red"
    }
    laborLeverage: {
      laborHours: number
      revPerLaborHour: number
      target: number
      status: "green" | "yellow" | "red"
    }
  }
  targets: Record<string, number>
}

function StatusBadge({ status }: { status: "green" | "yellow" | "red" }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    green: "default",
    yellow: "secondary",
    red: "destructive",
  }
  const labels = {
    green: "On Target",
    yellow: "Watch",
    red: "Action Needed",
  }
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

function LeverCard({
  number,
  title,
  value,
  unit,
  target,
  status,
  icon: Icon,
  children,
}: {
  number: number
  title: string
  value: number | string
  unit?: string
  target?: number
  status?: "green" | "yellow" | "red"
  icon: React.ElementType
  children?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lever {number}</p>
              <CardTitle className="text-sm">{title}</CardTitle>
            </div>
          </div>
          {status && <StatusBadge status={status} />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {target !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">Target: {target}{unit}</p>
        )}
        {children}
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/analytics/dashboard")
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error("Failed to fetch dashboard data", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    )
  }

  const { summary, levers } = data

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">10-Lever Dashboard</h1>
          <p className="text-muted-foreground">Financial intelligence for Kitchen Line</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Link href="/analytics/daily-pulse">
            <Button>Daily Pulse</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Today&apos;s Revenue</p>
            <p className="text-2xl font-bold">₱{summary.todayRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{summary.todayTransactions} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="text-2xl font-bold">₱{summary.weekRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{summary.weekTransactions} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Avg Ticket (Week)</p>
            <p className="text-2xl font-bold">₱{levers.ticketSize.avgTicket}</p>
            <p className="text-xs text-muted-foreground">Target: ₱{data.targets.ticketSize}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Rev/Labor Hour</p>
            <p className="text-2xl font-bold">₱{levers.laborLeverage.revPerLaborHour}</p>
            <p className="text-xs text-muted-foreground">Target: ₱{data.targets.revPerLaborHour}</p>
          </CardContent>
        </Card>
      </div>

      {/* 10 Levers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Lever 1: Unit Economics */}
        <LeverCard
          number={1}
          title="Unit Economics"
          value={levers.unitEconomics.avgTrueMargin}
          unit="%"
          target={levers.unitEconomics.target}
          status={levers.unitEconomics.status}
          icon={DollarSign}
        >
          <p className="text-xs text-muted-foreground mt-2">
            Food Cost: {levers.unitEconomics.foodCostPercent}% (target {levers.unitEconomics.foodCostTarget}%)
          </p>
        </LeverCard>

        {/* Lever 2: Traffic Source */}
        <LeverCard
          number={2}
          title="Traffic Source"
          value={levers.trafficSource.destinationPercent}
          unit="% destination"
          target={levers.trafficSource.target}
          status={levers.trafficSource.status}
          icon={Users}
        >
          <p className="text-xs text-muted-foreground mt-2">
            Goal: Build destination traffic
          </p>
        </LeverCard>

        {/* Lever 3: Ticket Size */}
        <LeverCard
          number={3}
          title="Ticket Size"
          value={`₱${levers.ticketSize.avgTicket}`}
          target={levers.ticketSize.target}
          status={levers.ticketSize.status}
          icon={TrendingUp}
        >
          <p className="text-xs text-muted-foreground mt-2">
            Food attachment: {levers.ticketSize.foodAttachmentRate}%
          </p>
        </LeverCard>

        {/* Lever 4: Menu Focus */}
        <LeverCard
          number={4}
          title="Menu Focus"
          value={levers.menuFocus.heroItemsCount}
          unit=" hero items"
          icon={Utensils}
        >
          <div className="mt-2 space-y-1">
            {levers.menuFocus.topItems.slice(0, 3).map((item, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {i + 1}. {item.name}: ₱{item.revenue.toLocaleString()}
              </p>
            ))}
          </div>
        </LeverCard>

        {/* Lever 5: Daypart Economics */}
        <LeverCard
          number={5}
          title="Daypart Economics"
          value={levers.daypartEconomics.dayparts[0]?.name || "N/A"}
          unit=" is best"
          icon={Clock}
        >
          <div className="mt-2 space-y-1">
            {levers.daypartEconomics.dayparts.map((dp) => (
              <div key={dp.name} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{dp.name}</span>
                <span>₱{dp.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </LeverCard>

        {/* Lever 6: Cash Conversion */}
        <LeverCard
          number={6}
          title="Cash Conversion"
          value={levers.cashConversion.spoilageRate}
          unit="% spoilage"
          target={levers.cashConversion.target}
          status={levers.cashConversion.status}
          icon={Package}
        >
          <p className="text-xs text-muted-foreground mt-2">
            Waste cost: ₱{levers.cashConversion.wasteCost}
          </p>
        </LeverCard>

        {/* Lever 7: Repeat Rate */}
        <LeverCard
          number={7}
          title="Repeat Rate"
          value={levers.repeatRate.repeatRate}
          unit="%"
          target={levers.repeatRate.target}
          status={levers.repeatRate.status}
          icon={Users}
        >
          <p className="text-xs text-muted-foreground mt-2">
            {levers.repeatRate.repeatCustomers} of {levers.repeatRate.totalCustomers} customers return
          </p>
        </LeverCard>

        {/* Lever 8: Labor Leverage */}
        <LeverCard
          number={8}
          title="Labor Leverage"
          value={`₱${levers.laborLeverage.revPerLaborHour}`}
          unit="/hr"
          target={levers.laborLeverage.target}
          status={levers.laborLeverage.status}
          icon={BarChart3}
        >
          <p className="text-xs text-muted-foreground mt-2">
            {levers.laborLeverage.laborHours} labor hours this week
          </p>
        </LeverCard>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/analytics/daily-pulse">
          <Button variant="outline" size="sm">Daily Pulse</Button>
        </Link>
        <Link href="/analytics/weekly">
          <Button variant="outline" size="sm">Weekly Scorecard</Button>
        </Link>
        <Link href="/ingredients">
          <Button variant="outline" size="sm">Ingredients</Button>
        </Link>
        <Link href="/waste">
          <Button variant="outline" size="sm">Waste Log</Button>
        </Link>
      </div>
    </div>
  )
}
