// v1.03 boss variety: random modifiers per ascension boss, the asc-45 "Core Signal" mini-boss, the Endless
// "Core Echo" every 10 depths, and the automation rule (only every 5th ascension needs a fight).
import type { Language } from "./i18n";

export type L6 = [en: string, tr: string, pt: string, es: string, ru: string, zh: string];
export const pick6 = (language: Language, t: L6): string =>
  language === "tr" ? t[1] : language === "pt-BR" ? t[2] : language === "es" ? t[3] : language === "ru" ? t[4] : language === "zh-CN" ? t[5] : t[0];

export type BossModifierId = "armored" | "swift" | "regen" | "evasive" | "bulky" | "jammed";
export const BOSS_MODIFIERS: Record<BossModifierId, { name: L6; desc: L6 }> = {
  armored: {
    name: ["Armored", "Zırhlı", "Blindado", "Blindado", "Бронированный", "装甲"],
    desc: ["Normal hits -30%. Crits and weak spots pierce.", "Normal vuruşlar -%30. Kritik ve zayıf noktalar deler.", "Golpes normais -30%. Críticos e pontos fracos perfuram.", "Golpes normales -30%. Críticos y puntos débiles perforan.", "Обычные удары -30%. Криты и слабые точки пробивают.", "普通攻击 -30%。暴击和弱点可穿透。"],
  },
  swift: {
    name: ["Swift", "Hızlı", "Veloz", "Veloz", "Стремительный", "迅捷"],
    desc: ["20% less time.", "%20 daha az süre.", "20% menos tempo.", "20% menos tiempo.", "На 20% меньше времени.", "时间减少 20%。"],
  },
  regen: {
    name: ["Regenerating", "Yenilenen", "Regenerativo", "Regenerativo", "Регенерация", "再生"],
    desc: ["Heals 1.5% HP per second.", "Saniyede %1.5 can yeniler.", "Cura 1,5% de vida por segundo.", "Cura 1,5% de vida por segundo.", "Лечит 1,5% HP в секунду.", "每秒恢复 1.5% 生命。"],
  },
  evasive: {
    name: ["Evasive", "Kaçamak", "Evasivo", "Evasivo", "Увёртливый", "闪避"],
    desc: ["Weak spots vanish faster.", "Zayıf noktalar daha hızlı kaybolur.", "Pontos fracos somem mais rápido.", "Los puntos débiles desaparecen antes.", "Слабые точки исчезают быстрее.", "弱点消失得更快。"],
  },
  bulky: {
    name: ["Bulky", "İri", "Robusto", "Robusto", "Массивный", "庞大"],
    desc: ["+25% HP.", "+%25 can.", "+25% de vida.", "+25% de vida.", "+25% HP.", "生命 +25%。"],
  },
  jammed: {
    name: ["Jammed", "Karışık Sinyal", "Interferido", "Interferido", "Помехи", "干扰"],
    desc: ["No breach sequences.", "Sızma dizileri yok.", "Sem sequências de invasão.", "Sin secuencias de brecha.", "Без последовательностей взлома.", "没有突破序列。"],
  },
};
const MODIFIER_ORDER: BossModifierId[] = ["armored", "swift", "regen", "evasive", "bulky", "jammed"];

export type BossKind = "normal" | "signal" | "echo";
export interface BossVariant {
  kind: BossKind;
  modifiers: BossModifierId[];
  // Echo only: which Endless depth this Core Echo guards (10, 20, ...).
  depth?: number;
}

export const SIGNAL_BOSS_ASCENSION = 45;
const FINALE_ASCENSION = 50;
export const ECHO_EVERY_DEPTHS = 10;
// Reward multipliers on the ascension's prestige gain.
export const ECHO_PRESTIGE_MULTIPLIER = 1.5;

// Deterministic per ascension, so a lost fight cannot be re-rolled into an easier one.
const seeded = (seed: number) => {
  let s = (seed * 2654435761) >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};
const pickModifiers = (seed: number, count: number): BossModifierId[] => {
  const r = seeded(seed);
  const pool = [...MODIFIER_ORDER];
  const out: BossModifierId[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
};

/** The boss guarding the next ascension (currentAscensions + 1). */
export const getBossVariant = (currentAscensions: number): BossVariant => {
  const target = currentAscensions + 1;
  if (target === SIGNAL_BOSS_ASCENSION) return { kind: "signal", modifiers: [] };
  const depth = target - FINALE_ASCENSION;
  if (depth > 0 && depth % ECHO_EVERY_DEPTHS === 0) {
    const tier = depth / ECHO_EVERY_DEPTHS;
    return { kind: "echo", depth, modifiers: pickModifiers(target, Math.min(3, 1 + Math.floor(tier / 2))) };
  }
  const count = target >= 30 ? 2 : target >= 10 ? 1 : 0;
  return { kind: "normal", modifiers: pickModifiers(target, count) };
};

export const isSpecialBoss = (currentAscensions: number): boolean => getBossVariant(currentAscensions).kind !== "normal";

/** With automation on, only every 5th ascension (and every special boss) is fought; the rest auto-win. */
export const shouldSkipBossFight = (currentAscensions: number, automationOn: boolean): boolean =>
  automationOn && !isSpecialBoss(currentAscensions) && (currentAscensions + 1) % 5 !== 0;
