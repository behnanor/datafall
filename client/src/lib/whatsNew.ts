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
      { id: "paragon3", area: "boss", text: [
        "Paragon III modules: Breach Driver (ascension 35) adds boss damage, Chrono Siege (ascension 45) adds boss time.",
        "Paragon III modülleri: Breach Driver (yükseliş 35) boss hasarı, Chrono Siege (yükseliş 45) boss süresi ekliyor.",
        "Módulos Paragon III: Breach Driver (ascensão 35) aumenta o dano no chefe, Chrono Siege (ascensão 45) dá mais tempo.",
        "Módulos Paragon III: Breach Driver (ascensión 35) aumenta el daño al jefe, Chrono Siege (ascensión 45) da más tiempo.",
        "Модули Paragon III: Breach Driver (35-е вознесение) усиливает урон по боссам, Chrono Siege (45-е) добавляет время.",
        "Paragon III 模块：Breach Driver（第 35 次飞升）提升首领伤害，Chrono Siege（第 45 次飞升）增加首领战时间。",
      ] },
      { id: "abyss", area: "content", text: [
        "After the Core: an uncapped Abyss Core module, a choice of 1 of 3 Abyss Boons every 5 Endless depths, and deeper Core Echoes pay more.",
        "Çekirdekten sonra: sınırsız Abyss Core modülü, her 5 Sonsuz derinlikte 3 Abyss Boon'dan birini seçme ve daha derin Çekirdek Yankıları daha çok ödül veriyor.",
        "Depois do Núcleo: o módulo Abyss Core sem limite, escolha 1 de 3 Abyss Boons a cada 5 níveis do Infinito, e Ecos do Núcleo mais fundos pagam mais.",
        "Tras el Núcleo: el módulo Abyss Core sin límite, elige 1 de 3 Abyss Boons cada 5 niveles del Infinito, y los Ecos del Núcleo más profundos pagan más.",
        "После Ядра: безлимитный модуль Abyss Core, выбор 1 из 3 даров Бездны каждые 5 уровней бесконечного режима, и глубокие Эхо Ядра платят больше.",
        "击破核心之后：无上限的 Abyss Core 模块，无尽模式每 5 层三选一的深渊祝福，越深的核心回响奖励越多。",
      ] },
      { id: "network-events", area: "content", text: [
        "Network Events: every few minutes a short surprise like a Data Surge, a Market Spike, an Encrypted Cache to crack or a deal to accept.",
        "Ağ Olayları: birkaç dakikada bir Veri Dalgası, Piyasa Sıçraması, kırılacak Şifreli Önbellek ya da kabul edilecek bir anlaşma gibi kısa bir sürpriz.",
        "Eventos de Rede: a cada poucos minutos uma surpresa curta, como um Surto de Dados, um Pico de Mercado, um Cache Criptografado ou uma oferta.",
        "Eventos de Red: cada pocos minutos una sorpresa breve, como una Oleada de Datos, un Pico del Mercado, una Caché Cifrada o un trato.",
        "Сетевые события: каждые несколько минут короткий сюрприз, например всплеск данных, скачок рынка, тайник для взлома или сделка.",
        "网络事件：每隔几分钟出现一次短暂惊喜，如数据涌流、市场暴涨、待破解的加密缓存或一笔交易。",
      ] },
      { id: "run-protocols", area: "content", text: [
        "Run Protocols: from ascension 3, after each ascension, pick 1 of 3 modifiers for the next run, built for idle or active play.",
        "Tur Protokolleri: 3. yükselişten itibaren her yükselişten sonra bir sonraki tur için 3 değiştiriciden birini seç; boşta ya da aktif oynayışa göre.",
        "Protocolos de Rodada: a partir da ascensão 3, após cada ascensão escolha 1 de 3 modificadores para a próxima rodada, para jogo ocioso ou ativo.",
        "Protocolos de Partida: desde la ascensión 3, tras cada ascensión elige 1 de 3 modificadores para la siguiente partida, para juego pasivo o activo.",
        "Протоколы забега: с 3-го вознесения после каждого вознесения выбери 1 из 3 модификаторов на следующий забег, для АФК или активной игры.",
        "本轮协议：从第 3 次飞升起，每次飞升后，为下一轮从 3 个修正中选 1 个，适合挂机或主动玩法。",
      ] },
      { id: "boss-mods", area: "boss", text: [
        "Three new boss modifiers (Phasing, Bounty, Volatile), and the same modifier no longer repeats fight after fight.",
        "Üç yeni boss değiştiricisi (Faz Kayması, Ödül Avı, Kararsız); aynı değiştirici artık savaştan savaşa tekrar etmiyor.",
        "Três novos modificadores de chefe (Em Fase, Recompensa, Volátil), e o mesmo modificador não se repete luta após luta.",
        "Tres nuevos modificadores de jefe (Desfasado, Recompensa, Volátil), y el mismo modificador ya no se repite combate tras combate.",
        "Три новых модификатора боссов (Фазовый, Награда, Нестабильный), и один и тот же больше не повторяется бой за боем.",
        "新增三种首领词缀（相位、悬赏、不稳定），同一词缀不再连续出现。",
      ] },
      { id: "juice", area: "ui", text: [
        "More punch: crits shake the screen, bigger floating numbers, a click sound that rises as you speed up, and CHECKPOINT! and production milestone banners.",
        "Daha çok his: kritikler ekranı sallıyor, daha büyük uçan sayılar, hızlandıkça yükselen tıklama sesi, CHECKPOINT! ve üretim dönüm noktası afişleri.",
        "Mais impacto: críticos tremem a tela, números flutuantes maiores, som de clique que sobe com a velocidade e banners de CHECKPOINT! e marcos de produção.",
        "Más impacto: los críticos sacuden la pantalla, números flotantes más grandes, un sonido de clic que sube al acelerar y avisos de CHECKPOINT! e hitos de producción.",
        "Больше отдачи: криты трясут экран, крупнее всплывающие числа, звук клика растёт с темпом, баннеры CHECKPOINT! и рубежей производства.",
        "手感更强：暴击震屏、更大的浮动数字、点击越快音调越高，以及 CHECKPOINT! 和产量里程碑横幅。",
      ] },
      { id: "upgrade-cards", area: "ui", text: [
        "Upgrade cards show what a machine really produces, including all your bonuses, and the right checkpoint multiplier.",
        "Yükseltme kartları bir makinenin gerçekte ne ürettiğini tüm bonuslarınla ve doğru eşik çarpanıyla gösteriyor.",
        "Os cartões de melhoria mostram o que a máquina realmente produz, com todos os seus bônus e o multiplicador de checkpoint certo.",
        "Las tarjetas de mejora muestran lo que la máquina produce de verdad, con todos tus bonos y el multiplicador de checkpoint correcto.",
        "Карточки улучшений показывают реальную выработку машины со всеми бонусами и верный множитель рубежа.",
        "升级卡片会显示机器的真实产量（含全部加成）以及正确的检查点倍率。",
      ] },
      { id: "pay-with-data", area: "content", text: [
        "Short on Nodes? After your first ascension, buying sells just enough Data for you. Crypto mining also stays unlocked after ascending.",
        "Dizin'in yetmiyor mu? İlk yükselişten sonra satın alırken eksik kadar Veri senin için satılıyor. Kripto madenciliği de yükselişten sonra açık kalıyor.",
        "Faltam Nodes? Depois da primeira ascensão, a compra vende só os Dados necessários. A mineração de cripto também continua desbloqueada.",
        "¿Te faltan Nodos? Tras tu primera ascensión, al comprar se venden solo los Datos necesarios. La minería de cripto sigue desbloqueada al ascender.",
        "Не хватает узлов? После первого вознесения покупка сама продаст нужные данные. Майнинг крипты теперь остаётся открытым после вознесения.",
        "节点不够？首次飞升后，购买时会自动出售所需的数据。飞升后加密挖矿也保持解锁。",
      ] },
      { id: "prestige-shop", area: "content", text: [
        "Prestige Shop: playstyle tags and a filter, a Best value badge, and three weak upgrades made stronger. Contracts now pay rewards worth taking.",
        "Prestij Dükkânı: oyun tarzı etiketleri ve filtre, En iyi değer rozeti; üç zayıf yükseltme güçlendirildi. Görevler artık değerli ödüller veriyor.",
        "Loja de Prestígio: etiquetas de estilo de jogo e filtro, selo de Melhor valor e três melhorias fracas reforçadas. Contratos agora pagam bem.",
        "Tienda de Prestigio: etiquetas de estilo de juego y filtro, insignia de Mejor valor y tres mejoras débiles reforzadas. Los contratos ahora pagan de verdad.",
        "Магазин престижа: метки стиля игры и фильтр, значок «Лучшая цена», три слабых улучшения усилены. Контракты теперь дают достойные награды.",
        "声望商店：玩法标签与筛选、“最划算”标记，三项较弱的升级已加强。合约奖励现在物有所值。",
      ] },
      { id: "late-pacing", area: "content", text: [
        "Late runs no longer shrink to a minute: ascensions past 15 cost a bit more each time, and Head Start gives 12 seconds per level.",
        "Geç turlar artık bir dakikaya inmiyor: 15'ten sonraki her yükseliş biraz daha pahalı, Önde Başlangıç seviye başına 12 saniye veriyor.",
        "As runs finais não encolhem mais para um minuto: ascensões após a 15 custam um pouco mais a cada vez, e a Largada Inicial dá 12 segundos por nível.",
        "Las partidas tardías ya no se reducen a un minuto: las ascensiones tras la 15 cuestan algo más cada vez, y Ventaja Inicial da 12 segundos por nivel.",
        "Поздние забеги больше не сжимаются до минуты: вознесения после 15-го каждый раз немного дороже, а «Фора на старте» даёт 12 секунд за уровень.",
        "后期轮次不再缩短到一分钟：第 15 次之后每次飞升都会更贵一些，领先开局每级提供 12 秒。",
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
        "New settings: text size, click effects on/off, screen shake on/off, and Reduce Scene Glow.",
        "Yeni ayarlar: yazı boyutu, tıklama efektleri açık/kapalı, ekran sallanması açık/kapalı ve Sahne Parlamasını Azalt.",
        "Novas opções: tamanho do texto, efeitos de clique liga/desliga, tremor de tela liga/desliga e Reduzir brilho da cena.",
        "Nuevas opciones: tamaño de texto, efectos de clic sí/no, sacudida de pantalla sí/no y Reducir brillo de escena.",
        "Новые настройки: размер текста, эффекты кликов и тряска экрана вкл/выкл, «Меньше свечения сцены».",
        "新设置：文字大小、点击特效开关、屏幕震动开关，以及降低场景光晕。",
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
