"use client";

import { useLayoutEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";
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
  /**
   * Something this screen started is under way: the button cannot be pressed again, and if it is the
   * one that was pressed it shows a turning ring before its label and says it is busy. A screen with
   * several buttons can pass the same flag to all of them; only the pressed one turns.
   */
  loading?: boolean;
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
  loading = false,
  disabled,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  // When the work ends the button is no longer the one that started it.
  const [wasLoading, setWasLoading] = useState(loading);
  if (loading !== wasLoading) {
    setWasLoading(loading);
    if (!loading) setPressed(false);
  }
  const loadingNow = useRef(loading);
  useLayoutEffect(() => {
    loadingNow.current = loading;
  });
  const turning = loading && pressed;
  return (
    <button
      type={type}
      data-variant={variant}
      data-size={size}
      data-loading={turning || undefined}
      aria-busy={turning || undefined}
      disabled={disabled || loading}
      className={buttonClass({ variant, size, block, className })}
      onClick={(event) => {
        setPressed(true);
        // A press that started nothing (a check failed first) must not leave this button primed.
        setTimeout(() => {
          if (!loadingNow.current) setPressed(false);
        }, 0);
        onClick?.(event);
      }}
      {...props}
    >
      {turning && <Spinner />}
      {children}
    </button>
  );
}
