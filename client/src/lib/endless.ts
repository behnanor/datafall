// v1.03 Endless rewards: every 5 depths a new title, a new era colour and a new abyss click-burst palette.
import type { Language } from "./i18n";
import { pick6, type L6 } from "./bossVariants";

export const ENDLESS_REWARD_STEP = 5;
export const getEndlessTier = (depth: number): number => Math.floor(Math.max(0, depth) / ENDLESS_REWARD_STEP);

const TITLES: L6[] = [
  ["Depth Diver", "Derinlik Dalgıcı", "Mergulhador das Profundezas", "Buzo de las Profundidades", "Ныряльщик глубин", "深度潜行者"],
  ["Grid Delver", "Ağ Kaşifi", "Explorador da Grade", "Explorador de la Red", "Исследователь сети", "网格探索者"],
  ["Abyss Walker", "Uçurum Yürüyücüsü", "Andarilho do Abismo", "Caminante del Abismo", "Странник бездны", "深渊漫游者"],
  ["Void Runner", "Boşluk Koşucusu", "Corredor do Vazio", "Corredor del Vacío", "Бегущий в пустоте", "虚空奔行者"],
  ["Signal Ghost", "Sinyal Hayaleti", "Fantasma do Sinal", "Fantasma de la Señal", "Призрак сигнала", "信号幽灵"],
  ["Null Sovereign", "Boşluk Hükümdarı", "Soberano Nulo", "Soberano Nulo", "Нулевой владыка", "零域君主"],
];
export const getEndlessTitle = (depth: number, language: Language): string | null => {
  const tier = getEndlessTier(depth);
  if (tier <= 0) return null;
  const base = pick6(language, TITLES[Math.min(tier, TITLES.length) - 1]);
  return tier > TITLES.length ? `${base} +${tier - TITLES.length}` : base;
};
export const getNextEndlessRewardDepth = (depth: number): number => (getEndlessTier(depth) + 1) * ENDLESS_REWARD_STEP;

// Abyss palettes for click bursts (one per reward tier, up to 6). Hue rotation applied to the active effect.
export const ABYSS_VARIANT_HUES = [190, 250, 300, 335, 20, 140] as const;
export const ABYSS_VARIANT_NAMES: L6[] = [
  ["Abyss Teal", "Uçurum Turkuazı", "Turquesa Abissal", "Turquesa Abisal", "Бирюза бездны", "深渊青"],
  ["Deep Indigo", "Derin Çivit", "Índigo Profundo", "Índigo Profundo", "Глубокий индиго", "深靛"],
  ["Void Violet", "Boşluk Moru", "Violeta do Vazio", "Violeta del Vacío", "Фиолет пустоты", "虚空紫"],
  ["Signal Rose", "Sinyal Gülü", "Rosa do Sinal", "Rosa de la Señal", "Роза сигнала", "信号玫瑰"],
  ["Core Ember", "Çekirdek Közü", "Brasa do Núcleo", "Brasa del Núcleo", "Угли ядра", "核心余烬"],
  ["Null Jade", "Boşluk Yeşimi", "Jade Nulo", "Jade Nulo", "Нулевой нефрит", "零域翡翠"],
];
export const getUnlockedAbyssVariants = (depth: number): number => Math.min(ABYSS_VARIANT_HUES.length, getEndlessTier(depth));

// Era colour in Endless: the room hue keeps rotating every 5 depths (asc 55, 60, ...).
export const getEndlessEraHue = (totalAscensions: number): number | null => {
  const tier = getEndlessTier(totalAscensions - 50);
  return tier > 0 ? (290 + 37 * tier) % 360 : null;
};
