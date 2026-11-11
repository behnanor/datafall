import type { L6 } from "@/lib/bossVariants";

// In-game "What's new" notes, newest version first.
//
// HOW TO EDIT: one entry = one bullet on the screen. Add or delete entries freely; the screen
// lays itself out from this list. `area` only picks the icon colour. Keep each line to one short
// sentence about what the player notices. The order is: en, tr, pt-BR, es, ru, zh-CN.
//
// The screen shows once to returning players when WHATS_NEW_VERSION (useGame.ts) is newer than
// the version saved in their file, and anyone can reopen it from Settings.

export type WhatsNewArea = "fix" | "boss" | "ui" | "content" | "perf";
export type WhatsNewEntry = { id: string; area: WhatsNewArea; text: L6 };
export type WhatsNewRelease = { version: string; title: L6; entries: WhatsNewEntry[] };

export const WHATS_NEW_RELEASES: WhatsNewRelease[] = [
  {
    version: "1.04",
    title: ["Fairer, clearer, smoother", "Daha adil, daha net, daha akıcı", "Mais justo, mais claro, mais fluido", "Más justo, más claro, más fluido", "Честнее, понятнее, плавнее", "更公平、更清晰、更流畅"],
    entries: [
      { id: "boss-fair", area: "boss", text: [
        "Fairer bosses: a lost fight keeps 50% of the Prestige, you get one free retry, and an Assist option gives more time.",
        "Daha adil bosslar: kaybedilen savaşta Prestijin %50'si kalır, bir bedava tekrar hakkın var ve Yardım seçeneği daha çok süre verir.",
        "Chefes mais justos: perder mantém 50% do Prestígio, você ganha uma nova tentativa grátis e o modo Assistência dá mais tempo.",
        "Jefes más justos: perder conserva el 50% del Prestigio, tienes un reintento gratis y el modo Asistencia da más tiempo.",
        "Честнее боссы: при поражении остаётся 50% престижа, есть одна бесплатная попытка, а режим помощи даёт больше времени.",
        "首领更公平：战败保留 50% 声望，可免费重试一次，辅助模式提供更多时间。",
      ] },
      { id: "boss-variety", area: "boss", text: [
        "Six different boss designs from ascension 11 on, and your click upgrades now help in boss fights.",
        "Yükseliş 11'den itibaren altı farklı boss tasarımı; tıklama yükseltmelerin artık boss savaşlarında da işe yarıyor.",
        "Seis visuais de chefe diferentes a partir da ascensão 11, e suas melhorias de clique agora ajudam nas lutas.",
        "Seis diseños de jefe distintos desde la ascensión 11, y tus mejoras de clic ahora ayudan en los combates.",
        "Шесть разных боссов начиная с 11-го вознесения, а улучшения клика теперь помогают в бою.",
        "从第 11 次飞升起有六种不同的首领造型，点击升级现在也会在首领战中生效。",
      ] },
      { id: "paragon2", area: "content", text: [
        "Paragon II modules are now as strong as Paragon I and cheaper to start.",
        "Paragon II modülleri artık Paragon I kadar güçlü ve başlangıçta daha ucuz.",
        "Os módulos Paragon II agora são tão fortes quanto os do Paragon I e mais baratos no início.",
        "Los módulos Paragon II ahora son tan fuertes como los de Paragon I y más baratos al principio.",
        "Модули Paragon II теперь так же сильны, как Paragon I, и дешевле на старте.",
        "Paragon II 模块现在与 Paragon I 一样强，且起步更便宜。",
      ] },
      { id: "tutorial", area: "ui", text: [
        "A shorter tutorial that teaches the real loop: click, build, sell, mine, ascend, with a reward at every step.",
        "Gerçek döngüyü öğreten daha kısa bir öğretici: tıkla, kur, sat, kaz, yüksel; her adımda ödül.",
        "Um tutorial mais curto que ensina o ciclo real: clicar, construir, vender, minerar, ascender, com recompensa a cada passo.",
        "Un tutorial más corto que enseña el ciclo real: clic, construir, vender, minar, ascender, con recompensa en cada paso.",
        "Короткое обучение по настоящему циклу: клик, стройка, продажа, майнинг, вознесение, с наградой за каждый шаг.",
        "更短的教程，教你真正的循环：点击、建造、出售、挖矿、飞升，每一步都有奖励。",
      ] },
      { id: "cosmetics-clear", area: "ui", text: [
        "Cosmetics explained: each slot shows what it boosts, an Equip best button, and the Ascension set bonus is visible.",
        "Kozmetikler artık net: her slot neyi artırdığını gösteriyor, En iyisini tak butonu var ve Yükseliş set bonusu görünüyor.",
        "Cosméticos explicados: cada espaço mostra o que aumenta, há um botão Equipar melhores e o bônus de conjunto aparece.",
        "Cosméticos explicados: cada ranura muestra qué mejora, hay un botón Equipar lo mejor y se ve el bono de conjunto.",
        "Косметика стала понятной: у каждого слота видно, что он усиливает, есть кнопка «Надеть лучшее» и виден бонус комплекта.",
        "装扮说明更清楚：每个栏位标明加成属性，新增一键最佳装备，飞升套装加成可见。",
      ] },
      { id: "help-tips", area: "ui", text: [
        "Hover the ? next to Data, Nodes and Crypto to see what they are for. The Ascend window lists what you keep.",
        "Veri, Dizin ve Kripto yanındaki ?'nin üzerine gel, ne işe yaradıklarını gör. Yükseliş penceresi neyin kaldığını listeliyor.",
        "Passe o mouse no ? ao lado de Dados, Nodes e Cripto para ver para que servem. A janela de Ascensão lista o que você mantém.",
        "Pasa el ratón por el ? junto a Datos, Nodos y Cripto para ver para qué sirven. La ventana de Ascensión muestra lo que conservas.",
        "Наведите на ? рядом с данными, узлами и криптой, чтобы узнать, зачем они. Окно вознесения показывает, что сохраняется.",
        "将鼠标悬停在数据、节点和加密货币旁的 ? 上即可查看用途。飞升窗口会列出保留的内容。",
      ] },
      { id: "settings", area: "ui", text: [
        "New settings: text size, click effects on/off, and Reduce Scene Glow.",
        "Yeni ayarlar: yazı boyutu, tıklama efektleri açık/kapalı ve Sahne Parlamasını Azalt.",
        "Novas opções: tamanho do texto, efeitos de clique liga/desliga e Reduzir brilho da cena.",
        "Nuevas opciones: tamaño de texto, efectos de clic sí/no y Reducir brillo de escena.",
        "Новые настройки: размер текста, эффекты кликов вкл/выкл и «Меньше свечения сцены».",
        "新设置：文字大小、点击特效开关，以及降低场景光晕。",
      ] },
      { id: "saves", area: "fix", text: [
        "Safer saves: rotating backups, and the game never overwrites a save it could not read.",
        "Daha güvenli kayıt: dönüşümlü yedekler var ve oyun okuyamadığı bir kaydın üzerine asla yazmıyor.",
        "Saves mais seguros: backups rotativos, e o jogo nunca sobrescreve um save que não conseguiu ler.",
        "Partidas más seguras: copias rotativas, y el juego nunca sobrescribe una partida que no pudo leer.",
        "Надёжнее сохранения: сменные резервные копии, и игра не перезаписывает сохранение, которое не смогла прочитать.",
        "存档更安全：轮换备份，且游戏绝不会覆盖无法读取的存档。",
      ] },
      { id: "perf", area: "perf", text: [
        "Much lower CPU use while idle, crash recovery, and a fix for alt-tab.",
        "Boştayken çok daha az işlemci kullanımı, çökme kurtarma ve alt-tab düzeltmesi.",
        "Uso de CPU bem menor parado, recuperação de falhas e correção do alt-tab.",
        "Mucho menos uso de CPU en reposo, recuperación ante cierres y arreglo del alt-tab.",
        "Намного меньше нагрузка на процессор в простое, восстановление после сбоев и исправлен alt-tab.",
        "空闲时 CPU 占用大幅降低，新增崩溃恢复，并修复了 Alt-Tab 问题。",
      ] },
      { id: "names", area: "fix", text: [
        "Cleaner names and many missing translations filled in.",
        "Daha düzgün isimler ve eksik çevirilerin çoğu tamamlandı.",
        "Nomes mais claros e muitas traduções que faltavam.",
        "Nombres más claros y muchas traducciones que faltaban.",
        "Понятнее названия, добавлено много недостающих переводов.",
        "名称更清晰，补全了大量缺失的翻译。",
      ] },
    ],
  },
  {
    version: "1.03",
    title: ["The Core Update", "Çekirdek Güncellemesi", "A Atualização do Núcleo", "La Actualización del Núcleo", "Обновление «Ядро»", "核心更新"],
    entries: [
      { id: "pacing", area: "content", text: ["Faster progression: ascension 50 is now about 50 hours away, with something new every 5 ascensions.", "Daha hızlı ilerleme: yükseliş 50 artık yaklaşık 50 saat uzakta ve her 5 yükselişte yeni bir şey açılıyor.", "Progresso mais rápido: a ascensão 50 agora fica a cerca de 50 horas, com algo novo a cada 5 ascensões.", "Progreso más rápido: la ascensión 50 está ahora a unas 50 horas, con algo nuevo cada 5 ascensiones.", "Быстрее прогресс: до 50-го вознесения теперь около 50 часов, и каждые 5 вознесений открывается что-то новое.", "进度更快：第 50 次飞升现在约需 50 小时，每 5 次飞升都会解锁新内容。"] },
      { id: "ending", area: "content", text: ["A real ending: break the Core at ascension 50, then Endless mode with rewards every 5 depths.", "Gerçek bir son: yükseliş 50'de Çekirdeği kır, ardından her 5 derinlikte ödül veren Sonsuz mod.", "Um final de verdade: quebre o Núcleo na ascensão 50 e depois o modo Infinito, com recompensas a cada 5 níveis.", "Un final de verdad: rompe el Núcleo en la ascensión 50 y luego el modo Infinito, con recompensas cada 5 niveles.", "Настоящий финал: сломай Ядро на 50-м вознесении, затем бесконечный режим с наградами каждые 5 уровней.", "真正的结局：在第 50 次飞升击破核心，然后进入每 5 层都有奖励的无尽模式。"] },
      { id: "systems", area: "content", text: ["New systems: Automation (15), Paragon II (25), Challenges (30), the Core Signal boss (45).", "Yeni sistemler: Otomasyon (15), Paragon II (25), Meydan Okumalar (30), Çekirdek Sinyali bossu (45).", "Novos sistemas: Automação (15), Paragon II (25), Desafios (30), o chefe Sinal do Núcleo (45).", "Nuevos sistemas: Automatización (15), Paragon II (25), Desafíos (30), el jefe Señal del Núcleo (45).", "Новые системы: автоматизация (15), Paragon II (25), испытания (30), босс «Сигнал Ядра» (45).", "新系统：自动化 (15)、Paragon II (25)、挑战 (30)、核心信号首领 (45)。"] },
      { id: "modifiers", area: "boss", text: ["Bosses get modifiers; with automation on, only every 5th ascension needs a fight.", "Bosslar artık değiştiricilere sahip; otomasyon açıkken sadece her 5. yükselişte savaş var.", "Os chefes têm modificadores; com a automação ligada, só a cada 5ª ascensão há luta.", "Los jefes tienen modificadores; con la automatización activa, solo cada 5ª ascensión hay combate.", "У боссов появились модификаторы; с автоматизацией бой нужен только каждое 5-е вознесение.", "首领拥有词缀；开启自动化后，每 5 次飞升才需战斗一次。"] },
      { id: "next-goal", area: "ui", text: ["A \"Next goal\" tracker, auto-buy modes, and the Prestige shop rebalanced (any difference was refunded).", "\"Sıradaki hedef\" göstergesi, otomatik alım modları ve yeniden dengelenen Prestij dükkânı (fark sana iade edildi).", "Um marcador de \"Próxima meta\", modos de compra automática e a loja de Prestígio rebalanceada (a diferença foi reembolsada).", "Un indicador de \"Siguiente meta\", modos de compra automática y la tienda de Prestigio reequilibrada (la diferencia se reembolsó).", "Трекер «Следующая цель», режимы автопокупки и перебалансированный магазин престижа (разница возвращена).", "\"下一个目标\"追踪、自动购买模式，以及重新平衡的声望商店（差额已返还）。"] },
      { id: "achievements", area: "fix", text: ["Steam achievements fixed: the ones you already earned unlock automatically.", "Steam başarımları düzeltildi: zaten kazandıkların kendiliğinden açılıyor.", "Conquistas da Steam corrigidas: as que você já ganhou são desbloqueadas automaticamente.", "Logros de Steam corregidos: los que ya conseguiste se desbloquean automáticamente.", "Достижения Steam исправлены: уже заработанные откроются автоматически.", "Steam 成就已修复：已获得的成就会自动解锁。"] },
    ],
  },
];

/** Releases newer than the one the player last saw (all of them for a pre-1.03 save). */
export const getUnseenReleases = (seenVersion: string): WhatsNewRelease[] =>
  WHATS_NEW_RELEASES.filter(r => compareVersions(r.version, seenVersion) > 0);

/** "1.10" > "1.9"; an empty or unknown version counts as 0. */
export const compareVersions = (a: string, b: string): number => {
  const pa = (a || "0").split(".").map(n => parseInt(n, 10) || 0);
  const pb = (b || "0").split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};
