"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ShoppingCart,
  BarChart3,
  Package,
  Calendar,
  History,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react"
import { useOnboarding } from "@/hooks/use-onboarding"

const tourSteps = [
  {
    title: "Welcome to Store POS!",
    description: "Let's take a quick tour of the key features to help you get started.",
    icon: ShoppingCart,
  },
  {
    title: "Point of Sale",
    description: "Process sales quickly with our intuitive POS interface. Add products to cart, apply discounts, and complete transactions.",
    icon: ShoppingCart,
  },
  {
    title: "Analytics Dashboard",
    description: "Track your business performance with the 10-Lever Framework. Monitor revenue, ticket size, labor costs, and more.",
    icon: BarChart3,
  },
  {
    title: "Inventory Management",
    description: "Manage your ingredients and products. Track stock levels, set par levels, and get low-stock alerts.",
    icon: Package,
  },
  {
    title: "Sales Calendar",
    description: "View your sales performance by day. See revenue trends and daily summaries at a glance.",
    icon: Calendar,
  },
  {
    title: "Audit Log",
    description: "Track all inventory changes with a complete audit trail. See who made changes and when.",
    icon: History,
  },
  {
    title: "Settings",
    description: "Configure your store details, tax settings, and user permissions.",
    icon: Settings,
  },
  {
    title: "You're All Set!",
    description: "You can restart this tour anytime from the Settings page. Enjoy using Store POS!",
    icon: ShoppingCart,
  },
]

export function OnboardingTour() {
  const { shouldShowTour, markComplete } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(0)

  if (!shouldShowTour) {
    return null
  }

  const step = tourSteps[currentStep]
  const Icon = step.icon
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0

  function handleNext() {
    if (isLastStep) {
      markComplete()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  function handlePrevious() {
    setCurrentStep((s) => Math.max(0, s - 1))
  }

  function handleSkip() {
    markComplete()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{step.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{step.description}</p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1 mt-4">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? "bg-primary" : "bg-accent"
                }`}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex gap-2">
            {!isLastStep && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>
            )}
            <Button onClick={handleNext}>
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
