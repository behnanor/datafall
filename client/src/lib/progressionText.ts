// v1.04 progression/shop strings, kept in their own file so this pass does not collide with other
// translation edits. All six game languages are filled in.
import type { Language } from "./i18n";

type Entry = Record<Language, string>;

const TEXT = {
  bonusIncluded: {
    en: "incl. your ×{mult} bonuses",
    tr: "×{mult} bonusların dahil",
    "pt-BR": "inclui seus bônus ×{mult}",
    es: "incluye tus bonos ×{mult}",
    ru: "с учётом бонусов ×{mult}",
    "zh-CN": "已含你的 ×{mult} 加成",
  },
  autoSell: {
    en: "Sells {amount} Data for the missing Nodes",
    tr: "Eksik Dizin için {amount} Veri satılır",
    "pt-BR": "Vende {amount} Dados pelos Nodes que faltam",
    es: "Vende {amount} Datos por los Nodes que faltan",
    ru: "Продаст {amount} данных за недостающие узлы",
    "zh-CN": "将出售 {amount} 数据补足节点",
  },
  tagEveryone: {
    en: "Everyone",
    tr: "Herkes",
    "pt-BR": "Todos",
    es: "Todos",
    ru: "Для всех",
    "zh-CN": "通用",
  },
  tagActive: {
    en: "Active play",
    tr: "Aktif oyun",
    "pt-BR": "Jogo ativo",
    es: "Juego activo",
    ru: "Активная игра",
    "zh-CN": "主动游玩",
  },
  tagIdle: {
    en: "Idle / offline",
    tr: "Boşta / çevrimdışı",
    "pt-BR": "Ocioso / offline",
    es: "Inactivo / sin conexión",
    ru: "Простой / офлайн",
    "zh-CN": "挂机 / 离线",
  },
  filterAll: {
    en: "All",
    tr: "Tümü",
    "pt-BR": "Todos",
    es: "Todos",
    ru: "Все",
    "zh-CN": "全部",
  },
  bestValue: {
    en: "Best value",
    tr: "En iyi değer",
    "pt-BR": "Melhor custo-benefício",
    es: "Mejor valor",
    ru: "Лучшая цена",
    "zh-CN": "最划算",
  },
  bestValueHint: {
    en: "Best value = the biggest boost to your progress for its price.",
    tr: "En iyi değer = fiyatına göre ilerlemeni en çok hızlandıran yükseltme.",
    "pt-BR": "Melhor custo-benefício = o maior impulso no seu progresso pelo preço.",
    es: "Mejor valor = el mayor impulso a tu progreso por su precio.",
    ru: "Лучшая цена = самое большое ускорение прогресса за свою стоимость.",
    "zh-CN": "最划算 = 按价格计算对进度提升最大的升级。",
  },
} satisfies Record<string, Entry>;

export type ProgressionTextKey = keyof typeof TEXT;

export const progressionText = (
  language: Language,
  key: ProgressionTextKey,
  params?: Record<string, string | number>,
): string => {
  const entry: Entry = TEXT[key];
  let value = entry[language] ?? entry.en;
  if (params) {
    for (const [name, replacement] of Object.entries(params)) value = value.split(`{${name}}`).join(String(replacement));
  }
  return value;
};
