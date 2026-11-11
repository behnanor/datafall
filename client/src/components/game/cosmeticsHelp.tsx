import { Crosshair, Factory, MousePointerClick, Bitcoin, Paintbrush, Info, Wand2, Layers } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { pick6, type L6 } from '@/lib/bossVariants';
import { CurrencyIcon } from '@/components/game/CurrencyIcon';

// v1.04 UX: small helpers that explain the Cosmetics Market. Reviews said cosmetics were confusing:
// three currencies, a hidden stat per slot, and no way to tell what to equip. Everything here is
// display-only; it reads the same data the panel already gets and calls the existing equip handlers.

export type SlotStat = 'production' | 'click' | 'crypto' | 'crit' | 'style';

const STAT_TEXT: Record<SlotStat, L6> = {
  production: ['Production', 'Üretim', 'Produção', 'Producción', 'Производство', '产量'],
  click: ['Click power', 'Tıklama gücü', 'Poder de clique', 'Poder de clic', 'Сила клика', '点击强度'],
  crypto: ['Crypto', 'Kripto', 'Cripto', 'Cripto', 'Крипта', '加密货币'],
  crit: ['Crit chance', 'Kritik şansı', 'Chance de crítico', 'Prob. de crítico', 'Шанс крита', '暴击率'],
  style: ['Style only, no bonus', 'Sadece görünüm, bonus yok', 'Só visual, sem bônus', 'Solo estética, sin bono', 'Только вид, без бонуса', '仅外观，无加成'],
};

