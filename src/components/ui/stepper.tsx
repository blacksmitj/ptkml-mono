"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
  orientation?: "vertical" | "horizontal"
}

export function Stepper({ 
  steps, 
  currentStep, 
  className,
  orientation = "vertical" 
}: StepperProps) {
  return (
    <div className={cn(
      "flex",
      orientation === "vertical" ? "flex-col gap-0" : "flex-row items-center justify-between w-full",
      className
    )}>
      {steps.map((step, i) => {
        const stepNumber = i + 1
        const isActive = currentStep === stepNumber
        const isCompleted = currentStep > stepNumber
        const isLast = i === steps.length - 1

        return (
          <div key={i} className={cn(
            "flex group",
            orientation === "vertical" ? "gap-4" : "flex-col items-center gap-2 flex-1"
          )}>
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 bg-background font-bold text-xs",
                isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" : 
                isCompleted ? "bg-emerald-600/10 dark:bg-emerald-950/10 text-emerald-600" : "text-muted-foreground"
              )}>
                {isCompleted ? <Check className="h-4 w-4" /> : <span>{stepNumber}</span>}
              </div>
              {!isLast && orientation === "vertical" && (
                <div className={cn(
                  "w-0.5 h-8 my-0.5 rounded-full transition-colors duration-300",
                  isCompleted ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
            
            <div className={cn(
              "flex flex-col",
              orientation === "vertical" ? "pt-1" : "items-center text-center"
            )}>
              <span className={cn(
                "text-xs font-bold transition-colors tracking-tight",
                isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
              {(step.description || isCompleted || isActive) && (
                <span className={cn(
                  "text-[11px] font-medium transition-colors",
                  isCompleted ? "text-green-600" : isActive ? "text-primary/70" : "text-muted-foreground/60"
                )}>
                  {isCompleted ? "Complete" : isActive ? "In progress..." : step.description}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
