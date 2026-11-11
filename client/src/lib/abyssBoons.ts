// v1.04 Endless: Abyss Boons. Every 5 Endless depths the player picks one of three permanent, stacking boons.
// Picks are counted from depth, so saves that are already deep in Endless get their missed picks right away.
// The three offers are seeded by how many boons you already own, so reloading cannot re-roll them.
import type { Language } from "./i18n";
import { pick6, type L6 } from "./bossVariants";

export const ABYSS_BOON_EVERY_DEPTHS = 5;

export type AbyssBoonId =
  | "surge"
  | "miner"
  | "striker"
  | "precision"
  | "lethal"
  | "breach"
  | "chrono"
  | "harvest"
  | "echo_hunter";

export interface AbyssBoonDef {
  id: AbyssBoonId;
  name: L6;
  desc: L6;
  color: string;
  // Run boosts in percent points (same units as cosmetic boosts).
  productionBoost?: number;
  cryptoBoost?: number;
  clickBoost?: number;
  critBoost?: number;
  critDamageBoost?: number;
  // Boss bonuses.
  bossDamagePct?: number;
  bossTimeSeconds?: number;
  // Prestige from boss victories (%), and extra Core Echo multiplier.
  prestigePct?: number;
  echoBonus?: number;
}

export const ABYSS_BOONS: AbyssBoonDef[] = [
  {
    id: "surge", color: "#22d3ee", productionBoost: 20,
    name: ["Abyssal Surge", "Uçurum Dalgası", "Surto Abissal", "Oleada Abisal", "Всплеск бездны", "深渊涌流"],
    desc: ["+20% production", "+%20 üretim", "+20% de produção", "+20% de producción", "+20% производства", "产量 +20%"],
  },
  {
    id: "miner", color: "#f59e0b", cryptoBoost: 20,
    name: ["Deep Ledger", "Derin Defter", "Livro Profundo", "Libro Profundo", "Глубинный реестр", "深层账本"],
    desc: ["+20% crypto", "+%20 kripto", "+20% de cripto", "+20% de cripto", "+20% крипты", "加密币 +20%"],
  },
  {
    id: "striker", color: "#a3e635", clickBoost: 25,
    name: ["Void Fist", "Boşluk Yumruğu", "Punho do Vazio", "Puño del Vacío", "Кулак пустоты", "虚空之拳"],
    desc: ["+25% click power", "+%25 tıklama gücü", "+25% de poder de clique", "+25% de poder de clic", "+25% силы клика", "点击力量 +25%"],
  },
  {
    id: "precision", color: "#f472b6", critBoost: 5,
    name: ["Null Sight", "Boşluk Gözü", "Visão Nula", "Visión Nula", "Нулевой взгляд", "零域之眼"],
    desc: ["+5% crit chance", "+%5 kritik şansı", "+5% de chance de crítico", "+5% de prob. de crítico", "+5% шанса крита", "暴击率 +5%"],
  },
  {
    id: "lethal", color: "#ef4444", critDamageBoost: 30,
    name: ["Fracture Edge", "Kırık Kenar", "Lâmina Fraturada", "Filo Fracturado", "Ломаная грань", "裂隙之刃"],
    desc: ["+30% crit damage", "+%30 kritik hasarı", "+30% de dano crítico", "+30% de daño crítico", "+30% крит. урона", "暴击伤害 +30%"],
  },
  {
    id: "breach", color: "#fb923c", bossDamagePct: 15,
    name: ["Breach Lance", "Sızma Mızrağı", "Lança de Invasão", "Lanza de Brecha", "Копьё взлома", "突破长枪"],
    desc: ["+15% damage against bosses", "Bosslara +%15 hasar", "+15% de dano contra chefes", "+15% de daño contra jefes", "+15% урона по боссам", "对首领伤害 +15%"],
  },
  {
    id: "chrono", color: "#818cf8", bossTimeSeconds: 3,
    name: ["Frozen Clock", "Donmuş Saat", "Relógio Congelado", "Reloj Congelado", "Застывшие часы", "冻结时钟"],
    desc: ["+3 seconds on boss timers", "Boss süresine +3 saniye", "+3 segundos contra chefes", "+3 segundos contra jefes", "+3 секунды на босса", "首领战时间 +3 秒"],
  },
  {
    id: "harvest", color: "#facc15", prestigePct: 12,
    name: ["Crown Harvest", "Taç Hasadı", "Colheita de Coroas", "Cosecha de Coronas", "Жатва корон", "王冠丰收"],
    desc: ["+12% prestige from boss victories", "Boss zaferlerinden +%12 prestij", "+12% de prestígio ao vencer chefes", "+12% de prestigio al vencer jefes", "+12% престижа за победы над боссами", "击败首领声望 +12%"],
  },
  {
    id: "echo_hunter", color: "#c084fc", echoBonus: 0.5,
    name: ["Echo Hunter", "Yankı Avcısı", "Caçador de Ecos", "Cazador de Ecos", "Охотник за эхом", "回响猎手"],
    desc: ["Core Echo pays +0.5x prestige", "Çekirdek Yankısı +0,5x prestij verir", "O Eco do Núcleo paga +0,5x de prestígio", "El Eco del Núcleo da +0,5x de prestigio", "Эхо Ядра даёт +0,5x престижа", "核心回响声望 +0.5 倍"],
  },
];

