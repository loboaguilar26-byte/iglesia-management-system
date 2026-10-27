import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:opacity-90 hover:shadow-md",
  secondary: "border border-border bg-surface shadow-sm hover:-translate-y-px hover:bg-background hover:shadow-md",
  danger: "bg-danger text-white shadow-sm hover:-translate-y-px hover:opacity-90 hover:shadow-md",
  ghost: "hover:bg-background",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
