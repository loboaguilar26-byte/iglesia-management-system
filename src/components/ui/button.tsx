import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

// Los botones principales se elevan, brillan al pasar el cursor y se "hunden" al pulsar.
const variants: Record<ButtonVariant, string> = {
  primary: "btn-shine bg-gradient-to-b from-primary to-primary-strong text-primary-foreground shadow-sm shadow-primary/25 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30",
  secondary: "border border-border bg-surface text-foreground hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-2 hover:shadow-sm",
  danger: "bg-danger text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:brightness-110",
  ghost: "text-foreground hover:bg-surface-2",
  accent: "btn-shine bg-gradient-to-b from-accent to-[#9b6a24] text-white shadow-sm shadow-accent/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/40",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", className = "", size: Size = "md") {
  return `inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition duration-200 ease-out active:translate-y-0 active:scale-[.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, className, size)} {...props} />;
}
