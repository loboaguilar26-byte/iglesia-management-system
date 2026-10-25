import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-strong",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-2",
  danger: "bg-danger text-white shadow-sm hover:opacity-90",
  ghost: "text-foreground hover:bg-surface-2",
  accent: "bg-accent text-white shadow-sm hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", className = "", size: Size = "md") {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`;
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
