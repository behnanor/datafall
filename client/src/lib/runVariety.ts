// v1.04 run variety: Run Protocols (pick one modifier for each run after the first ascension) and
// Network Events (short random events during a run). Kept out of useGame.ts so the data is easy to tune.
// Every player-facing string is an L6 tuple: en, tr, pt-BR, es, ru, zh-CN.
import type { L6 } from "./bossVariants";

// Multipliers a run modifier or an event can change. 1 (or 0 for additive fields) means "no change".
export interface RunMods {
  data: number;        // data production (Node trickle follows data)
  crypto: number;      // crypto production
  click: number;       // data per click
  sell: number;        // Nodes per data sold
  critChance: number;  // additive, 0.05 = +5 percentage points
  dropChance: number;  // additive chance that a click drops a pickup
  eventRate: number;   // how often Network Events happen
  eventPower: number;  // how strong Network Event bonuses are
}
export const NEUTRAL_RUN_MODS: RunMods = { data: 1, crypto: 1, click: 1, sell: 1, critChance: 0, dropChance: 0, eventRate: 1, eventPower: 1 };

export const combineRunMods = (...parts: Array<Partial<RunMods> | null | undefined>): RunMods => {
  const out = { ...NEUTRAL_RUN_MODS };
  for (const p of parts) {
    if (!p) continue;
    out.data *= p.data ?? 1;
    out.crypto *= p.crypto ?? 1;
    out.click *= p.click ?? 1;
    out.sell *= p.sell ?? 1;
    out.critChance += p.critChance ?? 0;
    out.dropChance += p.dropChance ?? 0;
    out.eventRate *= p.eventRate ?? 1;
    out.eventPower *= p.eventPower ?? 1;
  }
  return out;
};

// ---------------------------------------------------------------------------------------------
// Run Protocols
// ---------------------------------------------------------------------------------------------
// After every ascension (from the first one on) the player is offered 3 protocols and picks one for the
// next run, or plays "Standard". Each protocol is a trade-off that favours one play style, so runs feel
// different and idle and active players both get a good pick.
export const RUN_PROTOCOL_UNLOCK_ASCENSION = 1;
export const RUN_PROTOCOL_OFFER_SIZE = 3;

export type RunProtocolId =
  | "overclocked_grid"
  | "manual_override"
  | "crypto_rush"
  | "market_maker"
  | "lucky_packets"
  | "signal_storm"
  | "glass_cannon";

export type RunProtocolStyle = "idle" | "active" | "mixed";
export interface RunProtocol {
  id: RunProtocolId;
  style: RunProtocolStyle;
  mods: Partial<RunMods>;
  name: L6;
  desc: L6;
}