const STAT_STYLE: Record<SlotStat, { icon: typeof Factory; cls: string }> = {
  production: { icon: Factory, cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200' },
  click: { icon: MousePointerClick, cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' },
  crypto: { icon: Bitcoin, cls: 'border-red-500/40 bg-red-500/10 text-red-200' },
  crit: { icon: Crosshair, cls: 'border-amber-500/40 bg-amber-500/10 text-amber-200' },
  style: { icon: Paintbrush, cls: 'border-slate-500/40 bg-slate-700/30 text-slate-300' },
};

/** Badge next to a section title: what equipping an item from this slot boosts. */
export function SlotStatBadge({ stat, language }: { stat: SlotStat; language: Language }) {
  const { icon: Icon, cls } = STAT_STYLE[stat];
  const prefix = stat === 'style' ? '' : '+ ';
  return (
    <span className={`ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-mono ${cls}`} data-testid={`slot-stat-${stat}`}>
      <Icon className="h-3 w-3" />
      {prefix}{pick6(language, STAT_TEXT[stat])}
    </span>
  );
}

const T = {
  wallet: ['Your wallet', 'Cüzdanın', 'Sua carteira', 'Tu cartera', 'Ваш кошелёк', '你的钱包'] as L6,
  nodesUse: ['Nodes: buy normal items', 'Dizin: normal eşyaları al', 'Nodes: itens normais', 'Nodos: objetos normales', 'Узлы: обычные предметы', '节点：购买普通物品'] as L6,
  prestigeUse: ['Prestige: buy Ascension items', 'Prestij: Yükseliş eşyalarını al', 'Prestígio: itens de Ascensão', 'Prestigio: objetos de Ascensión', 'Престиж: предметы вознесения', '声望：购买飞升物品'] as L6,
  boxUse: ['Boss loot boxes: click effects and box skins', 'Boss kutuları: tıklama efektleri ve kutu kaplamaları', 'Caixas de chefe: efeitos de clique e skins de caixa', 'Cajas de jefe: efectos de clic y skins de caja', 'Ящики боссов: эффекты клика и скины ящиков', '首领战利品箱：点击特效与箱子外观'] as L6,
  permanent: ['Items you buy are yours forever. Nodes reset when you ascend, so spend them before ascending.', 'Aldığın eşyalar kalıcıdır. Dizin yükselişte sıfırlanır, yükselmeden önce harca.', 'Itens comprados são seus para sempre. Nodes zeram ao ascender, então gaste antes.', 'Los objetos que compras son tuyos para siempre. Los Nodos se reinician al ascender: gástalos antes.', 'Купленные предметы остаются навсегда. Узлы сгорают при вознесении, тратьте их заранее.', '购买的物品永久保留。节点会在飞升时清零，请在飞升前花掉。'] as L6,
  equipBest: ['Equip best', 'En iyisini tak', 'Equipar melhores', 'Equipar lo mejor', 'Надеть лучшее', '一键最佳装备'] as L6,
  alreadyBest: ['You already wear your strongest items.', 'Zaten en güçlü eşyaların takılı.', 'Você já usa seus itens mais fortes.', 'Ya llevas tus objetos más fuertes.', 'На вас уже лучшие предметы.', '你已装备最强的物品。'] as L6,
  set: ['Ascension set', 'Yükseliş seti', 'Conjunto de Ascensão', 'Conjunto de Ascensión', 'Комплект вознесения', '飞升套装'] as L6,
};

export const equippedBetterText = (n: number, language: Language) => pick6(language, [
  `Equipped ${n} stronger item${n === 1 ? '' : 's'}.`,
  `${n} daha güçlü eşya takıldı.`,
  `${n} ${n === 1 ? 'item mais forte equipado' : 'itens mais fortes equipados'}.`,
  `${n} ${n === 1 ? 'objeto más fuerte equipado' : 'objetos más fuertes equipados'}.`,
  `Надето более сильных предметов: ${n}.`,
  `已装备 ${n} 件更强的物品。`,
]);

/** Short legend at the top of the market: what each currency buys and the key rule (items are permanent). */
export function CosmeticsGuide({ language, credits, prestige, formatNumber }: {
  language: Language;
  credits: number;
  prestige: number;
  formatNumber: (n: number) => string;
}) {
  return (
    <div className="mb-3 rounded-lg border border-purple-500/30 bg-purple-950/15 p-2 text-[11px]" data-testid="cosmetics-guide">
      <p className="mb-1 flex items-center gap-1 font-mono uppercase tracking-wider text-purple-300"><Info className="h-3 w-3" />{pick6(language, T.wallet)}</p>
      <div className="grid grid-cols-1 gap-1 text-slate-200 sm:grid-cols-3">
        <span className="flex items-center gap-1"><CurrencyIcon kind="credits" className="h-3.5 w-3.5" /><b className="text-amber-300" data-testid="cosmetics-credits">{formatNumber(credits)}</b><span className="text-slate-400">· {pick6(language, T.nodesUse)}</span></span>
        <span className="flex items-center gap-1"><CurrencyIcon kind="ascension" className="h-3.5 w-3.5" /><b className="text-fuchsia-300" data-testid="cosmetics-ascension">{formatNumber(prestige)}</b><span className="text-slate-400">· {pick6(language, T.prestigeUse)}</span></span>
        <span className="flex items-center gap-1 text-slate-400"><Layers className="h-3.5 w-3.5 text-cyan-300" />{pick6(language, T.boxUse)}</span>
      </div>
      <p className="mt-1.5 text-emerald-300/90">{pick6(language, T.permanent)}</p>
    </div>
  );
}

type BoostLike = { productionBoost?: number; clickBoost?: number; critBoost?: number; cryptoBoost?: number; critDamageBoost?: number };
type ItemLike = { id: string; boost?: BoostLike };

const power = (b?: BoostLike) => Object.values(b || {}).reduce((t: number, v) => t + (typeof v === 'number' ? v : 0), 0);

export type BestPickSlot = {
  current: string;
  items: ItemLike[];
  owned: Set<string>;
  /** Items in this list count toward the ascension set bonus, so they win ties. */
  setItems?: Set<string>;
  equip: (id: string) => void;
};

/** Best owned item for one slot, or null when the current one is already as good. */
export function pickBest(slot: BestPickSlot): string | null {
  const score = (item: ItemLike) => power(item.boost) + (slot.setItems?.has(item.id) ? 0.5 : 0);
  const currentItem = slot.items.find(i => i.id === slot.current);
  let best: ItemLike | undefined;
  for (const item of slot.items) {
    if (!slot.owned.has(item.id)) continue;
    if (!best || score(item) > score(best)) best = item;
  }
  if (!best || best.id === slot.current) return null;
  if (currentItem && slot.owned.has(currentItem.id) && score(currentItem) >= score(best)) return null;
  if (power(best.boost) <= 0) return null;
  return best.id;
}

/** "Equip best" button: equips the strongest owned item in every slot, then says what happened. */
export function EquipBestButton({ language, slots, onDone }: { language: Language; slots: BestPickSlot[]; onDone: (msg: string) => void }) {
  const handle = () => {
    let changed = 0;
    for (const slot of slots) {
      const id = pickBest(slot);
      if (id) { slot.equip(id); changed++; }
    }
    onDone(changed > 0 ? equippedBetterText(changed, language) : pick6(language, T.alreadyBest));
  };
  const pending = slots.filter(s => pickBest(s) !== null).length;
  return (
    <button
      type="button"
      onClick={handle}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${pending > 0 ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]' : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:text-white'}`}
      data-testid="button-equip-best"
    >
      <Wand2 className="h-3.5 w-3.5" />
      {pick6(language, T.equipBest)}{pending > 0 ? ` (${pending})` : ''}
    </button>
  );
}

/** "Ascension set 2/4 · +5%": the hidden set bonus made visible. */
export function AscensionSetMeter({ language, equipped, perItem, max }: { language: Language; equipped: number; perItem: number; max: number }) {
  const bonus = Math.min(max, Math.max(0, equipped - 1) * perItem);
  const next = equipped < 4 ? Math.min(max, equipped * perItem) : bonus;
  const hint: L6 = [
    `+${perItem}% production, clicks and crypto for each Ascension skin, head, accessory or room theme you wear beyond the first (max +${max}%).`,
    `İlkinden sonra taktığın her Yükseliş kaplaması, başı, aksesuarı veya oda teması için +%${perItem} üretim, tıklama ve kripto (en fazla +%${max}).`,
    `+${perItem}% de produção, cliques e cripto por skin, cabeça, acessório ou tema de Ascensão equipado além do primeiro (máx. +${max}%).`,
    `+${perItem}% de producción, clics y cripto por cada skin, cabeza, accesorio o tema de Ascensión equipado además del primero (máx. +${max}%).`,
    `+${perItem}% к производству, кликам и крипте за каждый предмет вознесения (скин, голова, аксессуар, тема) сверх первого (макс. +${max}%).`,
    `除第一件外，每装备一件飞升皮肤、头部、配饰或房间主题，产量、点击与加密货币 +${perItem}%（最多 +${max}%）。`,
  ];
  return (
    <div className="mb-3 rounded-lg border border-fuchsia-500/30 bg-fuchsia-950/15 p-2 text-[11px]" data-testid="ascension-set-meter">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono uppercase tracking-wider text-fuchsia-300">{pick6(language, T.set)} {equipped}/4</span>
        <span className={`font-mono font-semibold ${bonus > 0 ? 'text-emerald-300' : 'text-slate-400'}`}>+{bonus}%{next > bonus ? <span className="text-slate-500"> → +{next}%</span> : null}</span>
      </div>
      <div className="mt-1 flex gap-1">
        {[0, 1, 2, 3].map(i => <div key={i} className={`h-1.5 flex-1 rounded ${i < equipped ? 'bg-fuchsia-400' : 'bg-slate-700'}`} />)}
      </div>
      <p className="mt-1 text-slate-400">{pick6(language, hint)}</p>
    </div>
  );
}
