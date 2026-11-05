import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getRussianTextFallback } from "./ruText";
import { getSimplifiedChineseTextFallback } from "./zhCnText";

export type Language = "en" | "tr" | "pt-BR" | "es" | "ru" | "zh-CN";

export type LocalizedText = {
  en: string;
  tr: string;
  "pt-BR"?: string;
  es?: string;
  ru?: string;
  "zh-CN"?: string;
};

type TranslationLeaf = string;
type TranslationTree = {
  [key: string]: TranslationLeaf | TranslationTree;
};

type TranslateParams = Record<string, string | number>;

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslateParams) => string;
};

const LANGUAGE_STORAGE_KEY = "datafall-language";
const LANGUAGE_SOURCE_STORAGE_KEY = "datafall-language-source";
type LanguagePreferenceSource = "user" | "auto";

const translations: Record<Language, TranslationTree> = {
  en: {
    common: {
      on: "ON",
      off: "OFF",
      close: "Close",
      cancel: "Cancel",
      convert: "Convert",
      loading: "Loading...",
      data: "Data",
      nodes: "Nodes",
      crypto: "Crypto",
      stats: "Stats",
      settings: "Settings",
      current: "Current",
      next: "Next",
      ready: "Ready",
      locked: "Locked",
      visible: "Visible",
      active: "Active",
      affordable: "Affordable",
      completed: "Completed",
      levelShort: "Lvl",
      none: "None",
      equipped: "Equipped",
      tutorial: "Tutorial",
      language: "Language",
      english: "English",
      turkish: "Turkce",
      portugueseBrazil: "Português (Brasil)",
      spanish: "Spanish",
      russian: "Russian",
      simplifiedChinese: "Simplified Chinese",
    },
    settings: {
      title: "SETTINGS",
      audioSettings: "Audio Settings",
      masterVolume: "Master Volume",
      backgroundMusic: "Background Music",
      musicVolume: "Music Volume",
      sfxVolume: "SFX Volume",
      nextTrack: "NEXT TRACK",
      tutorialStatusSkipped: "Tutorial skipped",
      tutorialStatusComplete: "Tutorial complete",
      skipTutorial: "SKIP TUTORIAL",
      restartTutorial: "RESTART TUTORIAL",
      restartTutorialConfirm: "Restart the tutorial from the beginning?",
      displaySettings: "Display Settings",
      performanceMode: "Performance Mode",
      disableSceneGlow: "Reduce Scene Glow",
      disableSceneGlowHint: "Turns off heavy scene glows for better FPS",
      fullscreen: "FULLSCREEN",
      windowed: "WINDOWED",
      languageSettings: "Language",
      autoSave: "Auto-saves every 5 seconds",
      saveAndExit: "SAVE & EXIT",
    },
    tutorialPanel: {
      aiHandler: "AI Handler",
      welcome: "Welcome, Operator. I'm ARIA, your AI handler. Ready to begin your training?",
      beginTraining: "Begin Training",
      skip: "Skip",
      defaultTitle: "Tutorial",
      objectivesCount: "{completed}/{total} objectives",
      expand: "Expand tutorial panel",
      collapse: "Collapse tutorial panel",
    },
    resourcePanel: {
      ascend: "Ascend",
      required: "Required",
      currentAscension: "Current Ascension",
      resources: "RESOURCES",
      systemOnline: "System Status: Online",
      convertLabel: "Convert",
      convertAll: "ALL",
      customAmount: "Custom amount",
      maxAsc: "Max Asc.",
      openBoard: "Open Board",
      youRank: "You: #{rank}",
      cosmeticsMarket: "COSMETICS MARKET",
      relicForge: "RELIC FORGE",
      blackMarket: "BLACK MARKET",
      paragonLab: "PARAGON LAB",
      unlockAtAscension: "Unlocks at Ascension {requirement} ({current}/{requirement})",
      terminalLog: "Terminal Log",
      systemInitialized: "System initialized...",
      connectionEstablished: "Connection established...",
      waitingForInput: "Waiting for user input...",
      confirmAscension: "Confirm Ascension",
      confirmAscensionBody: "Are you ready to reset your progress and claim your rewards?",
      currentCrypto: "Current Crypto",
      requiredCrypto: "Required Crypto",
      missing: "Missing",
      prestigeReward: "Prestige Reward",
      warningReset: "Warning: This will reset:",
      resetDataNodesCrypto: "All Data, Nodes, and Crypto",
      resetUpgrades: "All Upgrades (Factory, Click, Mining)",
      resetTimer: "Current run timer",
      keptPrestige: "Kept: Prestige Points & Prestige Upgrades",
      moreCryptoTip: "Tip: More crypto = exponentially more prestige!",
      faceFirewall: "Face the Firewall",
      customConversion: "Custom Conversion",
      customConversionBody: "Enter node amount to convert (100 data -> 1 node)",
      nodesToReceive: "Nodes to Receive",
      enterAmount: "Enter amount",
      willCost: "Will cost: {amount} data",
      availableData: "Available Data:",
      invalidAmount: "Please enter a valid number",
      needData: "Need {needed} data (you have {current})",
    },
    upgradePanel: {
      market: "MARKET",
      upgradeSystems: "Upgrade Systems",
      critChance: "Crit Chance",
      totalLevels: "Total Lvls",
      factory: "Factory",
      click: "Click",
      mining: "Mining",
      jobs: "Jobs",
      online: "ONLINE",
      current: "Current",
      afterBuy: "After Buy",
      total: "Total",
      checkpoint: "Checkpoint",
      nextMultiplier: "Next: 2x multiplier at lvl {level}",
      unlocked: "Unlocked",
      unlockCategory: "Unlock {category}",
      noBonus: "No bonus yet",
      needResources: "Need {resources}",
      clickValue: "click value",
      clickMultiplier: "click multiplier",
      critChanceValue: "crit chance",
      critMultiplier: "crit multiplier",
    },
    prestigePanel: {
      title: "Prestige Realm",
      balance: "Balance",
      maxed: "Maxed",
      totalPurchasedLevels: "Total purchased levels: {total}",
      complete: "Complete",
      noBonus: "No bonus yet",
      clickPower: "click power",
      production: "production",
      critChance: "crit chance",
      critDamage: "crit damage",
      pickupChance: "pickup chance",
      pickupValue: "pickup value",
      pickupSpawnRate: "pickup spawn rate",
      timeWarpChance: "Time Warp chance",
      timeWarpOutput: "compressed output on Time Warp",
      timeWarpCooldown: "Time Warp cooldown",
      prestigeGain: "prestige gain",
      offlineEarnings: "offline earnings",
      maxOfflineTime: "max offline time",
      cryptoProduction: "crypto production",
      dataConversion: "data conversion",
      startingData: "of last run's production at start",
      upgradeCost: "upgrade cost",
      checkpointSpeed: "checkpoint speed",
    },
    useGame: {
      preview: {
        alreadyUnlocked: "[ALREADY UNLOCKED]",
        unlock: "[UNLOCK {category}]",
        production: "[+{value} {resource}/s]",
        click: "[+{value} click]",
        clickMultiplier: "[+{value}% multiplier]",
        critChance: "[+{value}% crit]",
        critMultiplier: "[+{value}x crit]",
      },
      lastUpgrade: {
        purchased: "Upgrade purchased x{count}",
        timeWarpDebug: "Blackhole anomaly spawned ({minutes}m cap).",
        ascended: "+{gain} prestige points",
      },
    },
  },
  tr: {
    common: {
      on: "AÇIK",
      off: "KAPALI",
      close: "Kapat",
      cancel: "İptal",
      convert: "Dönüştür",
      loading: "Yükleniyor...",
      data: "Veri",
      nodes: "Dizin",
      crypto: "Kripto",
      stats: "İstatistikler",
      settings: "Ayarlar",
      current: "Mevcut",
      next: "Sonraki",
      ready: "Hazır",
      locked: "Kilitli",
      visible: "Görünen",
      active: "Aktif",
      affordable: "Alınabilir",
      completed: "Tamamlanan",
      levelShort: "Sv",
      none: "Yok",
      equipped: "Takılı",
      tutorial: "Eğitim",
      language: "Dil",
      english: "English",
      turkish: "Türkçe",
      portugueseBrazil: "Portekizce (Brezilya)",
      spanish: "İspanyolca",
      russian: "Rusça",
      simplifiedChinese: "Basitleştirilmiş Çince",
    },
    settings: {
      title: "AYARLAR",
      audioSettings: "Ses Ayarları",
      masterVolume: "Ana Ses",
      backgroundMusic: "Arka Plan Müziği",
      musicVolume: "Müzik Seviyesi",
      sfxVolume: "Efekt Seviyesi",
      nextTrack: "SONRAKİ PARÇA",
      tutorialStatusSkipped: "Eğitim atlandı",
      tutorialStatusComplete: "Eğitim tamamlandı",
      skipTutorial: "EĞİTİMİ ATLA",
      restartTutorial: "EĞİTİMİ YENİDEN BAŞLAT",
      restartTutorialConfirm: "Eğitimi baştan yeniden başlatmak istiyor musun?",
      displaySettings: "Görüntü Ayarları",
      performanceMode: "Performans Modu",
      disableSceneGlow: "Sahne Parlamalarini Azalt",
      disableSceneGlowHint: "FPS icin agir sahne parlamalarini kapatir",
      fullscreen: "TAM EKRAN",
      windowed: "PENCERELİ",
      languageSettings: "Dil",
      autoSave: "Her 5 saniyede bir otomatik kaydeder",
      saveAndExit: "KAYDET VE ÇIK",
    },
    tutorialPanel: {
      aiHandler: "YZ Yöneticisi",
      welcome: "Hoş geldin Operatör. Ben ARIA, yapay zekâ yöneticinim. Eğitime başlamaya hazır mısın?",
      beginTraining: "Eğitimi Başlat",
      skip: "Atla",
      defaultTitle: "Eğitim",
      objectivesCount: "{completed}/{total} hedef",
      expand: "Eğitim panelini genişlet",
      collapse: "Eğitim panelini daralt",
    },
    resourcePanel: {
      ascend: "Yüksel",
      required: "Gerekli",
      currentAscension: "Mevcut Yükseliş",
      resources: "KAYNAKLAR",
      systemOnline: "Sistem Durumu: Çevrimiçi",
      convertLabel: "Dönüştür",
      convertAll: "HEPSİ",
      customAmount: "Özel miktar",
      maxAsc: "Maks. Yüks.",
      openBoard: "Tabloyu Aç",
      youRank: "Sen: #{rank}",
      cosmeticsMarket: "KOZMETİK PAZARI",
      relicForge: "YADİGAR DÜKKÂNI",
      blackMarket: "KARABORSA PAZAR",
      paragonLab: "PARAGON LABORATUVARI",
      unlockAtAscension: "{requirement}. yükselişte açılır ({current}/{requirement})",
      terminalLog: "Terminal Kaydı",
      systemInitialized: "Sistem başlatıldı...",
      connectionEstablished: "Bağlantı kuruldu...",
      waitingForInput: "Kullanıcı girdisi bekleniyor...",
      confirmAscension: "Yükselişi Onayla",
      confirmAscensionBody: "İlerlemeni sıfırlayıp ödüllerini almaya hazır mısın?",
      currentCrypto: "Mevcut Kripto",
      requiredCrypto: "Gerekli Kripto",
      missing: "Eksik",
      prestigeReward: "Prestij Ödülü",
      warningReset: "Uyarı: Bunlar sıfırlanacak:",
      resetDataNodesCrypto: "Tüm Veri, Dizin ve Kripto",
      resetUpgrades: "Tüm Yükseltmeler (Üretim, Tıklama, Madencilik)",
      resetTimer: "Mevcut koşu süresi",
      keptPrestige: "Korunur: Prestij Puanı ve Prestij Yükseltmeleri",
      moreCryptoTip: "İpucu: Daha fazla kripto = üssel olarak daha fazla prestij!",
      faceFirewall: "Güvenlik Duvarıyla Yüzleş",
      customConversion: "Özel Dönüşüm",
      customConversionBody: "Dönüştürmek istediğin dizin miktarını gir (100 veri -> 1 dizin)",
      nodesToReceive: "Alınacak Dizin",
      enterAmount: "Miktar gir",
      willCost: "Bedeli: {amount} veri",
      availableData: "Mevcut Veri:",
      invalidAmount: "Lütfen geçerli bir sayı gir",
      needData: "{needed} veri gerekli (sende {current} var)",
    },
    upgradePanel: {
      market: "PAZAR",
      upgradeSystems: "Yükseltme Sistemleri",
      critChance: "Kritik Şansı",
      totalLevels: "Toplam Sv",
      factory: "Üretim",
      click: "Tıklama",
      mining: "Madencilik",
      jobs: "Görevler",
      online: "AKTİF",
      current: "Mevcut",
      afterBuy: "Alım Sonrası",
      total: "Toplam",
      checkpoint: "Eşik",
      nextMultiplier: "Sonraki: sv {level}'de 2x çarpan",
      unlocked: "Açıldı",
      unlockCategory: "{category} kilidini aç",
      noBonus: "Henüz bonus yok",
      needResources: "{resources} gerekli",
      clickValue: "tıklama gücü",
      clickMultiplier: "tıklama çarpanı",
      critChanceValue: "kritik şansı",
      critMultiplier: "kritik çarpanı",
    },
    prestigePanel: {
      title: "Prestij Alanı",
      balance: "Bakiye",
      maxed: "Maks",
      totalPurchasedLevels: "Toplam alınan seviye: {total}",
      complete: "Tamam",
      noBonus: "Henüz bonus yok",
      clickPower: "tıklama gücü",
      production: "üretim",
      critChance: "kritik şansı",
      critDamage: "kritik hasarı",
      pickupChance: "toplama şansı",
      pickupValue: "toplama değeri",
      pickupSpawnRate: "toplama çıkma hızı",
      timeWarpChance: "Time Warp şansı",
      timeWarpOutput: "Time Warp sıkıştırılmış üretim",
      timeWarpCooldown: "Time Warp bekleme süresi",
      prestigeGain: "prestij kazancı",
      offlineEarnings: "çevrimdışı kazanç",
      maxOfflineTime: "maks çevrimdışı süre",
      cryptoProduction: "kripto üretimi",
      dataConversion: "veri dönüşümü",
      startingData: "önceki turun üretimi başlangıçta",
      upgradeCost: "yükseltme maliyeti",
      checkpointSpeed: "eşik hızı",
    },
    useGame: {
      preview: {
        alreadyUnlocked: "[ZATEN AÇIK]",
        unlock: "[AÇ {category}]",
        production: "[+{value} {resource}/sn]",
        click: "[+{value} tıklama]",
        clickMultiplier: "[+{value}% çarpan]",
        critChance: "[+{value}% kritik]",
        critMultiplier: "[+{value}x kritik]",
      },
      lastUpgrade: {
        purchased: "Yükseltme satın alındı x{count}",
        timeWarpDebug: "Karadelik anomalisi oluştu ({minutes}d tavan).",
        ascended: "+{gain} prestij puanı",
      },
    },
  },
  "pt-BR": {
    common: {
      on: "LIGADO",
      off: "DESLIGADO",
      close: "Fechar",
      cancel: "Cancelar",
      convert: "Converter",
      loading: "Carregando...",
      data: "Dados",
      nodes: "Nodes",
      crypto: "Cripto",
      stats: "Estatísticas",
      settings: "Configurações",
      current: "Atual",
      next: "Próximo",
      ready: "Pronto",
      locked: "Bloqueado",
      visible: "Visível",
      active: "Ativo",
      affordable: "Acessível",
      completed: "Concluído",
      levelShort: "Nv",
      none: "Nenhum",
      equipped: "Equipado",
      tutorial: "Tutorial",
      language: "Idioma",
      english: "English",
      turkish: "Turkce",
      portugueseBrazil: "Português (Brasil)",
      spanish: "Espanhol",
      russian: "Russo",
      simplifiedChinese: "Chinês Simplificado",
    },
    settings: {
      title: "CONFIGURAÇÕES",
      audioSettings: "Configurações de Áudio",
      masterVolume: "Volume Geral",
      backgroundMusic: "Música de Fundo",
      musicVolume: "Volume da Música",
      sfxVolume: "Volume dos Efeitos",
      nextTrack: "PRÓXIMA FAIXA",
      tutorialStatusSkipped: "Tutorial pulado",
      tutorialStatusComplete: "Tutorial concluído",
      skipTutorial: "PULAR TUTORIAL",
      restartTutorial: "REINICIAR TUTORIAL",
      restartTutorialConfirm: "Reiniciar o tutorial desde o início?",
      displaySettings: "Configurações de Tela",
      performanceMode: "Modo de Desempenho",
      disableSceneGlow: "Reduzir Brilho da Cena",
      disableSceneGlowHint: "Desliga brilhos pesados da cena para melhorar o FPS",
      fullscreen: "TELA CHEIA",
      windowed: "JANELA",
      languageSettings: "Idioma",
      autoSave: "Salva automaticamente a cada 5 segundos",
      saveAndExit: "SALVAR E SAIR",
    },
    tutorialPanel: {
      aiHandler: "Operadora de IA",
      welcome: "Bem-vindo, Operador. Eu sou a ARIA, sua operadora de IA. Pronto para iniciar o treinamento?",
      beginTraining: "Iniciar Treinamento",
      skip: "Pular",
      defaultTitle: "Tutorial",
      objectivesCount: "{completed}/{total} objetivos",
      expand: "Expandir painel do tutorial",
      collapse: "Recolher painel do tutorial",
    },
    resourcePanel: {
      ascend: "Ascender",
      required: "Necessário",
      currentAscension: "Ascensão Atual",
      resources: "RECURSOS",
      systemOnline: "Status do Sistema: Online",
      convertLabel: "Converter",
      convertAll: "TUDO",
      customAmount: "Quantidade personalizada",
      maxAsc: "Asc. Max.",
      openBoard: "Abrir Ranking",
      youRank: "Você: #{rank}",
      cosmeticsMarket: "MERCADO COSMÉTICO",
      relicForge: "LOJA DE RELÍQUIAS",
      blackMarket: "MERCADO NEGRO",
      paragonLab: "LABORATÓRIO PARAGON",
      unlockAtAscension: "Desbloqueia na Ascensão {requirement} ({current}/{requirement})",
      terminalLog: "Log do Terminal",
      systemInitialized: "Sistema inicializado...",
      connectionEstablished: "Conexão estabelecida...",
      waitingForInput: "Aguardando entrada do usuário...",
      confirmAscension: "Confirmar Ascensão",
      confirmAscensionBody: "Deseja resetar seu progresso e receber suas recompensas?",
      currentCrypto: "Cripto Atual",
      requiredCrypto: "Cripto Necessário",
      missing: "Faltando",
      prestigeReward: "Recompensa de Prestígio",
      warningReset: "Aviso: Isto será resetado:",
      resetDataNodesCrypto: "Todos os Dados, Nodes e Cripto",
      resetUpgrades: "Todos os upgrades (Produção, Clique, Mineração)",
      resetTimer: "Tempo da corrida atual",
      keptPrestige: "Mantido: Pontos de Prestígio e Upgrades de Prestígio",
      moreCryptoTip: "Dica: mais cripto = muito mais prestígio!",
      faceFirewall: "Enfrentar Firewall",
      customConversion: "Conversão Personalizada",
      customConversionBody: "Digite a quantidade de Nodes que deseja converter (100 dados -> 1 Node)",
      nodesToReceive: "Nodes a receber",
      enterAmount: "Digite a quantidade",
      willCost: "Custo: {amount} dados",
      availableData: "Dados disponíveis:",
      invalidAmount: "Digite um número válido",
      needData: "{needed} dados necessários (você tem {current})",
    },
    upgradePanel: {
      market: "MERCADO",
      upgradeSystems: "Sistemas de Upgrade",
      critChance: "Chance Crítica",
      totalLevels: "Níveis Totais",
      factory: "Produção",
      click: "Clique",
      mining: "Mineração",
      jobs: "Contratos",
      online: "ATIVO",
      current: "Atual",
      afterBuy: "Após compra",
      total: "Total",
      checkpoint: "Marco",
      nextMultiplier: "Próximo: multiplicador 2x no nv {level}",
      unlocked: "Desbloqueado",
      unlockCategory: "Desbloquear {category}",
      noBonus: "Ainda sem bônus",
      needResources: "{resources} necessários",
      clickValue: "poder de clique",
      clickMultiplier: "multiplicador de clique",
      critChanceValue: "chance crítica",
      critMultiplier: "multiplicador crítico",
    },
    prestigePanel: {
      title: "Área de Prestígio",
      balance: "Saldo",
      maxed: "Max",
      totalPurchasedLevels: "Níveis comprados: {total}",
      complete: "Completo",
      noBonus: "Ainda sem bônus",
      clickPower: "poder de clique",
      production: "produção",
      critChance: "chance crítica",
      critDamage: "dano crítico",
      pickupChance: "chance de coleta",
      pickupValue: "valor da coleta",
      pickupSpawnRate: "taxa de aparição",
      timeWarpChance: "chance de Time Warp",
      timeWarpOutput: "produção comprimida de Time Warp",
      timeWarpCooldown: "recarga de Time Warp",
      prestigeGain: "ganho de prestígio",
      offlineEarnings: "ganhos offline",
      maxOfflineTime: "tempo máximo offline",
      cryptoProduction: "produção de cripto",
      dataConversion: "conversão de dados",
      startingData: "da produção da última run no início",
      upgradeCost: "custo de upgrade",
      checkpointSpeed: "velocidade dos marcos",
    },
    useGame: {
      preview: {
        alreadyUnlocked: "[Já DESBLOQUEADO]",
        unlock: "[DESBLOQUEAR {category}]",
        production: "[+{value} {resource}/s]",
        click: "[+{value} clique]",
        clickMultiplier: "[+{value}% multiplicador]",
        critChance: "[+{value}% crítico]",
        critMultiplier: "[+{value}x crítico]",
      },
      lastUpgrade: {
        purchased: "Upgrade comprado x{count}",
        timeWarpDebug: "Anomalia de buraco negro criada (limite de {minutes}m).",
        ascended: "+{gain} pontos de prestígio",
      },
    },
  },
  es: {
    common: {
      on: "ENCENDIDO",
      off: "APAGADO",
      close: "Cerrar",
      cancel: "Cancelar",
      convert: "Convertir",
      loading: "Cargando...",
      data: "Datos",
      nodes: "Nodos",
      crypto: "Cripto",
      stats: "Estadísticas",
      settings: "Configuración",
      current: "Actual",
      next: "Siguiente",
      ready: "Listo",
      locked: "Bloqueado",
      visible: "Visible",
      active: "Activo",
      affordable: "Asequible",
      completed: "Completado",
      levelShort: "Nv",
      none: "Ninguno",
      equipped: "Equipado",
      tutorial: "Tutorial",
      language: "Idioma",
      english: "English",
      turkish: "Turkce",
      portugueseBrazil: "Português (Brasil)",
      spanish: "Español",
      russian: "Ruso",
      simplifiedChinese: "Chino Simplificado",
    },
    settings: {
      title: "CONFIGURACIÓN",
      audioSettings: "Configuración de Audio",
      masterVolume: "Volumen General",
      backgroundMusic: "Música de Fondo",
      musicVolume: "Volumen de la Música",
      sfxVolume: "Volumen de Efectos",
      nextTrack: "SIGUIENTE PISTA",
      tutorialStatusSkipped: "Tutorial omitido",
      tutorialStatusComplete: "Tutorial completado",
      skipTutorial: "OMITIR TUTORIAL",
      restartTutorial: "REINICIAR TUTORIAL",
      restartTutorialConfirm: "¿Quieres reiniciar el tutorial desde el principio?",
      displaySettings: "Configuración de Pantalla",
      performanceMode: "Modo de Rendimiento",
      disableSceneGlow: "Reducir Brillos de Escena",
      disableSceneGlowHint: "Apaga brillos pesados de la escena para mejorar los FPS",
      fullscreen: "PANTALLA COMPLETA",
      windowed: "VENTANA",
      languageSettings: "Idioma",
      autoSave: "Guarda automáticamente cada 5 segundos",
      saveAndExit: "GUARDAR Y SALIR",
    },
    tutorialPanel: {
      aiHandler: "Operadora IA",
      welcome: "Bienvenido, Operador. Soy ARIA, tu operadora de IA. ¿Listo para comenzar el entrenamiento?",
      beginTraining: "Iniciar Entrenamiento",
      skip: "Omitir",
      defaultTitle: "Tutorial",
      objectivesCount: "{completed}/{total} objetivos",
      expand: "Expandir panel del tutorial",
      collapse: "Contraer panel del tutorial",
    },
    resourcePanel: {
      ascend: "Ascender",
      required: "Necesario",
      currentAscension: "Ascensión Actual",
      resources: "RECURSOS",
      systemOnline: "Estado del Sistema: En línea",
      convertLabel: "Convertir",
      convertAll: "TODO",
      customAmount: "Cantidad personalizada",
      maxAsc: "Asc. Max.",
      openBoard: "Abrir Ranking",
      youRank: "Tu: #{rank}",
      cosmeticsMarket: "MERCADO COSMÉTICO",
      relicForge: "TIENDA DE RELIQUIAS",
      blackMarket: "MERCADO NEGRO",
      paragonLab: "LABORATORIO PARAGON",
      unlockAtAscension: "Se desbloquea en Ascensión {requirement} ({current}/{requirement})",
      terminalLog: "Registro del Terminal",
      systemInitialized: "Sistema inicializado...",
      connectionEstablished: "Conexión establecida...",
      waitingForInput: "Esperando entrada del usuario...",
      confirmAscension: "Confirmar Ascensión",
      confirmAscensionBody: "¿Estás listo para reiniciar tu progreso y reclamar tus recompensas?",
      currentCrypto: "Cripto Actual",
      requiredCrypto: "Cripto Necesario",
      missing: "Faltante",
      prestigeReward: "Recompensa de Prestigio",
      warningReset: "Advertencia: Esto se reiniciará:",
      resetDataNodesCrypto: "Todos los Datos, Nodos y Cripto",
      resetUpgrades: "Todas las Mejoras (Producción, Clic, Minería)",
      resetTimer: "Temporizador de la partida actual",
      keptPrestige: "Se conserva: Puntos de Prestigio y Mejoras de Prestigio",
      moreCryptoTip: "Consejo: más cripto = mucho más prestigio.",
      faceFirewall: "Enfrentar Firewall",
      customConversion: "Conversión Personalizada",
      customConversionBody: "Introduce la cantidad de nodos a convertir (100 datos -> 1 nodo)",
      nodesToReceive: "Nodos a recibir",
      enterAmount: "Introduce una cantidad",
      willCost: "Costará: {amount} datos",
      availableData: "Datos disponibles:",
      invalidAmount: "Introduce un número válido",
      needData: "Necesitas {needed} datos (tienes {current})",
    },
    upgradePanel: {
      market: "MERCADO",
      upgradeSystems: "Sistemas de Mejora",
      critChance: "Prob. Crítica",
      totalLevels: "Niveles Totales",
      factory: "Producción",
      click: "Clic",
      mining: "Minería",
      jobs: "Contratos",
      online: "ACTIVO",
      current: "Actual",
      afterBuy: "Tras Compra",
      total: "Total",
      checkpoint: "Checkpoint",
      nextMultiplier: "Siguiente: multiplicador 2x en nv {level}",
      unlocked: "Desbloqueado",
      unlockCategory: "Desbloquear {category}",
      noBonus: "Aún no hay bonificación",
      needResources: "Necesita {resources}",
      clickValue: "valor de clic",
      clickMultiplier: "multiplicador de clic",
      critChanceValue: "prob. crítica",
      critMultiplier: "multiplicador crítico",
    },
    prestigePanel: {
      title: "Reino del Prestigio",
      balance: "Saldo",
      maxed: "Max",
      totalPurchasedLevels: "Niveles comprados: {total}",
      complete: "Completo",
      noBonus: "Aún no hay bonificación",
      clickPower: "poder de clic",
      production: "producción",
      critChance: "prob. crítica",
      critDamage: "daño crítico",
      pickupChance: "prob. de pickup",
      pickupValue: "valor del pickup",
      pickupSpawnRate: "aparición de pickups",
      timeWarpChance: "prob. de Time Warp",
      timeWarpOutput: "salida comprimida en Time Warp",
      timeWarpCooldown: "recarga de Time Warp",
      prestigeGain: "ganancia de prestigio",
      offlineEarnings: "ganancias offline",
      maxOfflineTime: "tiempo offline máximo",
      cryptoProduction: "producción de cripto",
      dataConversion: "conversión de datos",
      startingData: "de la producción de la última partida al inicio",
      upgradeCost: "coste de mejora",
      checkpointSpeed: "velocidad del checkpoint",
    },
    useGame: {
      preview: {
        alreadyUnlocked: "[YA DESBLOQUEADO]",
        unlock: "[DESBLOQUEAR {category}]",
        production: "[+{value} {resource}/s]",
        click: "[+{value} clic]",
        clickMultiplier: "[+{value}% multiplicador]",
        critChance: "[+{value}% crítico]",
        critMultiplier: "[+{value}x crítico]",
      },
      lastUpgrade: {
        purchased: "Mejora comprada x{count}",
        timeWarpDebug: "Anomalía de agujero negro generada (límite de {minutes}m).",
        ascended: "+{gain} puntos de prestigio",
      },
    },
  },
  ru: {
    common: {
      english: "Английский",
      turkish: "Турецкий",
      portugueseBrazil: "Португальский (Бразилия)",
      spanish: "Испанский",
      russian: "Русский",
      simplifiedChinese: "Упрощенный китайский",
    },
  },
  "zh-CN": {
    common: {
      english: "英语",
      turkish: "土耳其语",
      portugueseBrazil: "葡萄牙语（巴西）",
      spanish: "西班牙语",
      russian: "俄语",
      simplifiedChinese: "简体中文",
    },
  },};

