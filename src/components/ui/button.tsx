import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full px-6 min-h-11 border border-transparent font-sans text-base font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-accent text-paper shadow-[0_6px_16px_-6px_rgb(208_18_26/0.6)] hover:-translate-y-0.5 hover:bg-accent-deep hover:shadow-[0_12px_24px_-8px_rgb(208_18_26/0.7)]",
        ink: "bg-ink text-paper hover:bg-ink-soft",
        line: "border border-ink/15 bg-sheet text-ink shadow-sm hover:border-ink/40 hover:bg-white",
        glass: "border border-white/25 bg-white/10 text-paper backdrop-blur-md hover:bg-white/20",
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
