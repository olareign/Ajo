"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  FileText,
  House,
  Lock,
  Orbit,
  Pause,
  PiggyBank,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleRing, type RingMember } from "@/components/CircleRing";
import { cn } from "@/lib/cn";
import { SAMPLE_CIRCLE } from "@/lib/sample-circle";

const NGN_PRESETS = [25_000, 50_000, 100_000, 200_000] as const;
const GBP_PRESETS = [50, 100, 250, 500] as const;

type Currency = "NGN" | "GBP";

function formatMoney(amount: number, currency: Currency): string {
  if (currency === "NGN") {
    return `₦${amount.toLocaleString("en-NG")}`;
  }
  return `£${amount.toLocaleString("en-GB")}`;
}

// People who ask their device for less motion get the demo paused until they press play.
const STILL = "(prefers-reduced-motion: reduce)";
const stillQuery = () =>
  typeof window.matchMedia === "function" ? window.matchMedia(STILL) : null;
function subscribeStill(onChange: () => void): () => void {
  const query = stillQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

export function DesktopDashboardMockup({ photos = [] }: Readonly<{ photos?: readonly string[] }>) {
  const mockupRef = useRef<HTMLDivElement>(null);
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [contribution, setContribution] = useState<number>(50_000);
  const [selectedRecipient, setSelectedRecipient] = useState<number>(2); // Default to Funmi (Index 2)
  const [simulateMissed, setSimulateMissed] = useState<boolean>(false);

  // Automated self-playing demo state
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);
  const prefersStill = useSyncExternalStore(
    subscribeStill,
    () => stillQuery()?.matches ?? false,
    () => false,
  );
  const [chosePlay, setChosePlay] = useState(false);
  const playing = isAutoPlaying && (!prefersStill || chosePlay);
  const [lastClickedElement, setLastClickedElement] = useState<string>("turn-2");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState<boolean>(false);
  const [currentStepLabel, setCurrentStepLabel] = useState<string>("Interactive Tour");
  const autoStepRef = useRef<number>(0);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const presets = currency === "NGN" ? NGN_PRESETS : GBP_PRESETS;
  const totalPot = contribution * SAMPLE_CIRCLE.length;

  function triggerUserAction(actionKey: string, callback: () => void) {
    // When a real user interacts, pause auto-play for 9 seconds
    setIsAutoPlaying(false);
    setIsClicking(false);
    setLastClickedElement(actionKey);
    callback();

    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 9000);
  }

  // Update cursor position to center of target element
  const alignCursorTo = (targetId: string, label: string) => {
    if (!mockupRef.current) return;
    const target = mockupRef.current.querySelector(
      `[data-demo-id="${targetId}"]`,
    ) as HTMLElement | null;
    if (target) {
      const parentRect = mockupRef.current.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      setCursorPos({
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top + rect.height / 2,
      });
      setCurrentStepLabel(label);
    }
  };

  // Self-playing interactive automation loop with simulated cursor movement & realistic clicks
  useEffect(() => {
    if (!playing) return;
    // Every step schedules a click and its result; all of them stop when the demo pauses or the
    // page goes away, so nothing changes state after that.
    const pending: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      pending.push(setTimeout(fn, ms));
    };

    const runStep = () => {
      const stepIndex = autoStepRef.current % 7;
      autoStepRef.current += 1;

      switch (stepIndex) {
        case 0:
          // Move cursor to Preset 100,000 and click
          alignCursorTo("preset-100000", "Adjusting monthly contribution");
          later(() => {
            setIsClicking(true);
            setLastClickedElement("preset-100000");
            later(() => {
              setContribution(100_000);
              setIsClicking(false);
            }, 300);
          }, 700);
          break;

        case 1:
          // Move cursor to Turn 4 (Chidi) and click
          alignCursorTo("turn-3", "Selecting Turn #4 (Chidi)");
          later(() => {
            setIsClicking(true);
            setLastClickedElement("turn-3");
            later(() => {
              setSelectedRecipient(3);
              setIsClicking(false);
            }, 300);
          }, 700);
          break;

        case 2:
          // Move cursor to the deposit toggle switch and turn ON
          alignCursorTo("toggle-shield", "Simulating missed payment");
          later(() => {
            setIsClicking(true);
            setLastClickedElement("toggle-shield");
            later(() => {
              setSimulateMissed(true);
              setIsClicking(false);
            }, 300);
          }, 700);
          break;

        case 3:
          // Move cursor to Turn 2 (Babatunde) and click
          alignCursorTo("turn-1", "Inspecting Turn #2 (Babatunde)");
          later(() => {
            setIsClicking(true);
            setLastClickedElement("turn-1");
            later(() => {
              setSelectedRecipient(1);
              setIsClicking(false);
            }, 300);
          }, 700);
          break;

        case 4:
          // Move cursor to the deposit toggle switch and turn OFF
          alignCursorTo("toggle-shield", "Restoring normal rotation");
          later(() => {
            setIsClicking(true);
            setLastClickedElement("toggle-shield");
            later(() => {
              setSimulateMissed(false);
              setIsClicking(false);
            }, 300);
          }, 700);
          break;

        case 5:
          // Move cursor to Preset 50,000 and click
          alignCursorTo("preset-50000", "Resetting share to ₦50,000");
          later(() => {
            setIsClicking(true);
            setLastClickedElement("preset-50000");
            later(() => {
              setContribution(50_000);
              setIsClicking(false);
            }, 300);
          }, 700);
          break;

        case 6:
          // Move cursor to Turn 3 (Funmi) and click
          alignCursorTo("turn-2", "Inspecting Turn #3 (Funmi)");
          later(() => {
            setIsClicking(true);
            setLastClickedElement("turn-2");
            later(() => {
              setSelectedRecipient(2);
              setIsClicking(false);
            }, 300);
          }, 700);
          break;

        default:
          break;
      }
    };

    // Initial positioning after component mount
    const initialTimer = setTimeout(() => {
      runStep();
    }, 1200);

    const interval = setInterval(runStep, 3800);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      pending.forEach(clearTimeout);
    };
  }, [playing]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  function handleCurrencyChange(next: Currency) {
    triggerUserAction(`currency-${next}`, () => {
      setCurrency(next);
      setContribution(next === "NGN" ? 50_000 : 100);
    });
  }

  const members: RingMember[] = SAMPLE_CIRCLE.map((member, i) => {
    let status: RingMember["status"] = member.status;
    if (simulateMissed && i === 3) {
      status = "covered";
    }
    return {
      name: member.name,
      status,
      photo: photos[i],
    };
  });

  const currentMember = SAMPLE_CIRCLE[selectedRecipient];

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* Floating Context Chips */}
      <div className="pointer-events-none absolute -top-4 left-6 z-20 hidden items-center gap-2 rounded-full border border-line bg-surface-raised/95 px-4 py-1.5 text-xs font-bold text-ink shadow-lg backdrop-blur-md transition-all xl:flex animate-fade-in">
        <span className="flex size-5 items-center justify-center rounded-full bg-leaf-tint text-leaf">
          <CheckCircle2 className="size-3.5" />
        </span>
        <span>Auto-paid monthly • No manual stress</span>
      </div>

      <div className="pointer-events-none absolute -top-4 right-8 z-20 hidden items-center gap-2 rounded-full border border-line bg-surface-raised/95 px-4 py-1.5 text-xs font-bold text-ink shadow-lg backdrop-blur-md transition-all xl:flex animate-fade-in">
        <span className="flex size-5 items-center justify-center rounded-full bg-oro-tint text-oro-ink">
          <Sparkles className="size-3.5" />
        </span>
        <span>Missed shares covered by deposits</span>
      </div>

      {/* Main App Window Container */}
      <div
        ref={mockupRef}
        className="relative overflow-hidden rounded-[20px] sm:rounded-[26px] border border-line/90 bg-surface-raised shadow-2xl transition-all"
      >
        {/* Animated Virtual User Cursor (Simulates user clicks across mockup) */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute z-50 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
            playing && cursorPos.x > 0 ? "opacity-100" : "opacity-0 scale-75",
          )}
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            transform: "translate(-3px, -3px)",
          }}
        >
          <div
            className={cn(
              "relative transition-transform duration-150",
              isClicking && "scale-75 translate-y-0.5",
            )}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
              <path
                d="M3 3L10.07 20.97L13.58 13.58L20.97 10.07L3 3Z"
                fill="var(--primary)"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            {isClicking && (
              <span className="pointer-events-none absolute -left-2 -top-2 size-8 rounded-full border-2 border-primary/70 bg-primary/25 animate-ping" />
            )}
            <div className="absolute left-5 top-3 whitespace-nowrap rounded-full border border-line bg-surface-raised/95 px-2.5 py-0.5 text-[10px] font-bold text-ink shadow-md backdrop-blur-xs flex items-center gap-1.5 animate-fade-in">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span>{currentStepLabel}</span>
            </div>
          </div>
        </div>

        {/* Window Chrome Titlebar */}
        <div className="flex h-10 sm:h-11 items-center justify-between border-b border-line bg-surface-sunken/80 px-3 sm:px-4 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="size-2.5 sm:size-3 rounded-full bg-[#ff5f56]" />
            <span className="size-2.5 sm:size-3 rounded-full bg-[#ffbd2e]" />
            <span className="size-2.5 sm:size-3 rounded-full bg-[#27c93f]" />
          </div>

          <div className="flex items-center gap-2 rounded-md bg-surface-raised/80 px-2.5 sm:px-3 py-0.5 sm:py-1 font-mono text-[10px] sm:text-[11px] font-medium text-ink-muted border border-line/50">
            <Lock className="size-3 text-leaf" />
            <span>ajolabs.com/today</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Play status indicator */}
            <button
              type="button"
              onClick={() => {
                setChosePlay(true);
                setIsAutoPlaying(!playing);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-raised px-2.5 py-0.5 text-[10px] font-semibold text-ink-muted hover:text-ink transition-colors"
            >
              {playing ? (
                <>
                  <span className="size-1.5 rounded-full bg-primary animate-ping" />
                  <span>Auto-demo playing</span>
                  <Pause className="size-2.5 opacity-60" />
                </>
              ) : (
                <>
                  <Play className="size-2.5 text-primary" />
                  <span>Play demo</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-leaf">
              <span className="size-2 rounded-full bg-leaf animate-pulse" />
              <span className="hidden sm:inline">Live Rails</span>
            </div>
          </div>
        </div>

        {/* Dashboard Workspace */}
        <div className="flex flex-col md:flex-row md:divide-x divide-line min-h-[500px]">
          {/* Simulated App Sidebar (Desktop only) */}
          <aside className="hidden w-52 flex-col justify-between bg-surface-sunken/40 p-4 md:flex shrink-0">
            <div className="space-y-5">
              <div className="flex items-center gap-2 px-1">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-on-primary font-bold text-xs shadow-xs">
                  À
                </div>
                <div className="leading-tight">
                  <span className="block text-xs font-bold tracking-tight">Àjọ App</span>
                  <span className="block text-[9px] text-ink-muted font-medium">
                    Smart Èsúsú Rails
                  </span>
                </div>
              </div>

              {/* Sidebar Navigation */}
              <nav className="space-y-1">
                {[
                  { name: "Overview", icon: House, active: true },
                  { name: "Wallet", icon: Wallet, active: false },
                  { name: "Circles", icon: Orbit, active: false },
                  { name: "Save Pots", icon: PiggyBank, active: false },
                  { name: "Friends", icon: Users, active: false },
                  { name: "Statements", icon: FileText, active: false },
                  { name: "Insights", icon: BarChart3, active: false },
                ].map((item) => (
                  <div
                    key={item.name}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all",
                      item.active
                        ? "bg-primary-tint text-primary font-bold shadow-xs"
                        : "text-ink-muted hover:bg-surface-raised hover:text-ink",
                    )}
                  >
                    <item.icon className="size-3.5 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                ))}
              </nav>
            </div>

            {/* User Profile Chip */}
            <div className="border-t border-line pt-3">
              <div className="flex items-center gap-2 rounded-xl p-2 bg-surface-raised/70 border border-line/60">
                <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-leaf text-[11px] font-bold text-on-primary shadow-xs">
                  AO
                </div>
                <div className="min-w-0 flex-1 leading-tight text-left">
                  <p className="truncate text-xs font-bold text-ink">Ada Ola</p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-leaf">
                    <span className="size-1 rounded-full bg-leaf" />
                    Tier 1 Verified
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Simulated Dashboard Canvas */}
          <div className="flex-1 flex flex-col min-w-0 bg-surface">
            {/* Sub-header with greetings and currency toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 sm:px-6 py-3.5 bg-surface-raised/40">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-ink">Overview & Circle Board</h2>
                <p className="text-[11px] sm:text-xs text-ink-muted">
                  Manage your rotational turns and savings
                </p>
              </div>

              {/* Currency Selector */}
              <div
                role="radiogroup"
                aria-label="Simulation currency"
                className="flex items-center rounded-full border border-line bg-surface-sunken p-1 shadow-xs"
              >
                <button
                  type="button"
                  role="radio"
                  data-demo-id="currency-NGN"
                  aria-checked={currency === "NGN"}
                  onClick={() => handleCurrencyChange("NGN")}
                  className={cn(
                    "rounded-full px-2.5 sm:px-3 py-1 text-xs font-bold transition-all",
                    currency === "NGN"
                      ? "bg-surface-raised text-primary shadow-xs"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  ₦ NGN
                </button>
                <button
                  type="button"
                  role="radio"
                  data-demo-id="currency-GBP"
                  aria-checked={currency === "GBP"}
                  onClick={() => handleCurrencyChange("GBP")}
                  className={cn(
                    "rounded-full px-2.5 sm:px-3 py-1 text-xs font-bold transition-all",
                    currency === "GBP"
                      ? "bg-surface-raised text-primary shadow-xs"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  £ GBP
                </button>
              </div>
            </div>

            {/* Dashboard Content Grid */}
            <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-12">
              {/* Left Column: Live Pot / Recipient Spotlight (7 cols on xl) */}
              <div className="space-y-6 xl:col-span-7">
                {/* Balance & Round Card */}
                <div className="rounded-2xl border border-line bg-gradient-to-br from-surface-raised to-surface-sunken/40 p-4 sm:p-5 shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Active Circle Pot • Round {selectedRecipient + 1} of 8
                      </span>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink transition-all">
                          {formatMoney(totalPot, currency)}
                        </span>
                        <span className="rounded-full bg-leaf-tint px-2 py-0.5 text-[10px] font-bold text-leaf">
                          100% Funded
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        Recipient:{" "}
                        <strong className="text-ink transition-colors">
                          {currentMember?.name}
                        </strong>{" "}
                        • Scheduled Payout: 1st of month
                      </p>
                    </div>

                    <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary shadow-xs">
                      <Wallet className="size-4 sm:size-5" />
                    </div>
                  </div>

                  {/* Contribution Preset Steppers */}
                  <div className="mt-4 sm:mt-5 border-t border-line/70 pt-3 sm:pt-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink-muted mb-2">
                      <span>Monthly share per member:</span>
                      <span className="text-primary font-bold transition-all">
                        {formatMoney(contribution, currency)} / month
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {presets.map((preset) => {
                        const active = contribution === preset;
                        const wasAutoClicked = lastClickedElement === `preset-${preset}`;
                        const isSimClick = wasAutoClicked && isClicking;
                        return (
                          <button
                            key={preset}
                            type="button"
                            data-demo-id={`preset-${preset}`}
                            onClick={() =>
                              triggerUserAction(`preset-${preset}`, () => setContribution(preset))
                            }
                            className={cn(
                              "relative rounded-lg border py-2 text-center text-xs font-bold transition-all duration-200 overflow-hidden",
                              active
                                ? "border-primary bg-primary text-on-primary shadow-sm scale-102 ring-2 ring-primary/30"
                                : "border-line bg-surface-raised text-ink hover:bg-surface-sunken",
                              isSimClick && "scale-95 ring-4 ring-primary/60 shadow-inner",
                            )}
                          >
                            {isSimClick && (
                              <span className="pointer-events-none absolute inset-0 rounded-lg bg-white/40 animate-ping" />
                            )}
                            {formatMoney(preset, currency)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Ledger Activity Stream */}
                <div className="rounded-2xl border border-line bg-surface-raised p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Real-Time Circle Ledger
                    </h3>
                    <span className="text-[11px] font-semibold text-primary">Live Audit</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between rounded-xl bg-surface-sunken/60 p-3 text-xs transition-colors">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-leaf-tint text-leaf">
                          <ArrowDownLeft className="size-4" />
                        </span>
                        <div>
                          <p className="font-bold text-ink">
                            Turn {selectedRecipient + 1} Lump Sum Payout
                          </p>
                          <p className="text-[10px] text-ink-muted">
                            Sent to {currentMember?.name}&apos;s wallet
                          </p>
                        </div>
                      </div>
                      <span className="font-display font-bold text-leaf text-right">
                        +{formatMoney(totalPot, currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-surface-sunken/60 p-3 text-xs">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                          <ArrowUpRight className="size-4" />
                        </span>
                        <div>
                          <p className="font-bold text-ink">Automated Monthly Contribution</p>
                          <p className="text-[10px] text-ink-muted">
                            Auto-debit from connected bank account
                          </p>
                        </div>
                      </div>
                      <span className="font-display font-bold text-ink text-right">
                        -{formatMoney(contribution, currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-surface-sunken/60 p-3 text-xs">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-oro-tint text-oro-ink">
                          <ShieldCheck className="size-4" />
                        </span>
                        <div>
                          <p className="font-bold text-ink">Security Deposit</p>
                          <p className="text-[10px] text-ink-muted">
                            Locked reserve pool for missed turns
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-leaf text-[11px]">Protected</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Circle Wheel & Turn Selector (5 cols on xl) */}
              <div className="space-y-6 xl:col-span-5">
                <div className="rounded-2xl border border-line bg-surface-raised p-4 sm:p-5 shadow-sm flex flex-col items-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted self-start mb-2">
                    Visual Rotation Board
                  </span>

                  <div className="py-2 max-w-full overflow-hidden flex justify-center transition-transform">
                    <CircleRing
                      members={members}
                      recipient={selectedRecipient}
                      title={`Interactive circle round ${selectedRecipient + 1}`}
                      center={{
                        label: `ROUND ${selectedRecipient + 1}`,
                        value: formatMoney(totalPot, currency),
                      }}
                      size={230}
                      roll={false}
                    />
                  </div>

                  {/* Seat / Turn Scrubber */}
                  <div className="w-full mt-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink-muted mb-2">
                      <span>Click turn to inspect:</span>
                      <span className="text-primary font-bold">
                        Turn {selectedRecipient + 1} of 8
                      </span>
                    </div>
                    <div
                      className="grid grid-cols-4 sm:grid-cols-8 gap-1.5"
                      role="tablist"
                      aria-label="Circle turns"
                    >
                      {SAMPLE_CIRCLE.map((m, idx) => {
                        const isSelected = idx === selectedRecipient;
                        const wasAutoClicked = lastClickedElement === `turn-${idx}`;
                        const isSimClick = wasAutoClicked && isClicking;
                        return (
                          <button
                            key={m.name}
                            type="button"
                            role="tab"
                            data-demo-id={`turn-${idx}`}
                            aria-selected={isSelected}
                            aria-label={`Select Turn ${idx + 1}: ${m.name}`}
                            onClick={() =>
                              triggerUserAction(`turn-${idx}`, () => setSelectedRecipient(idx))
                            }
                            className={cn(
                              "relative rounded-lg py-2 text-xs font-bold transition-all duration-200 text-center overflow-hidden",
                              isSelected
                                ? "bg-oro text-on-oro shadow-md scale-108 ring-2 ring-oro/40"
                                : "border border-line bg-surface-sunken text-ink-muted hover:text-ink",
                              isSimClick && "scale-95 ring-4 ring-oro/60 shadow-inner",
                            )}
                          >
                            {isSimClick && (
                              <span className="pointer-events-none absolute inset-0 rounded-lg bg-white/40 animate-ping" />
                            )}
                            #{idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Deposit Safety Shield Demo Toggle */}
                  <div className="w-full mt-4 sm:mt-5 border-t border-line/70 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full text-xs transition-colors",
                            simulateMissed
                              ? "bg-tertiary-tint text-tertiary"
                              : "bg-leaf-tint text-leaf",
                          )}
                        >
                          {simulateMissed ? (
                            <ShieldAlert className="size-3.5" />
                          ) : (
                            <ShieldCheck className="size-3.5" />
                          )}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-ink">Deposit Reserve</p>
                          <p className="text-[10px] text-ink-muted">
                            Simulate someone missing a payment
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        data-demo-id="toggle-shield"
                        aria-checked={simulateMissed}
                        aria-label="Simulate missed payment"
                        onClick={() =>
                          triggerUserAction("toggle-shield", () =>
                            setSimulateMissed(!simulateMissed),
                          )
                        }
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          simulateMissed ? "bg-tertiary" : "bg-line-strong/40",
                          lastClickedElement === "toggle-shield" &&
                            isClicking &&
                            "scale-90 ring-4 ring-tertiary/40",
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200",
                            simulateMissed ? "translate-x-4" : "translate-x-0",
                          )}
                        />
                      </button>
                    </div>

                    {simulateMissed && (
                      <div className="mt-3 rounded-xl bg-tertiary-tint/70 p-2.5 text-[11px] leading-relaxed text-ink animate-fade-in">
                        <strong>Auto-covered:</strong> Chidi&apos;s locked deposit covered their
                        share. {currentMember?.name} still gets the full{" "}
                        <strong>{formatMoney(totalPot, currency)}</strong> on time!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
