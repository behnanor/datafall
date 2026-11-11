// v1.04 run variety UI: the Network Event banner (bottom centre), the Run Protocol picker and its status chip.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Language } from "@/lib/i18n";
import { pick6 } from "@/lib/bossVariants";
import {
  getNetworkEvent,
  getRunProtocol,
  NETWORK_EVENT_UI,
  SIGNAL_FORK_OPTIONS,
  STANDARD_PROTOCOL_TEXT,
  type ActiveNetworkEvent,
  type RunProtocol,
  type RunProtocolId,
  type RunProtocolState,
  type RunProtocolStyle,
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

export function NetworkEventBanner({ event, language, onRespond, shiftX = 0 }: {
  event: ActiveNetworkEvent | null;
  shiftX?: number;
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
          className="pointer-events-auto fixed bottom-44 z-[30] transition-[left] duration-300 w-[380px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-lg border bg-slate-950/90 px-3 py-2 shadow-lg backdrop-blur-sm"
          style={{ left: `calc(50% + ${shiftX}px)`, borderColor: `${color}80`, boxShadow: `0 0 18px ${color}33` }}
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

// ---- Run Protocols ----
// Radix dialogs (loot box, pet unlock, shops...) block clicks outside themselves, so the picker waits
// until none of them is open.
const useOtherDialogOpen = (enabled: boolean) => {
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    const check = () => setBusy(!!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'));
    check();
    const id = setInterval(check, 400);
    return () => clearInterval(id);
  }, [enabled]);
  return busy;
};

const STYLE_COLORS: Record<RunProtocolStyle, string> = { idle: "#22d3ee", active: "#f472b6", mixed: "#a78bfa" };

export function RunProtocolPicker({ open, offer, language, onChoose, onLater }: {
  open: boolean;
  offer: RunProtocolId[];
  language: Language;
  onChoose: (id: RunProtocolId | null) => void;
  onLater: () => void;
}) {
  const ui = (key: keyof typeof NETWORK_EVENT_UI) => pick6(language, NETWORK_EVENT_UI[key]);
  const protocols = offer.map(id => getRunProtocol(id)).filter((p): p is RunProtocol => !!p);
  const otherDialogOpen = useOtherDialogOpen(open);
  return (
    <AnimatePresence>
      {open && !otherDialogOpen && protocols.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          data-testid="run-protocol-picker"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-3xl rounded-xl border border-violet-400/40 bg-slate-950/95 p-5 shadow-[0_0_40px_rgba(167,139,250,0.25)]"
          >
            <div className="text-center">
              <div className="font-mono text-xs tracking-[0.3em] text-violet-300/70">{ui("protocol")}</div>
              <h2 className="mt-1 text-xl font-bold tracking-wide text-violet-200">{ui("chooseTitle")}</h2>
              <p className="mt-1 text-sm text-white/60">{ui("chooseSub")}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {protocols.map(protocol => {
                const color = STYLE_COLORS[protocol.style];
                return (
                  <button
                    key={protocol.id}
                    type="button"
                    onClick={() => onChoose(protocol.id)}
                    className="group flex flex-col rounded-lg border bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.08]"
                    style={{ borderColor: `${color}66` }}
                    data-testid={`protocol-${protocol.id}`}
                  >
                    <span className="self-start rounded px-1.5 py-0.5 font-mono text-[10px] tracking-widest" style={{ color, background: `${color}1f` }}>
                      {ui(protocol.style)}
                    </span>
                    <span className="mt-2 text-base font-bold" style={{ color }}>{pick6(language, protocol.name)}</span>
                    <span className="mt-1 flex-1 text-sm leading-snug text-white/75">{pick6(language, protocol.desc)}</span>
                    <span className="mt-3 rounded border py-1 text-center text-xs font-semibold transition-colors group-hover:bg-white/10" style={{ borderColor: `${color}80`, color }}>
                      {ui("choose")}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <button type="button" onClick={() => onChoose(null)}
                className="rounded border border-white/25 px-4 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10"
                title={pick6(language, STANDARD_PROTOCOL_TEXT.desc)}>
                {pick6(language, STANDARD_PROTOCOL_TEXT.name)}: {pick6(language, STANDARD_PROTOCOL_TEXT.desc)}
              </button>
              <button type="button" onClick={onLater} className="px-3 py-1.5 text-xs text-white/50 underline-offset-2 hover:underline">
                {ui("later")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Small pill under the top counters: the run's protocol, or a button to choose one.
export function RunProtocolChip({ state, language, onOpenPicker, shiftX = 0 }: {
  state: RunProtocolState;
  shiftX?: number;
  language: Language;
  onOpenPicker: () => void;
}) {
  const ui = (key: keyof typeof NETWORK_EVENT_UI) => pick6(language, NETWORK_EVENT_UI[key]);
  const protocol = getRunProtocol(state.active);
  if (state.pending) {
    return (
      <button type="button" onClick={onOpenPicker}
        className="pointer-events-auto fixed top-[7.4rem] z-[25] transition-[left] duration-300 -translate-x-1/2 animate-pulse rounded-full border border-violet-400/60 bg-slate-950/80 px-3 py-1 font-mono text-[11px] tracking-widest text-violet-200 hover:bg-violet-500/20"
        style={{ left: `calc(50% + ${shiftX}px)` }}
        data-testid="run-protocol-chip">
        {ui("pendingChip")}
      </button>
    );
  }
  if (!protocol) return null;
  const color = STYLE_COLORS[protocol.style];
  return (
    <div
      className="pointer-events-auto fixed top-[7.4rem] z-[25] transition-[left] duration-300 -translate-x-1/2 cursor-help whitespace-nowrap rounded-full border bg-slate-950/70 px-3 py-1 font-mono text-[11px] tracking-wider"
      style={{ left: `calc(50% + ${shiftX}px)`, borderColor: `${color}66`, color }}
      title={pick6(language, protocol.desc)}
      data-testid="run-protocol-chip"
    >
      {ui("protocol")}: {pick6(language, protocol.name)}
    </div>
  );
}
