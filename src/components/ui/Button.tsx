import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:pointer-events-none disabled:opacity-50",
          {
            "glass-button": variant === "default",
            "border border-accent-cyan/50 bg-transparent hover:bg-accent-cyan/20 text-accent-cyan": variant === "outline",
            "hover:bg-accent-cyan/20 text-accent-cyan": variant === "ghost",
            "bg-danger/80 hover:bg-danger/90 text-white border border-danger/30 shadow-[0_4px_12px_0_rgba(255,77,77,0.3)]": variant === "danger",
            "h-12 px-4 py-2": size === "default",
            "h-9 rounded-lg px-3": size === "sm",
            "h-14 rounded-xl px-8 text-base": size === "lg",
            "h-12 w-12": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
