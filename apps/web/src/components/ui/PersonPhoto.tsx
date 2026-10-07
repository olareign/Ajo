"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";
import { Initials } from "./Initials";

type Props = Readonly<{
  /** Whose picture. Without a username (or a version), the stand-in shows. */
  username?: string | null;
  /** When the picture was last set; it changes the address, so a new picture shows at once. */
  version?: number | null;
  /** The name, for the initials stand-in. */
  name: string;
  size?: number;
  /** What shows without a picture: the head-and-shoulders bead, or initials. */
  standIn?: "avatar" | "initials";
  className?: string;
}>;

export const photoSrc = (username: string, version: number) =>
  `/api/photo/${encodeURIComponent(username)}?v=${version}`;

/**
 * A person's picture in a circle, or a stand-in when they have none (or it cannot be loaded). The
 * picture is private: it comes through our own server, which only serves it to the person and the
 * people they are connected to.
 */
export function PersonPhoto({
  username,
  version,
  name,
  size = 44,
  standIn = "avatar",
  className,
}: Props) {
  const src = username && version ? photoSrc(username, version) : null;
  return src ? (
    <Picture key={src} src={src} {...{ name, size, standIn, className }} />
  ) : (
    <StandIn {...{ name, size, standIn }} />
  );
}

function StandIn({ name, size, standIn }: Pick<Props, "name" | "standIn"> & { size: number }) {
  return standIn === "initials" ? <Initials name={name} size={size} /> : <Avatar size={size} />;
}

function Picture({
  src,
  name,
  size,
  standIn,
  className,
}: Readonly<{
  src: string;
  name: string;
  size: number;
  standIn: "avatar" | "initials";
  className?: string;
}>) {
  const [broken, setBroken] = useState(false);
  if (broken) return <StandIn {...{ name, size, standIn }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private, already 512px WebP, served by our own route
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      decoding="async"
      onError={() => setBroken(true)}
      style={{ width: size, height: size }}
      className={cn(
        "shrink-0 rounded-full bg-surface-sunken object-cover ring-2 ring-primary/40",
        className,
      )}
    />
  );
}
