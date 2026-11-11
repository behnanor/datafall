import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Crown, Sparkles } from 'lucide-react';

import { formatNumber, CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION, getCryptoRelicUpgradeCost, BLACK_MARKET_UNLOCK_ASCENSION, PARAGON_LAB_UNLOCK_ASCENSION, getParagonTierLabel } from '@/lib/useGame';
import { pick6 } from '@/lib/bossVariants';
import { getBoostLines, getCurrencyLabel, getParagonEffectLabel, getRarityLabel, getRelicSlotLabel } from '@/lib/gameLocale';
import { Button } from '@/components/ui/button';
import { CurrencyIcon } from '@/components/game/CurrencyIcon';
import { CSSCharacter } from '@/components/game/CyberpunkRoom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { upperForLanguage } from "@/lib/i18n";

type LocalizeFn = (...args: any[]) => string;
type TranslateFn = (...args: any[]) => string;

type PrestigeUpgrade = {
  id: string;
  name: string;
  description: string;
  cost: number;
  costMultiplier: number;
  count: number;
  maxLevel: number;
  effect: { type: string; value: number };
};

type PrestigeShopSummary = {
  affordableUpgrades: number;
  maxedUpgrades: number;
  totalLevels: number;
};

type RelicNode = {
  id: string;
  name: string;
  description: string;
  slot: 'skin' | 'headstyle' | 'accessory' | 'wing';
  cosmeticId: string;
  requires: string[];
  perLevelBoost: {
    productionBoost?: number;
    clickBoost?: number;
    critBoost?: number;
    cryptoBoost?: number;
    critDamageBoost?: number;
  };
};

type MachineBoxSkin = {
  id: string;
  name: string;
  description: string;
  price: number;
  luckBonus: number;
  boost?: LootBoostInfo;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
  };
};

type LootBoostInfo = {
  productionBoost?: number;
  clickBoost?: number;
  critBoost?: number;
  cryptoBoost?: number;
  critDamageBoost?: number;
  luckBoost?: number;
};

type MarketEquipment = {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  price: number;
  currency: 'credits' | 'crypto' | 'ascension';
  boost?: LootBoostInfo;
};

type AdjacencyFormationBonus = {
  active: boolean;
  machineCount: number;
  adjacentPairs: number;
  clickChains: number;
  clickBoostPercent: number;
  potentialClickBoostPercent: number;
  productionChains: number;
  productionBoostPercent: number;
  potentialProductionBoostPercent: number;
  cryptoClusters: number;
  cryptoBoostPercent: number;
  potentialCryptoBoostPercent: number;
  luckBoostPercent: number;
  potentialLuckBoostPercent: number;
};

type BlackMarketUpgrade = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

type ParagonUpgrade = {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
  effect: {
    type: string;
    value: number;
  };
};

type ParagonOffer = {
  id: string;
  slot: 'skin' | 'headstyle' | 'accessory' | 'theme';
  name: string;
  description: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  boost?: LootBoostInfo;
};

const lootRarityClass: Record<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary', string> = {
  common: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  uncommon: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  rare: 'text-cyan-300 border-cyan-500/50 bg-cyan-500/10',
  epic: 'text-fuchsia-300 border-fuchsia-500/50 bg-fuchsia-500/10',
  legendary: 'text-amber-300 border-amber-500/60 bg-amber-500/10',
};

function getLootBoostLines(boost: LootBoostInfo | undefined, language: any) {
  return getBoostLines(boost, language);
}

