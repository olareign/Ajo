import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClass, type ButtonProps } from "./Button";

type Props = ComponentProps<typeof Link> & Pick<ButtonProps, "variant" | "size" | "block">;

/** A link that looks like a Button: for moving to another screen, where a real link is right. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  block,
  className,
  ...props
}: Props) {
  return (
    <Link
      data-variant={variant}
      data-size={size}
      className={buttonClass({ variant, size, block, className })}
      {...props}
    />
  );
}