const I18nContext = createContext<I18nContextValue | null>(null);

const getNestedTranslation = (tree: TranslationTree, key: string): TranslationLeaf | undefined => {
  const segments = key.split(".");
  let current: TranslationLeaf | TranslationTree | undefined = tree;

  for (const segment of segments) {
    if (!current || typeof current === "string") return undefined;
    current = current[segment];
  }

  return typeof current === "string" ? current : undefined;
};

const interpolate = (template: string, params?: TranslateParams): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
};

const isSupportedLanguage = (value: string | null): value is Language =>
  value === "en" || value === "tr" || value === "pt-BR" || value === "es" || value === "ru" || value === "zh-CN";

const isLanguagePreferenceSource = (value: string | null): value is LanguagePreferenceSource =>
  value === "user" || value === "auto";

const mapLocaleToLanguage = (locale: string | undefined): Language | null => {
  if (!locale) return null;

  const normalized = locale.toLowerCase();
  if (normalized === "pt-br") return "pt-BR";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "tr" || normalized.startsWith("tr-")) return "tr";
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  if (normalized === "ru" || normalized.startsWith("ru-")) return "ru";
  if (
    normalized === "zh"
    || normalized === "zh-cn"
    || normalized === "zh-sg"
    || normalized === "zh-hans"
    || normalized.startsWith("zh-cn-")
    || normalized.startsWith("zh-sg-")
    || normalized.startsWith("zh-hans")
  ) {
    return "zh-CN";
  }

  // We intentionally map all Portuguese regional variants to pt-BR for now.
  if (normalized === "pt" || normalized.startsWith("pt-")) return "pt-BR";

  return null;
};