export function PrestigeShopDialog({
  open,
  onOpenChange,
  t,
  prestigeAmount,
  prestigeUpgrades,
  prestigeShopSummary,
  formatPrestigeEffect,
  buyPrestigeUpgrade,
  buyPrestigeUpgradeMax,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: TranslateFn;
  prestigeAmount: number;
  prestigeUpgrades: any[];
  prestigeShopSummary: PrestigeShopSummary;
  formatPrestigeEffect: (upgrade: any, level: number) => string;
  buyPrestigeUpgrade: (upgradeId: any) => void;
  buyPrestigeUpgradeMax?: (upgradeId: any) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card/95 border-cyan-500/30 z-[50]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-cyan-400">
            <Crown className="w-5 h-5" /> {t('prestigePanel.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-3 sticky top-0 z-10 backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-300/70">{t('prestigePanel.balance')}</p>
                <p className="text-sm font-bold text-cyan-100 inline-flex items-center gap-1">
                  {Math.floor(prestigeAmount)}
                  <CurrencyIcon kind="ascension" className="w-3.5 h-3.5 text-amber-300" />
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-300/70">{t('common.affordable')}</p>
                <p className="text-sm font-bold text-emerald-300">{prestigeShopSummary.affordableUpgrades}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-300/70">{t('prestigePanel.maxed')}</p>
                <p className="text-sm font-bold text-amber-300">{prestigeShopSummary.maxedUpgrades}/{prestigeUpgrades.length}</p>
              </div>
            </div>
            <p className="text-[11px] text-cyan-200/80 mt-2">
              {t('prestigePanel.totalPurchasedLevels', { total: prestigeShopSummary.totalLevels })}
            </p>
          </div>
          {prestigeUpgrades.map((upgrade) => {
            const currentCost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.count));
            const isMaxed = upgrade.count >= upgrade.maxLevel;
            const canAfford = !isMaxed && prestigeAmount >= currentCost;
            return (
              <motion.div
                key={upgrade.id}
                whileHover={!isMaxed ? { scale: 1.01 } : undefined}
                className={`border rounded-lg p-3 transition-all ${
                  isMaxed
                    ? 'border-emerald-500/40 bg-emerald-500/10 cursor-default'
                    : canAfford
                      ? 'border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 cursor-pointer'
                      : 'border-muted/30 bg-muted/5 opacity-60 cursor-not-allowed'
                }`}
                onClick={() => canAfford && buyPrestigeUpgrade(upgrade.id)}
                data-testid={`prestige-upgrade-${upgrade.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${isMaxed ? 'text-emerald-400' : 'text-yellow-400'}`}>{upgrade.name}</p>
                      {isMaxed && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">{upperForLanguage(t('prestigePanel.maxed'))}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{upgrade.description}</p>
                    <p className="text-[11px] text-cyan-200/80 mt-1">
                      {t('common.current')}: <span className="font-medium text-cyan-100">{formatPrestigeEffect(upgrade, upgrade.count)}</span>
                    </p>
                    {!isMaxed && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t('common.next')}: {formatPrestigeEffect(upgrade, upgrade.count + 1)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-muted/20 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all ${isMaxed ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                          style={{ width: `${(upgrade.count / upgrade.maxLevel) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {upgrade.count}/{upgrade.maxLevel}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    {isMaxed ? (
                      <p className="font-mono text-sm text-emerald-400">{t('prestigePanel.complete')}</p>
                    ) : (
                      <p className={`font-mono font-bold text-sm ${canAfford ? 'text-yellow-300' : 'text-muted-foreground'}`}>
                        <span className="inline-flex items-center gap-1">
                          {currentCost}
                          <CurrencyIcon kind="ascension" className="w-3.5 h-3.5 text-amber-300" />
                        </span>
                      </p>
                    )}
                    {!isMaxed && canAfford && buyPrestigeUpgradeMax && (
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); buyPrestigeUpgradeMax(upgrade.id); }}
                        className="mt-1 rounded border border-yellow-500/50 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-yellow-200 hover:bg-yellow-500/25"
                        data-testid={`prestige-upgrade-max-${upgrade.id}`}
                      >
                        MAX
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CryptoRelicShopDialog({
  open,
  onOpenChange,
  l,
  language,
  totalAscensions,
  activeMachineBoxSkinId,
  localizedCryptoRelicTree,
  machineBoxSkinsForShop,
  ownedMachineBoxSkinsSet,
  isCryptoRelicShopUnlocked,
  getRelicNodeLevel,
  isRelicEquipped,
  canBuyRelicNode,
  relicBoostLines,
  renderRelicGlyph,
  canBuyMachineBoxSkin,
  buyCryptoRelic,
  buyCosmetic,
  equipCosmetic,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  l: LocalizeFn;
  language: any;
  totalAscensions: number;
  activeMachineBoxSkinId: string;
  localizedCryptoRelicTree: any[];
  machineBoxSkinsForShop: any[];
  ownedMachineBoxSkinsSet: Set<string>;
  isCryptoRelicShopUnlocked: boolean;
  getRelicNodeLevel: (node: any) => number;
  isRelicEquipped: (slot: any, cosmeticId: string) => boolean;
  canBuyRelicNode: (node: any) => boolean;
  relicBoostLines: (boost: any, multiplier: number) => string[];
  renderRelicGlyph: (relicId: string) => React.ReactNode;
  canBuyMachineBoxSkin: (skinId: string, price: number) => boolean;
  buyCryptoRelic: (nodeId: string) => void;
  buyCosmetic: (slot: any, id: string) => void;
  equipCosmetic: (slot: any, id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card/95 border-red-500/30 z-[52]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-red-300">
            <Cpu className="w-5 h-5" /> {l('Crypto Relic Forge', 'Yadigar Dükkânı', 'Loja de Relíquias', 'Tienda de Reliquias')}
          </DialogTitle>
        </DialogHeader>
        {!isCryptoRelicShopUnlocked ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-200">
            {language === 'tr'
              ? <><span className="font-semibold">Yükseliş {CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}</span> seviyesinde açılır.</>
              : language === 'pt-BR'
                ? <>Desbloqueia na <span className="font-semibold">Ascensao {CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}</span>.</>
                : language === 'es'
                  ? <>Se desbloquea en <span className="font-semibold">Ascension {CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}</span>.</>
                  : language === 'ru'
                    ? <>Otkryvaetsya na <span className="font-semibold">Voznesenii {CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}</span>.</>
                    : <>Unlocks at <span className="font-semibold">Ascension {CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}</span>.</>}
            <div className="mt-1 text-xs text-red-200/80">
              {l('Current progress', 'İlerleme', 'Progresso atual', 'Progreso actual')}: {totalAscensions}/{CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-100/85">
              {l(
                'Spend Crypto to unlock relics in order, then keep upgrading them. Relics are permanent bonuses: they work without equipping, and each one can be upgraded up to your current Ascension level.',
                'Relikleri sırayla açmak için Kripto harca, sonra geliştirmeye devam et. Relikler kalıcı bonuslardır: takmana gerek yoktur ve her biri mevcut Yükseliş seviyene kadar geliştirilebilir.',
                'Gaste Cripto para desbloquear as relíquias em ordem e continue melhorando-as. Relíquias são bônus permanentes: funcionam sem equipar, e cada uma pode evoluir até o seu nível atual de Ascensão.',
                'Gasta Cripto para desbloquear las reliquias en orden y sigue mejorándolas. Las reliquias son bonificaciones permanentes: funcionan sin equiparlas y cada una puede mejorarse hasta tu nivel actual de Ascensión.',
                'Трать крипту, чтобы открывать реликвии по порядку, и продолжай их улучшать. Реликвии дают постоянные бонусы: их не нужно экипировать, и каждую можно улучшать до твоего текущего уровня вознесения.',
              )}
            </div>
            <div className="grid grid-cols-1 gap-3">
              {localizedCryptoRelicTree.map((node, index) => {
                const level = getRelicNodeLevel(node);
                const unlocked = level > 0;
                const equipped = unlocked && isRelicEquipped(node.slot, node.cosmeticId);
                const canBuy = canBuyRelicNode(node);
                const ascensionCap = Math.max(0, totalAscensions);
                const isCapped = level >= ascensionCap;
                const nextCost = getCryptoRelicUpgradeCost(node as never, level, totalAscensions);
                const missingRequirements = node.requires.filter((reqId: string) => {
                  const req = localizedCryptoRelicTree.find((item) => item.id === reqId);
                  if (!req) return true;
                  return getRelicNodeLevel(req) <= 0;
                });
                const perLevelLines = relicBoostLines(node.perLevelBoost, 1);
                const totalLines = relicBoostLines(node.perLevelBoost, level);
                const nextLevelLines = relicBoostLines(node.perLevelBoost, level + 1);

                return (
                  <div key={node.id} className="relative">
                    {index > 0 && <div className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-red-400/40" />}
                    <motion.div whileHover={{ scale: 1.01 }} className={`rounded-lg border p-3 ${unlocked ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/35 bg-red-500/5'}`}>
                      <div className="grid grid-cols-[96px_minmax(0,1fr)_140px] gap-3 items-center">
                        <div className="rounded-md border border-red-400/25 bg-slate-950/70 py-2">{renderRelicGlyph(node.id)}</div>
                        <div>
                          <p className="text-sm font-bold text-red-100">{node.name}</p>
                          <p className="text-xs text-red-100/70">{node.description}</p>
                          <p className="mt-1 text-[11px] text-cyan-200/80">{getRelicSlotLabel(node.slot, language)}</p>
                          <div className="mt-1 text-[11px] text-slate-300">{l('Level', 'Seviye', 'Nível')} {level}/{ascensionCap}</div>
                          <div className="mt-1 text-[11px] text-slate-300">{l('Per Level', 'Seviye Başına', 'Por Nível')}: {perLevelLines.length ? perLevelLines.join(' | ') : l('No stat bonus', 'İstatistik bonusu yok', 'Sem bônus de atributo')}</div>
                          <div className="mt-1 text-[11px] text-emerald-200/90">{l('Total', 'Toplam', 'Total')}: {totalLines.length ? totalLines.join(' | ') : l('No active bonus', 'Aktif bonus yok', 'Sem bônus ativo')}</div>
                          {missingRequirements.length > 0 && <p className="mt-1 text-[11px] text-amber-300">{l('Locked by the previous relic.', 'Önceki relik tarafından kilitli.', 'Bloqueado pela relíquia anterior.', 'Bloqueado por la reliquia anterior.', 'Заблокировано предыдущей реликвией.')}</p>}
                        </div>
                        <div className="space-y-2">
                          {unlocked ? (
                            <>
                              <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-center text-xs text-emerald-200">Lv. {level} / {ascensionCap}</div>
                              {isCapped ? (
                                <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-center text-xs text-amber-200">{l('Ascension Cap', 'Yükseliş Sınırı', 'Limite de Ascensão')}</div>
                              ) : (
                                <Button onClick={() => buyCryptoRelic(node.id)} disabled={!canBuy} className="w-full h-8 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs">
                                  {l(`Upgrade Lv.${level + 1}`, `Sv.${level + 1} Yükselt`, `Melhorar Nv.${level + 1}`, `Mejorar Nv.${level + 1}`)}
                                </Button>
                              )}
                              {!isCapped && <div className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-center text-[10px] text-red-200/90">{formatNumber(nextCost)} {getCurrencyLabel('crypto', language)}</div>}
                              {equipped ? (
                                <div className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-center text-xs text-cyan-200">{l('Equipped', 'Takılı', 'Equipado', 'Equipado')}</div>
                              ) : (
                                <Button onClick={() => equipCosmetic(node.slot, node.cosmeticId)} className="w-full h-8 bg-cyan-600 hover:bg-cyan-500 text-xs">{l('Equip Visual', 'Görseli Tak', 'Equipar Visual', 'Equipar Visual')}</Button>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-center text-xs text-red-200">{formatNumber(nextCost)} {getCurrencyLabel('crypto', language)}</div>
                              <Button onClick={() => buyCryptoRelic(node.id)} disabled={!canBuy} className="w-full h-8 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs">{l('Unlock Lv.1', 'Sv.1 Kilidini Aç', 'Desbloquear Nv.1', 'Desbloquear Nv.1')}</Button>
                            </>
                          )}
                        </div>
                      </div>
                      {unlocked && !isCapped && <div className="mt-2 rounded border border-cyan-500/25 bg-cyan-500/5 px-2 py-1 text-[10px] text-cyan-200/85">{l(`Next total at Lv.${level + 1}`, `Sv.${level + 1} sonraki toplam`, `Próximo total no Nv.${level + 1}`, `Siguiente total en Nv.${level + 1}`)}: {nextLevelLines.length ? nextLevelLines.join(' | ') : l('No stat change', 'İstatistik değişimi yok', 'Sem mudanca de atributo', 'Sin cambio de estadísticas')}</div>}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <p className="text-sm font-semibold text-cyan-200">{l('Mine Skins', 'Maden Kaplamaları', 'Skins de Mineradora', 'Skins de Minero')}</p>
                <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200/80">{l('Crypto Shop + Loot Box', 'Kripto Dükkânı + Kutu', 'Loja Cripto + Loot Box', 'Tienda de Cripto + Loot Box')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {machineBoxSkinsForShop.map((skin) => {
                  const owned = ownedMachineBoxSkinsSet.has(skin.id);
                  const equipped = activeMachineBoxSkinId === skin.id;
                  const canBuy = canBuyMachineBoxSkin(skin.id, skin.price);
                  return (
                    <motion.div key={skin.id} whileHover={{ scale: 1.01 }} className={`rounded-lg border p-3 ${equipped ? 'border-cyan-400/60 bg-cyan-500/10' : owned ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-500/35 bg-slate-900/50'}`}>
                      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                        <div className="relative h-20 rounded-md border border-cyan-500/30 bg-slate-950/70 [perspective:700px]">
                          <div className="absolute left-1/2 top-1/2 h-12 w-16 -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]">
                            <div className="absolute inset-0 rounded border [transform:translateZ(8px)]" style={{ borderColor: skin.colors.primary, background: `linear-gradient(180deg, ${skin.colors.primary}22 0%, ${skin.colors.secondary}66 65%, rgba(2,6,23,0.95) 100%)`, boxShadow: `0 0 10px ${skin.colors.glow}` }} />
                            <div className="absolute left-0.5 top-1 h-9 w-2.5 rounded border [transform:rotateY(-62deg)_translateZ(2px)]" style={{ borderColor: skin.colors.primary, background: `${skin.colors.primary}77` }} />
                            <div className="absolute right-0.5 top-1 h-9 w-2.5 rounded border [transform:rotateY(62deg)_translateZ(2px)]" style={{ borderColor: skin.colors.primary, background: `${skin.colors.secondary}77` }} />
                            <div className="absolute left-1/2 top-0.5 h-3.5 w-12 -translate-x-1/2 rounded border [transform:rotateX(65deg)_translateZ(9px)]" style={{ borderColor: skin.colors.primary, background: `${skin.colors.secondary}66` }} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-cyan-100">{skin.name}</p>
                          <p className="text-[11px] text-slate-300/85">{skin.description}</p>
                          <p className="mt-1 text-[10px] text-emerald-300/90">{getBoostLines(skin.boost, language).join(", ")}</p>
                          <div className="mt-2">
                            {owned ? (
                              equipped ? (
                                <div className="rounded border border-cyan-500/45 bg-cyan-500/10 px-2 py-1 text-center text-xs text-cyan-200">{l('Equipped', 'Takılı', 'Equipado', 'Equipado')}</div>
                              ) : (
                                <Button onClick={() => equipCosmetic('machineboxskin', skin.id)} className="h-8 w-full bg-cyan-600 hover:bg-cyan-500 text-xs">{l('Equip', 'Tak', 'Equipar')}</Button>
                              )
                            ) : (
                              <Button onClick={() => buyCosmetic('machineboxskin', skin.id)} disabled={!canBuy} className="h-8 w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs">{l('Buy', 'Satın Al', 'Comprar')} {formatNumber(skin.price)} {getCurrencyLabel('crypto', language)}</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BlackMarketDialog({
  open,
  onOpenChange,
  l,
  language,
  totalAscensions,
  resources,
  cosmetics,
  equippedCapeName,
  equippedWingName,
  equippedSkinPalette,
  localizedBlackMarketCapes,
  localizedBlackMarketWings,
  localizedBlackMarketUpgrades,
  ownedCapesSet,
  ownedWingsSet,
  adjacencyFormationBonus,
  getTotalCritChance,
  buyBlackMarketUpgrade,
  buyCosmetic,
  equipCosmetic,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  l: LocalizeFn;
  language: any;
  totalAscensions: number;
  resources: { prestige: number; credits: number; crypto: number };
  cosmetics: {
    activeCapeId: string;
    activeWingId: string;
    blackMarketClickOverflowPurchased: boolean;
    blackMarketAdjacencyPurchased: boolean;
  };
  equippedCapeName: string;
  equippedWingName: string;
  equippedSkinPalette: any;
  localizedBlackMarketCapes: any[];
  localizedBlackMarketWings: any[];
  localizedBlackMarketUpgrades: any[];
  ownedCapesSet: Set<string>;
  ownedWingsSet: Set<string>;
  adjacencyFormationBonus: AdjacencyFormationBonus;
  getTotalCritChance: () => number;
  buyBlackMarketUpgrade: (upgradeId: any) => void;
  buyCosmetic: (slot: any, id: string) => void;
  equipCosmetic: (slot: any, id: string) => void;
}) {
  const isBlackMarketUnlocked = totalAscensions >= BLACK_MARKET_UNLOCK_ASCENSION;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[84vh] bg-card/95 border-rose-500/35 z-[53]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-rose-300">
            <Sparkles className="w-5 h-5" /> {l('Black Market Spaceship', 'Karaborsa Pazar', 'Mercado Negro', 'Mercado Negro')}
          </DialogTitle>
        </DialogHeader>
        {!isBlackMarketUnlocked ? (
          <div className="rounded-lg border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-200">
            {l(
              `Unlocks at Ascension ${BLACK_MARKET_UNLOCK_ASCENSION}. Current progress: ${totalAscensions}/${BLACK_MARKET_UNLOCK_ASCENSION}`,
              `Yükseliş ${BLACK_MARKET_UNLOCK_ASCENSION} seviyesinde açılır. İlerleme: ${totalAscensions}/${BLACK_MARKET_UNLOCK_ASCENSION}`,
              `Desbloqueia na Ascensão ${BLACK_MARKET_UNLOCK_ASCENSION}. Progresso atual: ${totalAscensions}/${BLACK_MARKET_UNLOCK_ASCENSION}`,
              `Se desbloquea en Ascensión ${BLACK_MARKET_UNLOCK_ASCENSION}. Progreso actual: ${totalAscensions}/${BLACK_MARKET_UNLOCK_ASCENSION}`,
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-2">
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100/90">
              {l(
                'Exclusive modules: equip Capes and Wings from separate slots. One-time upgrades here permanently unlock advanced mechanics.',
                'Özel modüller: Pelerin ve Kanatları ayrı yuvalardan kuşan. Buradaki tek seferlik yükseltmeler gelişmiş mekanikleri kalıcı olarak açar.',
                'Módulos exclusivos: equipe Capas e Asas em slots separados. Os upgrades únicos daqui liberam mecanicas avancadas de forma permanente.',
                'Módulos exclusivos: equipa Capas y Alas en ranuras separadas. Las mejoras únicas de aquí desbloquean mecanicas avanzadas de forma permanente.',
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-cyan-200">{l('Capes Slot', 'Pelerin Yuvası', 'Slot de Capas')}</p>
                <span className="text-[11px] text-cyan-200/80">{l('Equipped', 'Takılı', 'Equipado')}: {equippedCapeName}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {localizedBlackMarketCapes.map((cape) => {
                  const owned = ownedCapesSet.has(cape.id);
                  const equipped = cosmetics.activeCapeId === cape.id;
                  const canAfford = cape.currency === 'ascension' ? resources.prestige >= cape.price : cape.currency === 'crypto' ? resources.crypto >= cape.price : resources.credits >= cape.price;
                  const boostLines = getLootBoostLines(cape.boost, language);
                  return (
                    <div key={cape.id} className={`rounded-lg border p-3 ${equipped ? 'border-cyan-400/60 bg-cyan-500/10' : owned ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-600/40 bg-slate-900/55'}`}>
                      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                        <div className="relative h-20 rounded border border-cyan-500/30 bg-slate-950/70">
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.65]">
                            <CSSCharacter skinPalette={equippedSkinPalette} accessoryId="none" headStyleId="default" capeId={cape.id} wingId="none" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-cyan-100">{cape.name}</p>
                          <p className="text-[11px] text-slate-300/85">{cape.description}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{getRarityLabel(cape.rarity, language)}</p>
                          {boostLines.length > 0 && <p className="text-[10px] text-emerald-300/90">{boostLines.join(' | ')}</p>}
                          <div className="mt-2">
                            {owned ? (
                              equipped ? <div className="rounded border border-cyan-500/45 bg-cyan-500/10 px-2 py-1 text-center text-xs text-cyan-200">{l('Equipped', 'Takılı', 'Equipado')}</div> : <Button onClick={() => equipCosmetic('cape', cape.id)} className="h-8 w-full bg-cyan-600 hover:bg-cyan-500 text-xs">{l('Equip', 'Tak', 'Equipar')}</Button>
                            ) : (
                              <Button onClick={() => buyCosmetic('cape', cape.id)} disabled={!canAfford} className="h-8 w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs">
                                {l('Buy', 'Satın Al', 'Comprar')} {formatNumber(cape.price)}{cape.currency === 'ascension' ? <span className="inline-flex items-center ml-1 align-middle"><CurrencyIcon kind="ascension" className="w-3.5 h-3.5 text-amber-300" /></span> : ` ${getCurrencyLabel(cape.currency, language)}`}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-fuchsia-200">{l('Wings Slot', 'Kanat Yuvası', 'Slot de Asas')}</p>
                <span className="text-[11px] text-fuchsia-200/80">{l('Equipped', 'Takılı', 'Equipado')}: {equippedWingName}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {localizedBlackMarketWings.map((wing) => {
                  const owned = ownedWingsSet.has(wing.id);
                  const equipped = cosmetics.activeWingId === wing.id;
                  const canAfford = wing.currency === 'ascension' ? resources.prestige >= wing.price : wing.currency === 'crypto' ? resources.crypto >= wing.price : resources.credits >= wing.price;
                  const boostLines = getLootBoostLines(wing.boost, language);
                  return (
                    <div key={wing.id} className={`rounded-lg border p-3 ${equipped ? 'border-fuchsia-400/60 bg-fuchsia-500/10' : owned ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-600/40 bg-slate-900/55'}`}>
                      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                        <div className="relative h-20 rounded border border-fuchsia-500/30 bg-slate-950/70">
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.65]">
                            <CSSCharacter skinPalette={equippedSkinPalette} accessoryId="none" headStyleId="default" capeId="none" wingId={wing.id} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-fuchsia-100">{wing.name}</p>
                          <p className="text-[11px] text-slate-300/85">{wing.description}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{getRarityLabel(wing.rarity, language)}</p>
                          {boostLines.length > 0 && <p className="text-[10px] text-emerald-300/90">{boostLines.join(' | ')}</p>}
                          <div className="mt-2">
                            {owned ? (
                              equipped ? <div className="rounded border border-fuchsia-500/45 bg-fuchsia-500/10 px-2 py-1 text-center text-xs text-fuchsia-200">{l('Equipped', 'Takılı', 'Equipado')}</div> : <Button onClick={() => equipCosmetic('wing', wing.id)} className="h-8 w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-xs">{l('Equip', 'Tak', 'Equipar')}</Button>
                            ) : (
                              <Button onClick={() => buyCosmetic('wing', wing.id)} disabled={!canAfford} className="h-8 w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs">
                                {l('Buy', 'Satın Al', 'Comprar')} {formatNumber(wing.price)}{wing.currency === 'ascension' ? <span className="inline-flex items-center ml-1 align-middle"><CurrencyIcon kind="ascension" className="w-3.5 h-3.5 text-amber-300" /></span> : ` ${getCurrencyLabel(wing.currency, language)}`}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-200">{l('One-Time Black Market Upgrades', 'Tek Seferlik Karaborsa Pazar Yükseltmeleri', 'Upgrades Únicos do Mercado Negro', 'Mejoras Únicas del Mercado Negro')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {localizedBlackMarketUpgrades.map((upgrade) => {
                  const purchased = upgrade.id === 'click_overflow' ? cosmetics.blackMarketClickOverflowPurchased : cosmetics.blackMarketAdjacencyPurchased;
                  const canAfford = resources.prestige >= upgrade.cost;
                  return (
                    <div key={upgrade.id} className={`rounded-lg border p-3 ${purchased ? 'border-emerald-500/45 bg-emerald-500/10' : 'border-amber-500/35 bg-amber-500/10'}`}>
                      <p className="text-sm font-semibold text-amber-100">{upgrade.name}</p>
                      <p className="mt-1 text-[11px] text-slate-300/85">{upgrade.description}</p>
                      {upgrade.id === 'adjacency_matrix' && <div className="mt-1 space-y-1 text-[10px] text-cyan-200/85"><p>{l(`Miners detected: ${adjacencyFormationBonus.machineCount} | Adjacent pairs: ${adjacencyFormationBonus.adjacentPairs}`, `Tespit edilen madenci: ${adjacencyFormationBonus.machineCount} | Komşu çiftler: ${adjacencyFormationBonus.adjacentPairs}`, `Mineradoras detectadas: ${adjacencyFormationBonus.machineCount} | Pares adjacentes: ${adjacencyFormationBonus.adjacentPairs}`, `Mineros detectados: ${adjacencyFormationBonus.machineCount} | Pares adyacentes: ${adjacencyFormationBonus.adjacentPairs}`)}</p><p className="text-cyan-100/90">{l('Layout guide: Horizontal 3 miners = Click, Vertical 3 miners = Production, 2x2 block = Crypto.', 'Düzen rehberi: Yatay 3 madenci = Tıklama, Dikey 3 madenci = Üretim, 2x2 blok = Kripto.', 'Guia de layout: 3 mineradoras na horizontal = Clique, 3 na vertical = Produção, bloco 2x2 = Cripto.', 'Guía de distribución: 3 mineros en horizontal = Clic, 3 en vertical = Producción, bloque 2x2 = Cripto.')}</p><p>{l('Horizontal sets', 'Yatay setler', 'Conjuntos horizontais', 'Conjuntos horizontales')}: {adjacencyFormationBonus.clickChains} | {adjacencyFormationBonus.active ? '+' : l('Potential +', 'Potansiyel +', 'Potencial +', 'Potencial +')}{(adjacencyFormationBonus.active ? adjacencyFormationBonus.clickBoostPercent : adjacencyFormationBonus.potentialClickBoostPercent).toFixed(1)}% {l('click', 'tıklama', 'clique', 'clic')}</p><p>{l('Vertical sets', 'Dikey setler', 'Conjuntos verticais', 'Conjuntos verticales')}: {adjacencyFormationBonus.productionChains} | {adjacencyFormationBonus.active ? '+' : l('Potential +', 'Potansiyel +', 'Potencial +', 'Potencial +')}{(adjacencyFormationBonus.active ? adjacencyFormationBonus.productionBoostPercent : adjacencyFormationBonus.potentialProductionBoostPercent).toFixed(1)}% {l('production', 'Üretim', 'produção', 'producción')}</p><p>2x2 {l('clusters', 'küme', 'grupos', 'bloques')}: {adjacencyFormationBonus.cryptoClusters} | {adjacencyFormationBonus.active ? '+' : l('Potential +', 'Potansiyel +', 'Potencial +', 'Potencial +')}{(adjacencyFormationBonus.active ? adjacencyFormationBonus.cryptoBoostPercent : adjacencyFormationBonus.potentialCryptoBoostPercent).toFixed(1)}% {l('crypto', 'kripto', 'cripto', 'cripto')}</p><p>{l('Luck bonus', 'Şans bonusu', 'Bônus de sorte', 'Bonus de suerte')}: {adjacencyFormationBonus.active ? '+' : l('Potential +', 'Potansiyel +', 'Potencial +', 'Potencial +')}{(adjacencyFormationBonus.active ? adjacencyFormationBonus.luckBoostPercent : adjacencyFormationBonus.potentialLuckBoostPercent).toFixed(1)}%</p></div>}
                      {upgrade.id === 'click_overflow' && <p className="mt-1 text-[10px] text-cyan-200/85">{l('Current crit chance', 'Güncel kritik şansı', 'Chance crítica atual', 'Prob. crítica actual')}: {(getTotalCritChance() * 100).toFixed(1)}%</p>}
                      <div className="mt-2">
                        {purchased ? <div className="rounded border border-emerald-500/45 bg-emerald-500/10 px-2 py-1 text-center text-xs text-emerald-200">{l('Purchased', 'Alındı', 'Comprado')}</div> : <Button onClick={() => buyBlackMarketUpgrade(upgrade.id)} disabled={!canAfford} className="h-8 w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs"><span className="inline-flex items-center gap-1">{l('Buy', 'Satın Al', 'Comprar')} {formatNumber(upgrade.cost)}<CurrencyIcon kind="ascension" className="w-3.5 h-3.5 text-amber-300" /></span></Button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ParagonLabDialog({
  open,
  onOpenChange,
  l,
  language,
  totalAscensions,
  prestigeAmount,
  localizedParagonUpgrades,
  totalParagonLevels,
  totalParagonLevelCap,
  paragonCompletionPercent,
  nextParagonUpgradeCost,
  getParagonUpgradeLevel,
  buyParagonUpgrade,
  paragonEliteOffers,
  isParagonOfferOwned,
  isParagonOfferEquipped,
  renderParagonOfferPreview,
  buyCosmetic,
  equipCosmetic,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  l: LocalizeFn;
  language: any;
  totalAscensions: number;
  prestigeAmount: number;
  localizedParagonUpgrades: any[];
  totalParagonLevels: number;
  totalParagonLevelCap: number;
  paragonCompletionPercent: number;
  nextParagonUpgradeCost: number | null;
  getParagonUpgradeLevel: (upgradeId: any) => number;
  buyParagonUpgrade: (upgradeId: any) => void;
  paragonEliteOffers: any[];
  isParagonOfferOwned: (slot: any, cosmeticId: string) => boolean;
  isParagonOfferEquipped: (slot: any, cosmeticId: string) => boolean;
  renderParagonOfferPreview: (offer: any) => React.ReactNode;
  buyCosmetic: (slot: any, id: string) => void;
  equipCosmetic: (slot: any, id: string) => void;
}) {
  const isParagonLabUnlocked = totalAscensions >= PARAGON_LAB_UNLOCK_ASCENSION;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[82vh] bg-card/95 border-amber-500/35 z-[54]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-amber-300">
            <Crown className="w-5 h-5" /> {l('Paragon Lab', 'Paragon Laboratuvarı', 'Laboratório Paragon', 'Laboratorio Paragon')}
          </DialogTitle>
        </DialogHeader>
        {!isParagonLabUnlocked ? (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-200">
            {l(
              `Unlocks at Ascension ${PARAGON_LAB_UNLOCK_ASCENSION}. Current progress: ${totalAscensions}/${PARAGON_LAB_UNLOCK_ASCENSION}`,
              `Yükseliş ${PARAGON_LAB_UNLOCK_ASCENSION} seviyesinde açılır. İlerleme: ${totalAscensions}/${PARAGON_LAB_UNLOCK_ASCENSION}`,
              `Desbloqueia na Ascensão ${PARAGON_LAB_UNLOCK_ASCENSION}. Progresso atual: ${totalAscensions}/${PARAGON_LAB_UNLOCK_ASCENSION}`,
              `Se desbloquea en Ascensión ${PARAGON_LAB_UNLOCK_ASCENSION}. Progreso actual: ${totalAscensions}/${PARAGON_LAB_UNLOCK_ASCENSION}`,
            )}
          </div>
        ) : (
          <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-2">
            <div className="rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-fuchsia-500/5 to-cyan-500/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/85">{l('Endgame Control Layer', 'Son Oyun Kontrol Katmanı', 'Camada de Controle Endgame', 'Capa de Control Endgame')}</p>
                  <p className="text-sm text-slate-200/90 mt-1">{l('Permanent upgrades and elite gear for post-50 ascension progression.', '50. yükseliş sonrası ilerleme için kalıcı yükseltmeler ve elit ekipmanlar.', 'Upgrades permanentes e equipamentos de elite para a progressão após a 50a ascensão.', 'Mejoras permanentes y equipo de elite para la progresión después de la ascensión 50.')}</p>
                </div>
                <div className="rounded-lg border border-amber-400/45 bg-amber-500/10 px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-wider text-amber-200/80">{l('Available Crowns', 'Mevcut Talar', 'Coroas Disponíveis')}</p>
                  <p className="text-lg font-semibold text-amber-100 flex items-center justify-end gap-1">{formatNumber(prestigeAmount)}<CurrencyIcon kind="ascension" className="w-4 h-4 text-amber-300" /></p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-2"><p className="text-[10px] uppercase tracking-wider text-cyan-200/80">{l('Modules', 'Modüller', 'Módulos')}</p><p className="text-sm font-semibold text-cyan-100">{localizedParagonUpgrades.length}</p></div>
                <div className="rounded-md border border-fuchsia-500/35 bg-fuchsia-500/10 px-2 py-2"><p className="text-[10px] uppercase tracking-wider text-fuchsia-200/80">{l('Total Levels', 'Toplam Seviye', 'Níveis Totais')}</p><p className="text-sm font-semibold text-fuchsia-100">{totalParagonLevels}/{totalParagonLevelCap}</p></div>
                <div className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-2"><p className="text-[10px] uppercase tracking-wider text-emerald-200/80">{l('Completion', 'Tamamlama', 'Conclusão')}</p><p className="text-sm font-semibold text-emerald-100">{paragonCompletionPercent.toFixed(1)}%</p></div>
                <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-2"><p className="text-[10px] uppercase tracking-wider text-amber-200/80">{l('Next Upgrade', 'Sıradaki Yükseltme', 'Próximo Upgrade')}</p><p className="text-sm font-semibold text-amber-100">{nextParagonUpgradeCost === null ? l('All Maxed', 'Hepsi Maksimum', 'Tudo no Máximo') : `${formatNumber(nextParagonUpgradeCost)} ${getCurrencyLabel('ascension', language)}`}</p></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-100">{l('Paragon Core Upgrades', 'Paragon Çekirdek Yükseltmeleri', 'Upgrades Centrais de Paragon', 'Mejoras Centrales de Paragon')}</p>
                <span className="text-[11px] text-amber-200/80">{l(`${localizedParagonUpgrades.length} permanent systems`, `${localizedParagonUpgrades.length} kalıcı sistem`, `${localizedParagonUpgrades.length} sistemas permanentes`, `${localizedParagonUpgrades.length} sistemas permanentes`)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {localizedParagonUpgrades.map((upgrade) => {
                  const level = getParagonUpgradeLevel(upgrade.id);
                  const isMaxed = level >= upgrade.maxLevel;
                  const currentCost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
                  const lockedAt: number = upgrade.requiredAscensions ?? 0;
                  const isLocked = totalAscensions < lockedAt;
                  const canAfford = !isMaxed && !isLocked && prestigeAmount >= currentCost;
                  const totalBonus = upgrade.effect.value * level;
                  const effectLabel = getParagonEffectLabel(upgrade.effect.type, language);
                  // v1.04 Paragon III: Chrono Siege counts seconds, every other module counts percent.
                  const unit = upgrade.effect.type === 'boss_time_seconds' ? 's' : '%';
                  const tierLabel = getParagonTierLabel(lockedAt);

                  return (
                    <div key={upgrade.id} className={`rounded-lg border p-3 ${isMaxed ? 'border-emerald-500/45 bg-emerald-500/10' : canAfford ? 'border-amber-500/45 bg-amber-500/10' : 'border-slate-600/40 bg-slate-900/55'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="text-sm font-semibold text-amber-100">{upgrade.name}</p><p className="mt-1 text-[11px] text-slate-300/85">{upgrade.description}</p></div>
                        <span className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200 whitespace-nowrap">+{upgrade.effect.value}{unit}/{l('lv', 'sv', 'nv')}</span>
                      </div>
                      <p className="mt-2 text-[10px] text-cyan-200/90">{effectLabel}: +{Number.isInteger(totalBonus) ? totalBonus : totalBonus.toFixed(1)}{unit}</p>
                      <p className="mt-1 text-[10px] text-slate-300/80">{l('Level', 'Seviye', 'Nível')} {level}/{upgrade.maxLevel}</p>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-muted/20 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${(level / upgrade.maxLevel) * 100}%` }} /></div>
                      <div className="mt-3">
                        {isLocked ? <div className="rounded border border-slate-600/50 bg-slate-800/60 px-2 py-1 text-center text-xs text-slate-300">{pick6(language, [`${tierLabel}: unlocks at ascension ${lockedAt}`, `${tierLabel}: yükseliş ${lockedAt} ile açılır`, `${tierLabel}: desbloqueia na ascensão ${lockedAt}`, `${tierLabel}: se desbloquea en la ascensión ${lockedAt}`, `${tierLabel}: открывается на вознесении ${lockedAt}`, `${tierLabel}：第 ${lockedAt} 次飞升解锁`])}</div> : isMaxed ? <div className="rounded border border-emerald-500/45 bg-emerald-500/10 px-2 py-1 text-center text-xs text-emerald-200">{l('Maxed', 'Maksimum', 'Máximo')}</div> : <Button onClick={() => buyParagonUpgrade(upgrade.id)} disabled={!canAfford} className="h-8 w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs"><span className="inline-flex items-center gap-1">{l('Upgrade', 'Yükselt', 'Melhorar')} {formatNumber(currentCost)}<CurrencyIcon kind="ascension" className="w-3.5 h-3.5 text-amber-300" /></span></Button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-cyan-100">{l('Paragon Elite Gear', 'Paragon Elit Ekipmanı', 'Equipamento de Elite Paragon', 'Equipo de Elite Paragon')}</p>
                <span className="text-[11px] text-cyan-200/80">{l('50th ascension exclusive loadout', '50. yükselişe özel yükleme', 'Loadout exclusivo da 50a ascensão', 'Loadout exclusivo de la ascensión 50')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paragonEliteOffers.map((offer) => {
                  const owned = isParagonOfferOwned(offer.slot, offer.id);
                  const equipped = isParagonOfferEquipped(offer.slot, offer.id);
                  const canAfford = prestigeAmount >= offer.price;
                  const boostLines = getLootBoostLines(offer.boost, language);
                  const slotHint = offer.slot === 'skin'
                    ? l('Body skin: updates core palette and idle glow', 'Gövde kaplaması: çekirdek paleti ve boşta parlamayı günceller', 'Skin corporal: atualiza a paleta do núcleo e o brilho em repouso', 'Skin de cuerpo: actualiza la paleta del núcleo y el brillo en reposo')
                    : offer.slot === 'headstyle'
                      ? l('Headstyle: replaces head model silhouette', 'Baş stili: kafa modelinin siluetini değiştirir', 'Estilo de cabeça: muda a silhueta do modelo da cabeça', 'Estilo de cabeza: cambia la silueta del modelo de la cabeza')
                      : offer.slot === 'accessory'
                        ? l('Accessory: overlays a wearable module on head slot', 'Aksesuar: baş yuvasına giyilebilir bir modül ekler', 'Acessório: adiciona um módulo vestível ao slot da cabeça', 'Accesorio: superpone un módulo vestible en la ranura de la cabeza')
                        : l('Theme: updates room background and ambience', 'Tema: oda arka planı ve ambiyansı günceller', 'Tema: atualiza o fundo e a ambiencia da sala', 'Tema: actualiza el fondo y el ambiente de la sala');

                  return (
                    <div key={offer.id} className={`rounded-lg border p-3 ${equipped ? 'border-cyan-400/60 bg-cyan-500/10' : owned ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-600/40 bg-slate-900/55'}`}>
                      <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-3">
                        <div className="relative h-20 rounded border border-cyan-500/30 bg-slate-950/70 overflow-hidden">{renderParagonOfferPreview(offer)}</div>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-cyan-100">{offer.name}</p>
                            <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${lootRarityClass[offer.rarity as keyof typeof lootRarityClass]}`}>{language === 'tr' ? offer.slot === 'skin' ? 'gövde' : offer.slot === 'headstyle' ? 'bas' : offer.slot === 'accessory' ? 'aksesuar' : 'tema' : language === 'pt-BR' ? offer.slot === 'skin' ? 'corpo' : offer.slot === 'headstyle' ? 'cabeca' : offer.slot === 'accessory' ? 'acessorio' : 'tema' : language === 'es' ? offer.slot === 'skin' ? 'cuerpo' : offer.slot === 'headstyle' ? 'cabeza' : offer.slot === 'accessory' ? 'accesorio' : 'tema' : language === 'ru' ? offer.slot === 'skin' ? 'корпус' : offer.slot === 'headstyle' ? 'голова' : offer.slot === 'accessory' ? 'аксессуар' : 'тема' : language === 'zh-CN' ? offer.slot === 'skin' ? '机体' : offer.slot === 'headstyle' ? '头部样式' : offer.slot === 'accessory' ? '配件' : '主题' : offer.slot}</span>
                          </div>
                          <p className="mt-1 text-[10px] text-amber-200/80">{slotHint}</p>
                          <p className="mt-1 text-[11px] text-slate-300/85">{offer.description}</p>
                          {boostLines.length > 0 && <p className="mt-1 text-[10px] text-emerald-300/90">{boostLines.join(' | ')}</p>}
                          <div className="mt-2">
                            {owned ? (equipped ? <div className="rounded border border-cyan-500/45 bg-cyan-500/10 px-2 py-1 text-center text-xs text-cyan-200">{l('Equipped', 'Takılı', 'Equipado')}</div> : <Button onClick={() => equipCosmetic(offer.slot, offer.id)} className="h-8 w-full bg-cyan-600 hover:bg-cyan-500 text-xs">{l('Equip', 'Tak', 'Equipar')}</Button>) : <Button onClick={() => buyCosmetic(offer.slot, offer.id)} disabled={!canAfford} className="h-8 w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs"><span className="inline-flex items-center gap-1">{l('Buy', 'Satın Al', 'Comprar')} {formatNumber(offer.price)}<CurrencyIcon kind="ascension" className="w-3.5 h-3.5 text-amber-300" /></span></Button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

