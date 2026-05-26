import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

const InputGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        data-slot="input-group"
        className={cn(
            "relative flex h-10 w-full items-center rounded-md border border-input bg-background transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            className
        )}
        {...props}
    />
))
InputGroup.displayName = "InputGroup"

const InputGroupInput = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        data-slot="input-group-input"
        className={cn(
            "flex h-full w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className
        )}
        {...props}
    />
))
InputGroupInput.displayName = "InputGroupInput"

const InputGroupAddon = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { align?: "inline-start" | "inline-end" }
>(({ className, align = "inline-start", ...props }, ref) => (
    <div
        ref={ref}
        data-slot="input-group-addon"
        className={cn(
            "flex items-center px-1.5",
            align === "inline-end" ? "ml-auto" : "mr-auto",
            className
        )}
        {...props}
    />
))
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupButton = React.forwardRef<
    HTMLButtonElement,
    ButtonProps & { render?: React.ReactElement }
>(({ className, variant = "ghost", size = "icon", render, ...props }, ref) => {
    const Comp = render ? Slot : "button"
    return (
        <Comp
            ref={ref}
            data-slot="input-group-button"
            className={cn(
                buttonVariants({ variant, size }),
                "h-7 w-7 shrink-0",
                className
            )}
            {...props}
        />
    )
})
InputGroupButton.displayName = "InputGroupButton"

export { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton }
