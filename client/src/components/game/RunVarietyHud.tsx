// v1.04 run variety UI: the Network Event banner (bottom centre).
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Language } from "@/lib/i18n";
import { pick6 } from "@/lib/bossVariants";
import {
  getNetworkEvent,
  NETWORK_EVENT_UI,
  SIGNAL_FORK_OPTIONS,
  type ActiveNetworkEvent,
} from "@/lib/runVariety";

const useNow = (active: boolean) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [active]);
  return now;
};

const EVENT_COLORS: Record<string, string> = {
  data_surge: "#22d3ee",
  crypto_flare: "#f59e0b",
  market_spike: "#facc15",
  overclock_window: "#f472b6",
  packet_storm: "#a78bfa",
  encrypted_cache: "#34d399",
  rogue_broker: "#fb7185",
  signal_fork: "#60a5fa",
};

export function NetworkEventBanner({ event, language, onRespond }: {
  event: ActiveNetworkEvent | null;
  language: Language;
  onRespond: (answer: "accept" | "decline" | "idle" | "active") => void;
}) {
  const now = useNow(!!event);
  const def = event ? getNetworkEvent(event.id) : null;
  const color = event ? EVENT_COLORS[event.id] ?? "#22d3ee" : "#22d3ee";
  const totalMs = event ? Math.max(1, event.endsAt - event.startedAt) : 1;
  const leftMs = event ? Math.max(0, event.endsAt - now) : 0;
  const leftSec = Math.ceil(leftMs / 1000);
  const ui = (key: keyof typeof NETWORK_EVENT_UI) => pick6(language, NETWORK_EVENT_UI[key]);

  let body: React.ReactNode = null;
  if (event && def) {
    if (event.phase === "offer" && event.id === "signal_fork") {
      body = (
        <div className="mt-2 flex flex-col gap-1.5 sm:flex-row">
          {(["idle", "active"] as const).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => onRespond(option)}
              className="flex-1 rounded border px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
              style={{ borderColor: `${color}99`, color }}
            >
              {pick6(language, SIGNAL_FORK_OPTIONS[option].label)}
            </button>
          ))}
        </div>
      );
    } else if (event.phase === "offer") {
      body = (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => onRespond("accept")}
            className="flex-1 rounded border px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
            style={{ borderColor: `${color}99`, color }}>
            {ui("accept")}
          </button>
          <button type="button" onClick={() => onRespond("decline")}
            className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10">
            {ui("decline")}
          </button>
        </div>
      );
    } else if (event.phase === "active" && event.id === "encrypted_cache") {
      const pct = Math.min(100, ((event.progress ?? 0) / Math.max(1, event.goal ?? 1)) * 100);
      body = (
        <div className="mt-2">
          <div className="h-2 w-full overflow-hidden rounded bg-white/10">
            <div className="h-full rounded transition-[width] duration-100" style={{ width: `${pct}%`, background: color }} />
          </div>
          <div className="mt-1 text-right font-mono text-[11px]" style={{ color }}>{event.progress ?? 0} / {event.goal}</div>
        </div>
      );
    } else if (event.phase === "done" && event.result === "success" && event.rewardText) {
      body = <div className="mt-1 text-sm font-bold" style={{ color }}>{ui("cracked")} {event.rewardText}</div>;
    } else if (event.phase === "done" && event.result === "fail") {
      body = <div className="mt-1 text-sm text-white/60">{ui("cacheFailed")}</div>;
    }
  }

  const showTimer = event && (event.phase === "active" || event.phase === "offer");
  const descText = event && def
    ? (event.phase === "active" && event.chosen
        ? pick6(language, SIGNAL_FORK_OPTIONS[event.chosen].label)
        : pick6(language, def.desc))
    : null;

  return (
    <AnimatePresence>
      {event && def && (
        <motion.div
          key={`${event.id}-${event.startedAt}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto fixed bottom-44 left-1/2 z-[30] w-[380px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-lg border bg-slate-950/90 px-3 py-2 shadow-lg backdrop-blur-sm"
          style={{ borderColor: `${color}80`, boxShadow: `0 0 18px ${color}33` }}
          data-testid="network-event-banner"
          role="status"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[0.2em] text-white/50">{ui("title")}</div>
              <div className="truncate text-sm font-bold tracking-wide" style={{ color }}>{pick6(language, def.name)}</div>
            </div>
            {showTimer && <div className="shrink-0 font-mono text-lg font-bold tabular-nums" style={{ color }}>{leftSec}s</div>}
          </div>
          {descText && event.phase !== "done" && <div className="mt-0.5 text-xs leading-snug text-white/80">{descText}</div>}
          {event.phase === "done" && !event.result?.match(/fail/) && !event.rewardText && descText && (
            <div className="mt-0.5 text-xs leading-snug text-white/80">{descText}</div>
          )}
          {body}
          {showTimer && (
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded bg-white/10">
              <div className="h-full" style={{ width: `${(leftMs / totalMs) * 100}%`, background: color }} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