const mapSteamLanguageToLanguage = (steamLanguage: string | undefined | null): Language | null => {
  if (!steamLanguage) return null;

  const normalized = steamLanguage.trim().toLowerCase();
  if (normalized === "english") return "en";
  if (normalized === "turkish") return "tr";
  if (normalized === "spanish") return "es";
  if (normalized === "russian") return "ru";
  if (normalized === "brazilian") return "pt-BR";
  if (normalized === "schinese") return "zh-CN";

  return null;
};

const getStoredLanguagePreference = (): { language: Language | null; source: LanguagePreferenceSource | null } => {
  if (typeof window === "undefined") return { language: null, source: null };

  const language = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const source = window.localStorage.getItem(LANGUAGE_SOURCE_STORAGE_KEY);

  return {
    language: isSupportedLanguage(language) ? language : null,
    source: isLanguagePreferenceSource(source) ? source : null,
  };
};

const getBrowserPreferredLanguage = (): Language => {
  if (typeof window === "undefined") return "en";

  const browserLocales = [
    ...(window.navigator.languages ?? []),
    window.navigator.language,
  ];

  for (const locale of browserLocales) {
    const mappedLanguage = mapLocaleToLanguage(locale);
    if (mappedLanguage) return mappedLanguage;
  }

  return "en";
};