const BOON_BY_ID = new Map(ABYSS_BOONS.map(b => [b.id, b]));
export const isAbyssBoonId = (value: unknown): value is AbyssBoonId => typeof value === "string" && BOON_BY_ID.has(value as AbyssBoonId);
export const getAbyssBoon = (id: AbyssBoonId): AbyssBoonDef => BOON_BY_ID.get(id)!;
export const getAbyssBoonName = (id: AbyssBoonId, language: Language): string => pick6(language, getAbyssBoon(id).name);
export const getAbyssBoonDesc = (id: AbyssBoonId, language: Language): string => pick6(language, getAbyssBoon(id).desc);

/** Picks earned so far at this Endless depth (one per 5 depths). */
export const getAbyssBoonPicksEarned = (depth: number): number => Math.floor(Math.max(0, depth) / ABYSS_BOON_EVERY_DEPTHS);
export const getPendingAbyssBoonPicks = (depth: number, owned: AbyssBoonId[]): number =>
  Math.max(0, getAbyssBoonPicksEarned(depth) - owned.length);

/** Three different boons offered for the next pick. Seeded by the pick number, so it never re-rolls. */
export const getAbyssBoonOffer = (ownedCount: number): AbyssBoonId[] => {
  let s = ((ownedCount + 1) * 2654435761 + 97) >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pool = ABYSS_BOONS.map(b => b.id);
  const out: AbyssBoonId[] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
};

export interface AbyssBoonTotals {
  productionBoost: number;
  cryptoBoost: number;
  clickBoost: number;
  critBoost: number;
  critDamageBoost: number;
  bossDamageMultiplier: number;
  bossBonusSeconds: number;
  prestigeMultiplier: number;
  echoBonus: number;
}
export const computeAbyssBoonTotals = (owned: AbyssBoonId[] | undefined): AbyssBoonTotals => {
  const t = { productionBoost: 0, cryptoBoost: 0, clickBoost: 0, critBoost: 0, critDamageBoost: 0, bossDamagePct: 0, bossTimeSeconds: 0, prestigePct: 0, echoBonus: 0 };
  (owned || []).forEach(id => {
    const b = BOON_BY_ID.get(id);
    if (!b) return;
    t.productionBoost += b.productionBoost || 0;
    t.cryptoBoost += b.cryptoBoost || 0;
    t.clickBoost += b.clickBoost || 0;
    t.critBoost += b.critBoost || 0;
    t.critDamageBoost += b.critDamageBoost || 0;
    t.bossDamagePct += b.bossDamagePct || 0;
    t.bossTimeSeconds += b.bossTimeSeconds || 0;
    t.prestigePct += b.prestigePct || 0;
    t.echoBonus += b.echoBonus || 0;
  });
  return {
    productionBoost: t.productionBoost,
    cryptoBoost: t.cryptoBoost,
    clickBoost: t.clickBoost,
    critBoost: t.critBoost,
    critDamageBoost: t.critDamageBoost,
    bossDamageMultiplier: 1 + t.bossDamagePct / 100,
    bossBonusSeconds: t.bossTimeSeconds,
    prestigeMultiplier: 1 + t.prestigePct / 100,
    echoBonus: t.echoBonus,
  };
};

/** Owned boons grouped with their stack count, in pool order (for the summary list). */
export const groupAbyssBoons = (owned: AbyssBoonId[]): Array<{ id: AbyssBoonId; count: number }> =>
  ABYSS_BOONS.map(b => ({ id: b.id, count: owned.filter(o => o === b.id).length })).filter(g => g.count > 0);
