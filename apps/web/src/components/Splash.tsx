import { PiggyBank } from "lucide-react";

/** The green splash screen from Figma; the Phase 0 "hello world" page. */
export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-brand-600 px-6 text-center text-white">
      <PiggyBank role="img" aria-label="Àjọ logo" className="size-32" strokeWidth={1.5} />
      <h1 className="text-3xl font-bold">Àjọ</h1>
      <p className="text-white/90">Save together, with people you trust.</p>
    </div>
  );
}
