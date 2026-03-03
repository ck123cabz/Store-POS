import * as React from "react"
import { CheckIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface StepperProps extends React.ComponentProps<"div"> {
  activeStep: number
}

function Stepper({ activeStep, className, children, ...props }: StepperProps) {
  const items = React.Children.toArray(children)

  return (
    <div
      data-slot="stepper"
      className={cn("flex items-center gap-0", className)}
      {...props}
    >
      {items.map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <div
              aria-hidden="true"
              className={cn(
                "h-px flex-1 mx-2",
                index <= activeStep ? "bg-primary" : "bg-border"
              )}
            />
          )}
          {React.isValidElement<StepperItemProps>(child)
            ? React.cloneElement(child, {
                _index: index,
                _state:
                  child.props.status === "error"
                    ? "error"
                    : index < activeStep
                      ? "completed"
                      : index === activeStep
                        ? "active"
                        : "pending",
              })
            : child}
        </React.Fragment>
      ))}
    </div>
  )
}

type StepState = "pending" | "active" | "completed" | "error"

interface StepperItemProps extends React.ComponentProps<"div"> {
  step: number
  label: string
  description?: string
  /** Set to "error" to override the computed step state */
  status?: "error"
  /** @internal injected by Stepper */
  _index?: number
  /** @internal injected by Stepper */
  _state?: StepState
}

function StepperItem({
  step,
  label,
  description,
  status: _status,
  _index,
  _state = "pending",
  className,
  ...props
}: StepperItemProps) {
  return (
    <div
      data-slot="stepper-item"
      data-state={_state}
      className={cn("flex items-center gap-2 shrink-0", className)}
      {...props}
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
          _state === "completed" && "bg-primary text-primary-foreground",
          _state === "active" && "bg-primary text-primary-foreground",
          _state === "pending" && "border-2 border-border text-muted-foreground",
          _state === "error" && "bg-status-critical text-white"
        )}
      >
        {_state === "completed" ? (
          <CheckIcon className="size-3.5" />
        ) : _state === "error" ? (
          <XIcon className="size-3.5" />
        ) : (
          step
        )}
      </span>
      <div className="hidden sm:block">
        <p
          className={cn(
            "text-sm font-medium leading-none",
            _state === "pending" && "text-muted-foreground"
          )}
        >
          {label}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}

export { Stepper, StepperItem }
export type { StepperProps, StepperItemProps, StepState }