export const RUN_PROTOCOLS: RunProtocol[] = [
  {
    id: "overclocked_grid",
    style: "idle",
    mods: { data: 1.6, click: 0.5 },
    name: ["Overclocked Grid", "Hız Aşırtılmış Şebeke", "Rede Overclockada", "Red Overclockeada", "Разогнанная сеть", "超频电网"],
    desc: ["Data production +60%. Clicks -50%.", "Veri üretimi +%60. Tıklama -%50.", "Produção de dados +60%. Cliques -50%.", "Producción de datos +60%. Clics -50%.", "Производство данных +60%. Клики -50%.", "数据产量 +60%。点击 -50%。"],
  },
  {
    id: "manual_override",
    style: "active",
    mods: { click: 3, critChance: 0.1, data: 0.75 },
    name: ["Manual Override", "Manuel Kontrol", "Controle Manual", "Control Manual", "Ручное управление", "手动接管"],
    desc: ["Clicks x3 and +10% crit chance. Data production -25%.", "Tıklama x3 ve +%10 kritik şansı. Veri üretimi -%25.", "Cliques x3 e +10% de chance de crítico. Produção de dados -25%.", "Clics x3 y +10% de probabilidad de crítico. Producción de datos -25%.", "Клики x3 и +10% к шансу крита. Производство данных -25%.", "点击 x3，暴击率 +10%。数据产量 -25%。"],
  },
  {
    id: "crypto_rush",
    style: "idle",
    // v1.04 sim: at x1.4 / x0.75 every simulated player finished slower than with no protocol (data feeds the rigs).
    mods: { crypto: 1.5, data: 0.9 },
    name: ["Crypto Rush", "Kripto Hücumu", "Corrida Cripto", "Fiebre Cripto", "Крипто-лихорадка", "加密狂潮"],
    desc: ["Crypto production +50%. Data production -10%.", "Kripto üretimi +%50. Veri üretimi -%10.", "Produção de cripto +50%. Produção de dados -10%.", "Producción de cripto +50%. Producción de datos -10%.", "Добыча крипты +50%. Производство данных -10%.", "加密货币产量 +50%。数据产量 -10%。"],
  },
  {
    id: "market_maker",
    style: "mixed",
    mods: { sell: 2.5, crypto: 0.85 },
    name: ["Market Maker", "Piyasa Yapıcı", "Formador de Mercado", "Creador de Mercado", "Маркетмейкер", "做市商"],
    desc: ["Selling data gives +150% Nodes. Crypto production -15%.", "Veri satışı +%150 Dizin verir. Kripto üretimi -%15.", "Vender dados dá +150% de Nodes. Produção de cripto -15%.", "Vender datos da +150% de Nodos. Producción de cripto -15%.", "Продажа данных даёт +150% узлов. Добыча крипты -15%.", "出售数据获得 +150% 节点。加密货币产量 -15%。"],
  },
  {
    id: "lucky_packets",
    style: "active",
    mods: { dropChance: 0.15, critChance: 0.05, data: 0.9 },
    name: ["Lucky Packets", "Şanslı Paketler", "Pacotes da Sorte", "Paquetes de la Suerte", "Счастливые пакеты", "幸运数据包"],
    desc: ["Clicks drop pickups much more often, +5% crit chance. Data production -10%.", "Tıklamalar çok daha sık bonus düşürür, +%5 kritik şansı. Veri üretimi -%10.", "Cliques soltam bônus com muito mais frequência, +5% de crítico. Produção de dados -10%.", "Los clics sueltan bonus mucho más a menudo, +5% de crítico. Producción de datos -10%.", "Клики гораздо чаще роняют бонусы, +5% к шансу крита. Производство данных -10%.", "点击更容易掉落拾取物，暴击率 +5%。数据产量 -10%。"],
  },
  {
    id: "signal_storm",
    style: "mixed",
    mods: { eventRate: 2, eventPower: 1.5, data: 0.9 },
    name: ["Signal Storm", "Sinyal Fırtınası", "Tempestade de Sinal", "Tormenta de Señal", "Сигнальный шторм", "信号风暴"],
    desc: ["Network Events happen twice as often and are 50% stronger. Data production -10%.", "Ağ Olayları iki kat sık olur ve %50 daha güçlüdür. Veri üretimi -%10.", "Eventos de Rede acontecem o dobro e são 50% mais fortes. Produção de dados -10%.", "Los Eventos de Red ocurren el doble y son un 50% más fuertes. Producción de datos -10%.", "Сетевые события происходят вдвое чаще и на 50% сильнее. Производство данных -10%.", "网络事件频率翻倍，效果增强 50%。数据产量 -10%。"],
  },
  {
    id: "glass_cannon",
    style: "mixed",
    mods: { data: 1.35, crypto: 1.35, sell: 0.5 },
    name: ["Glass Cannon", "Cam Top", "Canhão de Vidro", "Cañón de Cristal", "Стеклянная пушка", "玻璃大炮"],
    desc: ["Data and crypto production +35%. Selling data gives 50% fewer Nodes.", "Veri ve kripto üretimi +%35. Veri satışı %50 daha az Dizin verir.", "Produção de dados e cripto +35%. Vender dados dá 50% menos Nodes.", "Producción de datos y cripto +35%. Vender datos da un 50% menos de Nodos.", "Производство данных и крипты +35%. Продажа данных даёт на 50% меньше узлов.", "数据和加密货币产量 +35%。出售数据获得的节点 -50%。"],
  },
];

export const STANDARD_PROTOCOL_TEXT: { name: L6; desc: L6 } = {
  name: ["Standard", "Standart", "Padrão", "Estándar", "Стандарт", "标准"],
  desc: ["No changes. Play the run as usual.", "Değişiklik yok. Turu her zamanki gibi oyna.", "Sem mudanças. Jogue a rodada normalmente.", "Sin cambios. Juega la partida como siempre.", "Без изменений. Обычный забег.", "无变化，照常游戏。"],
};

export const getRunProtocol = (id: RunProtocolId | null | undefined): RunProtocol | null =>
  (id ? RUN_PROTOCOLS.find(p => p.id === id) ?? null : null);
const isRunProtocolId = (value: unknown): value is RunProtocolId => RUN_PROTOCOLS.some(p => p.id === value);

export interface RunProtocolState {
  // Protocol for the current run (null = Standard).
  active: RunProtocolId | null;
  // The 3 choices offered for the current run while `pending` is true.
  offer: RunProtocolId[];
  pending: boolean;
  // Last protocol the player picked ('standard' = none); automation (auto-ascend) reuses it without asking.
  last: RunProtocolId | "standard" | null;
  // Runs played with each protocol (stats only).
  runs: Partial<Record<RunProtocolId, number>>;
}
export const INITIAL_RUN_PROTOCOL: RunProtocolState = { active: null, offer: [], pending: false, last: null, runs: {} };

// Saved as an optional field, so older saves load without it (then: Standard, nothing pending).
export const migrateRunProtocol = (saved: unknown): RunProtocolState => {
  const s = (saved || {}) as Partial<RunProtocolState>;
  const offer = Array.isArray(s.offer) ? Array.from(new Set(s.offer.filter(isRunProtocolId))).slice(0, RUN_PROTOCOL_OFFER_SIZE) : [];
  const runs: Partial<Record<RunProtocolId, number>> = {};
  if (s.runs && typeof s.runs === "object") {
    for (const [k, v] of Object.entries(s.runs)) if (isRunProtocolId(k) && Number.isFinite(v)) runs[k] = Math.max(0, Math.floor(v as number));
  }
  return {
    active: isRunProtocolId(s.active) ? s.active : null,
    offer,
    pending: !!s.pending && offer.length > 0,
    last: isRunProtocolId(s.last) || s.last === "standard" ? s.last : null,
    runs,
  };
};

// Seeded by the ascension count, so reloading the game can't re-roll the offer.
const seededRandom = (seed: number) => {
  let s = ((seed + 1) * 2246822519) >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};
export const rollProtocolOffer = (ascensions: number, previous: RunProtocolId | null): RunProtocolId[] => {
  const r = seededRandom(ascensions * 7919 + 17);
  // Don't offer the protocol of the run that just ended, so consecutive runs differ.
  const pool = RUN_PROTOCOLS.map(p => p.id).filter(id => id !== previous);
  const out: RunProtocolId[] = [];
  while (out.length < RUN_PROTOCOL_OFFER_SIZE && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
};

// ---------------------------------------------------------------------------------------------
// Network Events
// ---------------------------------------------------------------------------------------------
// Every few minutes of play a short event appears at the bottom of the screen. Most are timed boosts that
// ask for a small action (sell now, click now); two ask the player to choose; one is a quick click race.
// Events only count down while the window is visible and no boss fight is running.
export type NetworkEventId =
  | "data_surge"
  | "crypto_flare"
  | "market_spike"
  | "overclock_window"
  | "packet_storm"
  | "encrypted_cache"
  | "rogue_broker"
  | "signal_fork";

export type NetworkEventKind = "buff" | "instant" | "cache" | "choice";
export interface NetworkEventDef {
  id: NetworkEventId;
  kind: NetworkEventKind;
  weight: number;
  durationSec: number;
  mods?: Partial<RunMods>;
  needsCrypto?: boolean;
  needsClicks?: boolean;
  needsCredits?: boolean;
  name: L6;
  desc: L6;
  // Shown instead of desc once a choice event was accepted.
  activeDesc?: L6;
}

export const ENCRYPTED_CACHE_CLICKS = 30;
export const ENCRYPTED_CACHE_SECONDS = 12;
// Reward: this many seconds of current production.
export const ENCRYPTED_CACHE_DATA_SECONDS = 120;
export const ENCRYPTED_CACHE_CRYPTO_SECONDS = 45;
export const ROGUE_BROKER_COST_SHARE = 0.25;
export const CHOICE_DECIDE_SECONDS = 20;

// First event of a run after 90 to 150 s, then every 3 to 5.5 minutes of visible play.
export const FIRST_EVENT_MIN_SEC = 90;
export const FIRST_EVENT_MAX_SEC = 150;
export const EVENT_GAP_MIN_SEC = 180;
export const EVENT_GAP_MAX_SEC = 330;
// Players need a few machines before events start (the first minutes stay calm for the tutorial).
export const EVENTS_MIN_UPGRADES = 5;

export const NETWORK_EVENTS: NetworkEventDef[] = [
  {
    id: "data_surge", kind: "buff", weight: 5, durationSec: 30, mods: { data: 2 },
    name: ["Data Surge", "Veri Dalgası", "Surto de Dados", "Oleada de Datos", "Всплеск данных", "数据涌流"],
    desc: ["Data production x2.", "Veri üretimi x2.", "Produção de dados x2.", "Producción de datos x2.", "Производство данных x2.", "数据产量 x2。"],
  },
  {
    id: "crypto_flare", kind: "buff", weight: 4, durationSec: 30, mods: { crypto: 2 }, needsCrypto: true,
    name: ["Crypto Flare", "Kripto Parlaması", "Clarão Cripto", "Destello Cripto", "Крипто-вспышка", "加密耀斑"],
    desc: ["Crypto production x2.", "Kripto üretimi x2.", "Produção de cripto x2.", "Producción de cripto x2.", "Добыча крипты x2.", "加密货币产量 x2。"],
  },
  {
    id: "market_spike", kind: "buff", weight: 4, durationSec: 40, mods: { sell: 3 },
    name: ["Market Spike", "Piyasa Sıçraması", "Pico de Mercado", "Pico del Mercado", "Скачок рынка", "市场暴涨"],
    desc: ["Selling data gives x3 Nodes. Sell now!", "Veri satışı x3 Dizin verir. Şimdi sat!", "Vender dados dá x3 Nodes. Venda agora!", "Vender datos da x3 Nodos. ¡Vende ya!", "Продажа данных даёт x3 узлов. Продавай!", "出售数据获得 x3 节点。快卖！"],
  },
  {
    id: "overclock_window", kind: "buff", weight: 4, durationSec: 20, mods: { click: 3, critChance: 0.15 }, needsClicks: true,
    name: ["Overclock Window", "Hız Aşırtma Penceresi", "Janela de Overclock", "Ventana de Overclock", "Окно разгона", "超频窗口"],
    desc: ["Clicks x3 and +15% crit chance. Click fast!", "Tıklama x3 ve +%15 kritik şansı. Hızlı tıkla!", "Cliques x3 e +15% de crítico. Clique rápido!", "Clics x3 y +15% de crítico. ¡Haz clic rápido!", "Клики x3 и +15% к криту. Кликай быстрее!", "点击 x3，暴击率 +15%。快点！"],
  },
  {
    id: "packet_storm", kind: "instant", weight: 3, durationSec: 6,
    name: ["Packet Storm", "Paket Fırtınası", "Tempestade de Pacotes", "Tormenta de Paquetes", "Пакетный шторм", "数据包风暴"],
    desc: ["A burst of pickups just spawned. Grab them!", "Bir sürü bonus belirdi. Topla!", "Uma chuva de bônus apareceu. Pegue!", "Ha aparecido una ráfaga de bonus. ¡Cógelos!", "Появилась россыпь бонусов. Собирай!", "一大波拾取物出现了，快收集！"],
  },
  {
    id: "encrypted_cache", kind: "cache", weight: 3, durationSec: ENCRYPTED_CACHE_SECONDS, needsClicks: true,
    name: ["Encrypted Cache", "Şifreli Önbellek", "Cache Criptografado", "Caché Cifrada", "Зашифрованный тайник", "加密缓存"],
    desc: [
      `Click the data core ${ENCRYPTED_CACHE_CLICKS} times to crack it: ${ENCRYPTED_CACHE_DATA_SECONDS / 60} min of data production.`,
      `Kırmak için veri çekirdeğine ${ENCRYPTED_CACHE_CLICKS} kez tıkla: ${ENCRYPTED_CACHE_DATA_SECONDS / 60} dk veri üretimi.`,
      `Clique no núcleo ${ENCRYPTED_CACHE_CLICKS} vezes para quebrar: ${ENCRYPTED_CACHE_DATA_SECONDS / 60} min de produção de dados.`,
      `Haz clic en el núcleo ${ENCRYPTED_CACHE_CLICKS} veces para descifrarla: ${ENCRYPTED_CACHE_DATA_SECONDS / 60} min de producción de datos.`,
      `Кликни по ядру ${ENCRYPTED_CACHE_CLICKS} раз, чтобы взломать: ${ENCRYPTED_CACHE_DATA_SECONDS / 60} мин производства данных.`,
      `点击数据核心 ${ENCRYPTED_CACHE_CLICKS} 次破解：获得 ${ENCRYPTED_CACHE_DATA_SECONDS / 60} 分钟的数据产量。`,
    ],
  },
  {
    id: "rogue_broker", kind: "choice", weight: 2, durationSec: 60, mods: { crypto: 3 }, needsCrypto: true, needsCredits: true,
    name: ["Rogue Broker", "Kaçak Komisyoncu", "Corretor Clandestino", "Bróker Clandestino", "Подпольный брокер", "黑市掮客"],
    desc: [
      `Pay ${ROGUE_BROKER_COST_SHARE * 100}% of your Nodes for x3 crypto production for 60 s?`,
      `Dizinlerinin %${ROGUE_BROKER_COST_SHARE * 100}'ini öde, 60 sn boyunca kripto üretimi x3 olsun mu?`,
      `Pagar ${ROGUE_BROKER_COST_SHARE * 100}% dos seus Nodes por cripto x3 durante 60 s?`,
      `¿Pagar el ${ROGUE_BROKER_COST_SHARE * 100}% de tus Nodos por cripto x3 durante 60 s?`,
      `Отдать ${ROGUE_BROKER_COST_SHARE * 100}% узлов за x3 добычи крипты на 60 с?`,
      `支付 ${ROGUE_BROKER_COST_SHARE * 100}% 的节点，换取 60 秒加密货币产量 x3？`,
    ],
    activeDesc: ["Deal made: crypto production x3.", "Anlaşma tamam: kripto üretimi x3.", "Negócio fechado: produção de cripto x3.", "Trato hecho: producción de cripto x3.", "Сделка заключена: добыча крипты x3.", "交易达成：加密货币产量 x3。"],
  },
  {
    id: "signal_fork", kind: "choice", weight: 3, durationSec: 60,
    name: ["Signal Fork", "Sinyal Çatalı", "Bifurcação de Sinal", "Bifurcación de Señal", "Развилка сигнала", "信号分叉"],
    desc: ["Pick one boost.", "Bir güçlendirme seç.", "Escolha um bônus.", "Elige una mejora.", "Выбери одно усиление.", "选择一个增益。"],
  },
];

// Signal Fork options: a long idle boost or a short click boost.
export const SIGNAL_FORK_OPTIONS: Record<"idle" | "active", { durationSec: number; mods: Partial<RunMods>; label: L6 }> = {
  idle: {
    durationSec: 60, mods: { data: 2, crypto: 1.5 },
    label: ["Data x2, crypto x1.5 for 60 s", "60 sn veri x2, kripto x1.5", "Dados x2, cripto x1,5 por 60 s", "Datos x2, cripto x1,5 durante 60 s", "Данные x2, крипта x1,5 на 60 с", "60 秒：数据 x2，加密货币 x1.5"],
  },
  active: {
    durationSec: 25, mods: { click: 6, critChance: 0.2 },
    label: ["Clicks x6, +20% crit for 25 s", "25 sn tıklama x6, +%20 kritik", "Cliques x6, +20% crítico por 25 s", "Clics x6, +20% crítico durante 25 s", "Клики x6, +20% крита на 25 с", "25 秒：点击 x6，暴击率 +20%"],
  },
};

export const NETWORK_EVENT_UI: Record<string, L6> = {
  title: ["NETWORK EVENT", "AĞ OLAYI", "EVENTO DE REDE", "EVENTO DE RED", "СЕТЕВОЕ СОБЫТИЕ", "网络事件"],
  accept: ["Accept", "Kabul et", "Aceitar", "Aceptar", "Принять", "接受"],
  decline: ["Ignore", "Yoksay", "Ignorar", "Ignorar", "Игнорировать", "忽略"],
  cracked: ["Cache cracked!", "Önbellek kırıldı!", "Cache quebrado!", "¡Caché descifrada!", "Тайник взломан!", "缓存已破解！"],
  cacheFailed: ["The cache re-encrypted.", "Önbellek yeniden şifrelendi.", "O cache foi recriptografado.", "La caché se volvió a cifrar.", "Тайник снова зашифрован.", "缓存已重新加密。"],
  protocol: ["PROTOCOL", "PROTOKOL", "PROTOCOLO", "PROTOCOLO", "ПРОТОКОЛ", "协议"],
  chooseTitle: ["CHOOSE A RUN PROTOCOL", "TUR PROTOKOLÜ SEÇ", "ESCOLHA UM PROTOCOLO", "ELIGE UN PROTOCOLO", "ВЫБЕРИ ПРОТОКОЛ ЗАБЕГА", "选择本轮协议"],
  chooseSub: [
    "A modifier for this run only. A new set is offered after every ascension.",
    "Sadece bu tur için bir değiştirici. Her yükselişten sonra yeni seçenekler gelir.",
    "Um modificador só para esta rodada. Novas opções após cada ascensão.",
    "Un modificador solo para esta partida. Nuevas opciones tras cada ascensión.",
    "Модификатор только на этот забег. Новые варианты после каждого вознесения.",
    "仅对本轮生效的修正。每次飞升后会提供新选项。",
  ],
  choose: ["Choose", "Seç", "Escolher", "Elegir", "Выбрать", "选择"],
  later: ["Decide later", "Sonra karar ver", "Decidir depois", "Decidir luego", "Решить позже", "稍后决定"],
  pendingChip: ["Choose protocol", "Protokol seç", "Escolher protocolo", "Elegir protocolo", "Выбрать протокол", "选择协议"],
  idle: ["IDLE", "BOŞTA", "OCIOSO", "PASIVO", "АФК", "挂机"],
  active: ["ACTIVE", "AKTİF", "ATIVO", "ACTIVO", "АКТИВ", "主动"],
  mixed: ["MIXED", "KARMA", "MISTO", "MIXTO", "СМЕШ.", "混合"],
  ended: ["ended", "bitti", "terminou", "terminó", "закончилось", "已结束"],
};

export const getNetworkEvent = (id: NetworkEventId): NetworkEventDef => NETWORK_EVENTS.find(e => e.id === id)!;

// Event bonuses scale with eventPower (Signal Storm): x2 at power 1.5 becomes x2.5.
export const scaleEventMods = (mods: Partial<RunMods> | undefined, power: number): Partial<RunMods> => {
  if (!mods) return {};
  const scaleMult = (v: number | undefined) => (v === undefined ? undefined : 1 + (v - 1) * power);
  return {
    data: scaleMult(mods.data),
    crypto: scaleMult(mods.crypto),
    click: scaleMult(mods.click),
    sell: scaleMult(mods.sell),
    critChance: mods.critChance === undefined ? undefined : mods.critChance * power,
    dropChance: mods.dropChance === undefined ? undefined : mods.dropChance * power,
  };
};

export const rollNextEventDelaySec = (first: boolean, eventRate: number): number => {
  const [min, max] = first ? [FIRST_EVENT_MIN_SEC, FIRST_EVENT_MAX_SEC] : [EVENT_GAP_MIN_SEC, EVENT_GAP_MAX_SEC];
  return Math.round((min + Math.random() * (max - min)) / Math.max(0.25, eventRate));
};

export const pickNetworkEvent = (ctx: { cryptoUnlocked: boolean; clicksAllowed: boolean; hasCredits: boolean; previous: NetworkEventId | null }): NetworkEventId => {
  const pool = NETWORK_EVENTS.filter(e =>
    e.id !== ctx.previous &&
    (!e.needsCrypto || ctx.cryptoUnlocked) &&
    (!e.needsClicks || ctx.clicksAllowed) &&
    (!e.needsCredits || ctx.hasCredits));
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e.id;
  }
  return pool[pool.length - 1]?.id ?? "data_surge";
};

// Live event state (not saved: an event in progress simply ends when the game closes).
export interface ActiveNetworkEvent {
  id: NetworkEventId;
  // offer = waiting for the player's choice; active = running; done = showing the result for a moment.
  phase: "offer" | "active" | "done";
  startedAt: number;
  endsAt: number;
  mods: Partial<RunMods>;
  progress?: number;
  goal?: number;
  result?: "success" | "fail" | "declined";
  rewardText?: string;
  // Signal Fork: the option the player picked.
  chosen?: "idle" | "active";
}
