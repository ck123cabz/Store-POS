"use client"

import * as React from "react"
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from "recharts"

import { cn } from "@/lib/utils"

interface SparklineProps extends React.ComponentProps<"div"> {
  data: number[]
  width?: number
  height?: number
  color?: string
  filled?: boolean
}

function Sparkline({
  data,
  width = 120,
  height = 32,
  color = "var(--color-primary)",
  filled = false,
  className,
  ...props
}: SparklineProps) {
  const chartData = React.useMemo(
    () => data.map((value, index) => ({ index, value })),
    [data]
  )

  if (data.length < 2) return null

  const Chart = filled ? AreaChart : LineChart

  return (
    <div
      data-slot="sparkline"
      className={cn("inline-block", className)}
      style={{ width, height }}
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={chartData}>
          {filled ? (
            <>
              <defs>
                <linearGradient id={`fill-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#fill-${color.replace(/[^a-z0-9]/gi, "")})`}
                dot={false}
                isAnimationActive={false}
              />
            </>
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}

export { Sparkline }
export type { SparklineProps }
