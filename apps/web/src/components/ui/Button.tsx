import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "money" | "quiet" | "danger";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-deep",
  // Gold is reserved for actions that move money.
  money: "bg-oro text-on-oro hover:brightness-95",
  quiet:
    "bg-transparent text-primary shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-primary-tint",
  danger: "bg-transparent text-danger shadow-[inset_0_0_0_1.5px_var(--danger)]",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-[15px]",
  lg: "min-h-14 px-6 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

/** The look of a button, for a link that should look like one. */
export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: Pick<ButtonProps, "variant" | "size" | "block" | "className">): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-m font-semibold transition-[background-color,transform] duration-150 ease-out active:translate-y-px",
    "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0",
    variants[variant],
    sizes[size],
    block && "w-full",
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      data-variant={variant}
      data-size={size}
      className={buttonClass({ variant, size, block, className })}
      {...props}
    />
  );
}