const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") return "en";

  const storedPreference = getStoredLanguagePreference();
  if (storedPreference.language && (storedPreference.source === "user" || storedPreference.source === null)) {
    return storedPreference.language;
  }

  const steamLanguage = mapSteamLanguageToLanguage(window.df?.getSteamLanguageSync?.());
  if (steamLanguage) return steamLanguage;

  return getBrowserPreferredLanguage();
};

export const translate = (language: Language, key: string, params?: TranslateParams): string => {
  const localizedValue = getNestedTranslation(translations[language], key);
  const englishValue = getNestedTranslation(translations.en, key);
  const value = localizedValue
    ?? (language === "ru" && englishValue ? getRussianTextFallback(englishValue) : undefined)
    ?? (language === "zh-CN" && englishValue ? getSimplifiedChineseTextFallback(englishValue) : undefined)
    ?? englishValue
    ?? key;

  return interpolate(value, params);
};

export const localizeText = (value: LocalizedText | string, language: Language): string => {
  if (typeof value === "string") return value;
  if (language === "ru") return value.ru ?? getRussianTextFallback(value.en) ?? value.en;
  if (language === "zh-CN") return value["zh-CN"] ?? getSimplifiedChineseTextFallback(value.en) ?? value.en;
  return value[language] ?? value.en;
};

export const localizeInlineText = (
  language: Language,
  en: string,
  tr: string,
  ptBR: string,
  es?: string,
  ru?: string,
): string => {
  if (language === "tr") return tr;
  if (language === "pt-BR") return ptBR;
  if (language === "es") return es ?? en;
  if (language === "ru") return ru ?? getRussianTextFallback(en) ?? en;
  if (language === "zh-CN") return getSimplifiedChineseTextFallback(en) ?? en;
  return en;
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());
  const [languageSource, setLanguageSource] = useState<LanguagePreferenceSource>(() => {
    const storedPreference = getStoredLanguagePreference();
    if (storedPreference.language && (storedPreference.source === "user" || storedPreference.source === null)) {
      return "user";
    }

    return "auto";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    window.localStorage.setItem(LANGUAGE_SOURCE_STORAGE_KEY, languageSource);
    document.documentElement.lang = language;
  }, [language, languageSource]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedPreference = getStoredLanguagePreference();
    if (storedPreference.language && (storedPreference.source === "user" || storedPreference.source === null)) {
      return;
    }

    let cancelled = false;

    const hydrateSteamLanguage = async () => {
      try {
        const steamLanguage = await window.df?.getSteamLanguage?.();
        const mappedLanguage = mapSteamLanguageToLanguage(steamLanguage);
        if (!mappedLanguage || cancelled) return;

        setLanguageState(mappedLanguage);
        setLanguageSource("auto");
      } catch {
        // Steam language is optional; browser locale remains the fallback.
      }
    };

    void hydrateSteamLanguage();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    setLanguageSource("user");
  }, []);

  const t = useCallback(
    (key: string, params?: TranslateParams) => translate(language, key, params),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};

