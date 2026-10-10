"use client";

/** Anything that goes wrong while drawing a page: say so plainly, with a way out, and nothing technical. */
export default function ErrorPage({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-4 px-4 text-center">
      <h1 className="font-display text-[24px] font-bold">Something went wrong</h1>
      <p className="text-[15px] text-ink-muted">
        The console couldn&apos;t draw this page. Reload to try again; if it keeps happening, check
        that the API address is right and the API is running.
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-m bg-primary px-4 font-semibold text-on-primary"
        >
          Try again
        </button>
        <a
          href="/login"
          className="grid min-h-11 place-items-center px-4 font-semibold text-primary"
        >
          Sign-in page
        </a>
      </div>
    </main>
  );
}
