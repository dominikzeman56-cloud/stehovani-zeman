import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm px-5 min-h-11 border border-transparent font-sans text-base font-semibold transition-all duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-accent text-paper hover:bg-accent-deep hover:shadow-[0_10px_22px_-12px_rgba(142,28,34,0.7)]",
        ink: "bg-ink text-paper hover:bg-ink-soft",
        line: "border border-ink/20 bg-sheet text-ink hover:border-ink hover:bg-white",
        quiet: "border border-paper/30 text-paper hover:border-accent hover:text-accent",
        ghost: "text-muted hover:text-ink",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
