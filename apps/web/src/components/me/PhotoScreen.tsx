"use client";

import { Camera, Check, ImagePlus, Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { messageOf } from "@/components/auth/post-json";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { signedOut } from "@/components/security/MfaSetup";
import { Button } from "@/components/ui/Button";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { clampCrop, MAX_ZOOM, MIN_ZOOM, type Crop } from "@/lib/crop";
import { cropToJpeg } from "@/lib/crop-canvas";
import { removePhoto, uploadPhoto } from "@/lib/profile-client";

export function PhotoScreen() {
  return <MeGate needs="onboarded">{(me) => <Photo me={me} />}</MeGate>;
}

/** The square the person moves their picture inside, in pixels. */
const VIEW = 280;
/** A phone camera picture is a few MB; anything far past that is not a photo we can open here. */
const MAX_PICK_BYTES = 30 * 1024 * 1024;
const KEY_STEP = 12;

type Picked = Readonly<{ url: string; width: number; height: number }>;

/**
 * Choose, frame and save a profile picture. The person slides and zooms inside a circle; only the
 * chosen square is sent, already small, and the server redraws it once more and keeps it private.
 */
function Photo({ me }: Readonly<{ me: Me }>) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; from: Crop } | null>(null);
  const [url, setUrl] = useState<string>();
  const [picked, setPicked] = useState<Picked>();
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState<"save" | "remove">();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  // The browser keeps a chosen file's preview in memory until it is told to let go.
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  if (me.photosEnabled === false) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
        <ScreenHeader title="Profile picture" backHref="/me" />
        <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-[15px] leading-6 text-ink-muted">
          Profile pictures aren&apos;t switched on yet. Check back soon.
        </p>
      </main>
    );
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError(undefined);
    setDone(undefined);
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return setError("Choose a JPEG, PNG or WebP picture.");
    }
    if (file.size > MAX_PICK_BYTES) return setError("That picture is too large to open here.");
    setPicked(undefined);
    setCrop({ zoom: 1, x: 0, y: 0 });
    setUrl(URL.createObjectURL(file));
  }

  function loaded() {
    const img = image.current;
    if (img && url) setPicked({ url, width: img.naturalWidth, height: img.naturalHeight });
  }

  const move = (next: Crop) =>
    picked && setCrop(clampCrop(picked.width, picked.height, VIEW, next));

  function down(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, from: crop };
  }
  function slide(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start) return;
    move({
      zoom: start.from.zoom,
      x: start.from.x + event.clientX - start.x,
      y: start.from.y + event.clientY - start.y,
    });
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [KEY_STEP, 0],
      ArrowRight: [-KEY_STEP, 0],
      ArrowUp: [0, KEY_STEP],
      ArrowDown: [0, -KEY_STEP],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    move({ ...crop, x: crop.x + step[0], y: crop.y + step[1] });
  }

  async function save() {
    const img = image.current;
    if (!img || !picked) return;
    setError(undefined);
    setBusy("save");
    const blob = await cropToJpeg(img, VIEW, crop);
    if (!blob) {
      setBusy(undefined);
      return setError("We couldn't prepare that picture. Try another one.");
    }
    const result = await uploadPhoto(blob);
    setBusy(undefined);
    if (signedOut(result)) return router.replace("/sign-in");
    if (!result.ok) return setError(messageOf(result));
    setUrl(undefined);
    setPicked(undefined);
    router.push("/me");
  }

  async function remove() {
    setError(undefined);
    setDone(undefined);
    setBusy("remove");
    const result = await removePhoto();
    setBusy(undefined);
    if (signedOut(result)) return router.replace("/sign-in");
    if (!result.ok) return setError(messageOf(result));
    router.push("/me");
  }

  const has = me.photoVersion != null;
  // The picture sits so that its shorter side fills the view at zoom 1, then scales and slides.
  const fit = picked ? VIEW / Math.min(picked.width, picked.height) : 1;
  const style = picked
    ? {
        width: picked.width * fit * crop.zoom,
        height: picked.height * fit * crop.zoom,
        transform: `translate(${crop.x}px, ${crop.y}px)`,
      }
    : undefined;

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title="Profile picture"
        subtitle="Shown to you and the friends you add. Never to anyone else."
        backHref="/me"
      />
      <div className="grid justify-items-center gap-5">
        {url ? (
          <>
            <div
              role="application"
              aria-label="Move the picture to frame it. Use the arrow keys, or drag."
              tabIndex={0}
              onPointerDown={down}
              onPointerMove={slide}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              onKeyDown={key}
              style={{ width: VIEW, height: VIEW, touchAction: "none" }}
              className="relative grid cursor-grab touch-none place-items-center overflow-hidden rounded-full bg-surface-sunken ring-4 ring-primary/30 active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file */}
              <img
                ref={image}
                src={url}
                alt=""
                draggable={false}
                onLoad={loaded}
                onError={() => {
                  setUrl(undefined);
                  setError("We couldn't open that picture. Try another one.");
                }}
                style={style}
                className="max-w-none select-none"
              />
            </div>
            <div className="flex w-full items-center gap-3">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => move({ ...crop, zoom: crop.zoom - 0.25 })}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken"
              >
                <Minus aria-hidden className="size-5" />
              </button>
              <input
                type="range"
                aria-label="Zoom"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={crop.zoom}
                onChange={(e) => move({ ...crop, zoom: Number(e.target.value) })}
                className="h-2 w-full accent-[var(--color-primary)]"
              />
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => move({ ...crop, zoom: crop.zoom + 0.25 })}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken"
              >
                <Plus aria-hidden className="size-5" />
              </button>
            </div>
            {error && (
              <p role="alert" className="text-[15px] font-medium text-danger">
                {error}
              </p>
            )}
            <div className="grid w-full gap-3">
              <Button
                size="lg"
                block
                loading={busy === "save"}
                disabled={!!busy || !picked}
                onClick={() => void save()}
              >
                <Check aria-hidden className="size-5" />
                {busy === "save" ? "Saving…" : "Use this picture"}
              </Button>
              <Button
                variant="quiet"
                size="lg"
                block
                disabled={!!busy}
                onClick={() => {
                  setUrl(undefined);
                  setPicked(undefined);
                }}
              >
                Choose another
              </Button>
            </div>
          </>
        ) : (
          <>
            <PersonPhoto
              username={me.username}
              version={me.photoVersion}
              name={me.displayName}
              size={144}
            />
            {done && (
              <p role="status" className="text-[15px] font-medium text-leaf">
                {done}
              </p>
            )}
            {error && (
              <p role="alert" className="text-[15px] font-medium text-danger">
                {error}
              </p>
            )}
            <div className="grid w-full gap-3">
              <Button size="lg" block disabled={!!busy} onClick={() => input.current?.click()}>
                {has ? (
                  <Camera aria-hidden className="size-5" />
                ) : (
                  <ImagePlus aria-hidden className="size-5" />
                )}
                {has ? "Change picture" : "Choose a picture"}
              </Button>
              {has && (
                <Button
                  variant="quiet"
                  size="lg"
                  block
                  loading={busy === "remove"}
                  disabled={!!busy}
                  onClick={() => void remove()}
                >
                  <Trash2 aria-hidden className="size-5" />
                  {busy === "remove" ? "Removing…" : "Remove picture"}
                </Button>
              )}
            </div>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choose a picture from your phone"
          className="sr-only"
          tabIndex={-1}
          onChange={choose}
        />
      </div>
    </main>
  );
}
