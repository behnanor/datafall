import { localizeText, type Language, type LocalizedText } from "./i18n";
import { getRussianTextFallback } from "./ruText";
import { getSimplifiedChineseTextFallback } from "./zhCnText";
import { V104_ES, V104_PT_BR } from "./v104Text";

type EntityText = {
  name?: LocalizedText;
  description?: LocalizedText;
  title?: LocalizedText;
};

type BoostValues = {
  productionBoost?: number;
  clickBoost?: number;
  critBoost?: number;
  cryptoBoost?: number;
  critDamageBoost?: number;
  luckBoost?: number;
};

const GAME_ENTITY_TEXTS: Record<string, EntityText> = {};

const RARITY_LABELS: Record<string, LocalizedText> = {
  common: { en: "common", tr: "sıradan", "pt-BR": "comum", es: "comun", "zh-CN": "普通" },
  uncommon: { en: "uncommon", tr: "az bulunan", "pt-BR": "incomum", es: "inusual", "zh-CN": "非凡" },
  rare: { en: "rare", tr: "nadir", "pt-BR": "raro", es: "raro", "zh-CN": "稀有" },
  epic: { en: "epic", tr: "epik", "pt-BR": "épico", es: "epico", "zh-CN": "史诗" },
  legendary: { en: "legendary", tr: "efsanevi", "pt-BR": "lendário", es: "legendario", "zh-CN": "传奇" },
};

const LOOT_TYPE_LABELS: Record<string, LocalizedText> = {
  skin: { en: "Character Skin", tr: "Karakter Kaplaması", "pt-BR": "Skin de Personagem", es: "Skin de Personaje", "zh-CN": "角色皮肤" },
  theme: { en: "Room Theme", tr: "Oda Teması", "pt-BR": "Tema da Sala", es: "Tema de Sala", "zh-CN": "房间主题" },
  accessory: { en: "Accessory", tr: "Aksesuar", "pt-BR": "Acessório", es: "Accesorio", "zh-CN": "配件" },
  headstyle: { en: "Head Style", tr: "Baş Stili", "pt-BR": "Estilo de Cabeça", es: "Estilo de Cabeza", "zh-CN": "头部样式" },
  pet: { en: "Pet", tr: "Evcil", "pt-BR": "Pet", es: "Mascota", "zh-CN": "宠物" },
  clickeffect: { en: "Click Effect", tr: "Tıklama Efekti", "pt-BR": "Efeito de Clique", es: "Efecto de Clic", "zh-CN": "点击特效" },
  boxskin: { en: "Loot Box Skin", tr: "Ganimet Kutusu Kaplaması", "pt-BR": "Skin de Caixa", es: "Skin de Caja", "zh-CN": "战利品箱皮肤" },
  machineboxskin: { en: "Miner Skin", tr: "Madenci Kaplaması", "pt-BR": "Skin de Minerador", es: "Skin de Minero", "zh-CN": "矿机皮肤" },
};

const TUTORIAL_REWARD_TYPE_LABELS: Record<string, LocalizedText> = {
  skin: { en: "Skin", tr: "Kaplama", "pt-BR": "Skin", es: "Skin", "zh-CN": "皮肤" },
  theme: { en: "Theme", tr: "Tema", "pt-BR": "Tema", es: "Tema", "zh-CN": "主题" },
  accessory: { en: "Accessory", tr: "Aksesuar", "pt-BR": "Acessório", es: "Accesorio", "zh-CN": "配件" },
  headstyle: { en: "Head Style", tr: "Baş Stili", "pt-BR": "Estilo de Cabeça", es: "Estilo de Cabeza", "zh-CN": "头部样式" },
  pet: { en: "Pet", tr: "Evcil", "pt-BR": "Pet", es: "Mascota", "zh-CN": "宠物" },
};

const RELIC_SLOT_LABELS: Record<string, LocalizedText> = {
  skin: { en: "Body Relic", tr: "Gövde Yadigârı", "pt-BR": "Relíquia de Corpo", es: "Reliquia de Cuerpo", "zh-CN": "躯体遗物" },
  headstyle: { en: "Head Relic", tr: "Baş Yadigârı", "pt-BR": "Relíquia de Cabeça", es: "Reliquia de Cabeza", "zh-CN": "头部遗物" },
  accessory: { en: "Accessory Relic", tr: "Aksesuar Yadigârı", "pt-BR": "Relíquia de Acessório", es: "Reliquia de Accesorio", "zh-CN": "配件遗物" },
  wing: { en: "Wing Relic", tr: "Kanat Yadigârı", "pt-BR": "Relíquia de Asa", es: "Reliquia de Alas", "zh-CN": "翼部遗物" },
};

// Plain-language labels: production/click/crypto multiply your output, while crit
// ADDs percentage points to your crit chance. Players found the old one-word labels confusing.
const FULL_BOOST_LABELS: Record<keyof BoostValues, LocalizedText> = {
  productionBoost: { en: "more data production", tr: "daha fazla veri üretimi", "pt-BR": "mais produção de dados", es: "más producción de datos", ru: "больше производства данных", "zh-CN": "数据产量提升" },
  clickBoost: { en: "more data per click", tr: "tık başına daha fazla veri", "pt-BR": "mais dados por clique", es: "más datos por clic", ru: "больше данных за клик", "zh-CN": "每次点击数据提升" },
  critBoost: { en: "crit chance (added)", tr: "kritik şansı (eklenir)", "pt-BR": "chance de crítico (somada)", es: "prob. de crítico (sumada)", ru: "шанс крита (прибавляется)", "zh-CN": "暴击率（直接叠加）" },
  cryptoBoost: { en: "more crypto gain", tr: "daha fazla kripto kazancı", "pt-BR": "mais ganho de cripto", es: "más ganancia de cripto", ru: "больше крипты", "zh-CN": "加密币收益提升" },
  critDamageBoost: { en: "more crit damage", tr: "daha fazla kritik hasarı", "pt-BR": "mais dano crítico", es: "más daño crítico", ru: "больше урона крита", "zh-CN": "暴击伤害提升" },
  luckBoost: { en: "Loot Luck", tr: "Ganimet Şansı", "pt-BR": "Sorte de Loot", es: "Suerte de Loot", "zh-CN": "战利品幸运" },
};

const COMPACT_BOOST_LABELS: Record<keyof BoostValues, LocalizedText> = {
  productionBoost: { en: "Prod", tr: "Üret", "pt-BR": "Prod", es: "Prod", "zh-CN": "生产" },
  clickBoost: { en: "Click", tr: "Tık", "pt-BR": "Clique", es: "Clic", "zh-CN": "点击" },
  critBoost: { en: "Crit", tr: "Krit", "pt-BR": "Crit", es: "Crit", "zh-CN": "暴击" },
  cryptoBoost: { en: "Crypto", tr: "Kripto", "pt-BR": "Cripto", es: "Cripto", "zh-CN": "加密币" },
  critDamageBoost: { en: "Crit Dmg", tr: "Krit Hasar", "pt-BR": "Dano Crit", es: "Daño Crit", ru: "Урон крита", "zh-CN": "暴伤" },
  luckBoost: { en: "Luck", tr: "Şans", "pt-BR": "Sorte", es: "Suerte", "zh-CN": "幸运" },
};

const CURRENCY_LABELS: Record<string, LocalizedText> = {
  credits: { en: "Nodes", tr: "Dizin", "pt-BR": "Nodes", es: "Nodos", "zh-CN": "节点" },
  crypto: { en: "Crypto", tr: "Kripto", "pt-BR": "Cripto", es: "Cripto", "zh-CN": "加密币" },
  ascension: { en: "Crowns", tr: "Taç", "pt-BR": "Coroas", es: "Coronas", "zh-CN": "王冠" },
  data: { en: "Data", tr: "Veri", "pt-BR": "Dados", es: "Datos", "zh-CN": "数据" },
};

const PARAGON_EFFECT_LABELS: Record<string, LocalizedText> = {
  node_conversion_pct: { en: "Node conversion efficiency", tr: "Dizin dönüşüm verimi", "pt-BR": "Eficiência de conversão em Nodes", es: "Eficiencia de conversión a Nodos", "zh-CN": "节点转换效率" },
  pickup_spawn_pct: { en: "Floater spawn acceleration", tr: "Floater çıkış hızı", "pt-BR": "Aceleração de spawn dos floaters", es: "Aceleración de aparición de floaters", "zh-CN": "浮动奖励生成加速" },
  time_warp_power_pct: { en: "Time Warp payout", tr: "Time Warp ödülu", "pt-BR": "Recompensa de Time Warp", es: "Recompensa de Time Warp", "zh-CN": "时间扭曲收益" },
  time_warp_cooldown_pct: { en: "Time Warp cooldown reduction", tr: "Time Warp bekleme azalması", "pt-BR": "Redução de recarga do Time Warp", es: "Reducción de recarga de Time Warp", "zh-CN": "时间扭曲冷却缩减" },
  crit_chance_pct: { en: "Critical chance", tr: "Kritik Şansı", "pt-BR": "Chance crítica", es: "Prob. crítica", "zh-CN": "暴击率" },
  production_boost_pct: { en: "Production multiplier", tr: "Üretim çarpanı", "pt-BR": "Multiplicador de produção", es: "Multiplicador de producción", "zh-CN": "生产倍率" },
  crypto_boost_pct: { en: "Crypto multiplier", tr: "Kripto çarpanı", "pt-BR": "Multiplicador de cripto", es: "Multiplicador de cripto", "zh-CN": "加密币倍率" },
  click_boost_pct: { en: "Click multiplier", tr: "Tıklama çarpanı", "pt-BR": "Multiplicador de clique", es: "Multiplicador de clic", "zh-CN": "点击倍率" },
  boss_damage_pct: { en: "Boss damage", tr: "Boss hasarı", "pt-BR": "Dano em chefes", es: "Daño a jefes", ru: "Урон по боссам", "zh-CN": "首领伤害" },
  boss_time_seconds: { en: "Boss timer", tr: "Boss süresi", "pt-BR": "Tempo contra chefes", es: "Tiempo contra jefes", ru: "Время на босса", "zh-CN": "首领战时间" },
};

const CONTRACT_TITLE_TEXTS: Record<string, LocalizedText> = {
  sell_data: { en: "Data Liquidation", tr: "Veri Tasfiyesi", es: "Liquidación de Datos", "zh-CN": "数据变现" },
  collect_pickups: { en: "Pickup Collector", tr: "Ödül Toplayıcı", es: "Recolector de Pickups", "zh-CN": "奖励收集者" },
  spend_credits: { en: "Investment Run", tr: "Yatırım Koşusu", es: "Carrera de Inversión", "zh-CN": "投资冲刺" },
  reach_production: { en: "Production Milestone", tr: "Üretim Eşiği", es: "Hito de Producción", "zh-CN": "生产里程碑" },
  rapid_clicks: { en: "Speed Challenge", tr: "Hız Meydanı", es: "Desafio de Velocidad", "zh-CN": "速度挑战" },
  crit_streak: { en: "Critical Focus", tr: "Kritik Odak", es: "Enfoque Crítico", "zh-CN": "暴击专注" },
  upgrade_single: { en: "Specialization", tr: "Uzmanlaşma", es: "Especialización", "zh-CN": "专精路线" },
  maintain_resources: { en: "Resource Reserve", tr: "Kaynak Rezervi", es: "Reserva de Recursos", "zh-CN": "资源储备" },
};

const CONTRACT_TITLE_TEXTS_PT: Record<string, string> = {
  sell_data: "Liquidação de Dados",
  collect_pickups: "Coletor de Pickups",
  spend_credits: "Corrida de Investimento",
  reach_production: "Marco de Produção",
  rapid_clicks: "Desafio de Velocidade",
  crit_streak: "Foco Crítico",
  upgrade_single: "Especialização",
  maintain_resources: "Reserva de Recursos",
};

const PT_BR_TEXT_FALLBACKS: Record<string, string> = {
  "Data Broker": "Corretor de Dados",
  "Crypto Dealer": "Comerciante de Cripto",
  "Tech Runner": "Corredor Tecnológico",
  "Corp Fixer": "Fixer Corporativo",
  "Net Ghost": "Fantasma da Rede",
  "Neon Night": "Noite Neon",
  "Cyber Agent": "Agente Cibernético",
  "Neon Violet": "Violeta Neon",
  "Cyan Pulse": "Pulso Ciano",
  "Ember Core": "Núcleo de Brasa",
  "Toxic Green": "Verde Tóxico",
  "Blood Chrome": "Cromo Sangrento",
  "Gold Elite": "Elite Dourada",
  "Plasma Pink": "Rosa de Plasma",
  "Void Walker": "Caminhante do Vazio",
  "Quantum Ghost": "Fantasma Quântico",
  "Singularity": "Singularidade",
  "Arctic Lab": "Laboratório Ártico",
  "Crimson Bunker": "Bunker Carmesim",
  "Toxic Wasteland": "Ermo Tóxico",
  "Golden Palace": "Palácio Dourado",
  "Synthwave Sunset": "Pôr do Sol Synthwave",
  "Deep Void": "Vazio Profundo",
  "Quantum Realm": "Reino Quântico",
  "Cowboy Hat": "Chapéu Cowboy",
  "Bowler Hat": "Chapéu-Coco",
  "Beanie": "Gorro",
  "Cyber Shades": "Óculos Ciber",
  "Propeller Hat": "Chapéu com Hélice",
  "Top Hat": "Cartola",
  "VR Visor": "Visor VR",
  "DJ Headphones": "Fones de DJ",
  "Gaming Headset": "Headset Gamer",
  "Royal Crown": "Coroa Real",
  "Digital Halo": "Halo Digital",
  "Cyber Monocle": "Monóculo Cibernético",
  "Neural Link": "Link Neural",
  "Demon Horns": "Chifres Demoníacos",
  "Signal Antenna": "Antena de Sinal",
  "Cosmic Pup": "Filhote Cósmico",
  "Poly Cat": "Gato Poligonal",
  "Neon Fox": "Raposa Neon",
  "Holo Sparrow": "Pardal Holo",
  "Mecha Bunny": "Coelho Mecha",
  "Data Serpent": "Serpente de Dados",
  "Pixel Drake": "Draco Pixel",
  "Void Kitten": "Gatinho do Vazio",
  "Quantum Hamster": "Hamster Quântico",
  "Android Unit": "Unidade Android",
  "Skull Face": "Rosto Caveira",
  "Broadcast Head": "Cabeça de Transmissão",
  "Combat Helmet": "Capacete de Combate",
  "Xenomorph": "Xenomorfo",
  "Voxel Core": "Núcleo Voxel",
  "Holo Sphere": "Esfera Holo",
  "Glitch Entity": "Entidade Glitch",
  "Pyramid Mind": "Mente Piramidal",
  "Spark Wisp": "Faísca Etérea",
  "Data Ember": "Brasa de Dados",
  "Cyber Phantom": "Fantasma Cibernético",
  "Nexus Core": "Núcleo Nexus",
  "Oracle Spirit": "Espírito Oráculo",
  "Infinity Entity": "Entidade Infinita",
  "Aurora Shift": "Mudança Aurora",
  "Nebula Core": "Núcleo de Nebulosa",
  "Solar Flare": "Explosão Solar",
  "Eclipse Shadow": "Sombra do Eclipse",
  "Prismatic Entity": "Entidade Prismática",
  "Transcendent Being": "Ser Transcendente",
  "Crystal Mind": "Mente de Cristal",
  "Flame Wraith": "Espectro de Chamas",
  "Storm Cloud": "Nuvem de Tempestade",
  "Celestial Halo": "Halo Celestial",
  "Galaxy Brain": "Cérebro Galáctico",
  "Omega Form": "Forma Ômega",
  "Data Wings": "Asas de Dados",
  "Third Eye": "Terceiro Olho",
  "Energy Crown": "Coroa de Energia",
  "Void Helm": "Elmo do Vazio",
  "Cosmic Visor": "Visor Cósmico",
  "Divine Aura": "Aura Divina",
  "Ice Giant Orbit": "Órbita do Gigante de Gelo",
  "Event Horizon": "Horizonte de Eventos",
  "Lava World Close-Up": "Mundo de Lava de Perto",
  "Gas Giant Storm": "Tempestade do Gigante Gasoso",
  "Binary Star System": "Sistema Estelar Binário",
  "Cosmic Nebula Heart": "Coração da Nebulosa Cósmica",
  "Star of Death": "Estrela da Morte",
  "Grid Miner": "Minerador de Grade",
  "Neon Crate": "Caixote Neon",
};

const ES_TEXT_FALLBACKS: Record<string, string> = {
  "Data Broker": "Corredor de Datos",
  "Crypto Dealer": "Comerciante de Cripto",
  "Tech Runner": "Corredor Tecnológico",
  "Corp Fixer": "Fixer Corporativo",
  "Net Ghost": "Fantasma de la Red",
  "Neon Night": "Noche Neón",
  "Cyber Agent": "Agente Cibernético",
  "Neon Violet": "Violeta Neón",
  "Cyan Pulse": "Pulso Cian",
  "Ember Core": "Núcleo de Ascuas",
  "Toxic Green": "Verde Tóxico",
  "Blood Chrome": "Cromo Sangriento",
  "Gold Elite": "Élite Dorada",
  "Plasma Pink": "Rosa de Plasma",
  "Void Walker": "Caminante del Vacío",
  "Quantum Ghost": "Fantasma Cuántico",
  "Singularity": "Singularidad",
  "Arctic Lab": "Laboratorio Ártico",
  "Crimson Bunker": "Búnker Carmesí",
  "Toxic Wasteland": "Yermo Tóxico",
  "Golden Palace": "Palacio Dorado",
  "Synthwave Sunset": "Atardecer Synthwave",
  "Deep Void": "Vacío Profundo",
  "Quantum Realm": "Reino Cuántico",
  "Cowboy Hat": "Sombrero Vaquero",
  "Bowler Hat": "Bombín",
  "Beanie": "Gorro",
  "Cyber Shades": "Gafas Ciber",
  "Propeller Hat": "Gorro con Hélice",
  "Top Hat": "Chistera",
  "VR Visor": "Visor VR",
  "DJ Headphones": "Auriculares DJ",
  "Gaming Headset": "Auriculares Gamer",
  "Royal Crown": "Corona Real",
  "Digital Halo": "Halo Digital",
  "Cyber Monocle": "Monóculo Cibernético",
  "Neural Link": "Enlace Neural",
  "Demon Horns": "Cuernos Demoníacos",
  "Signal Antenna": "Antena de Señal",
  "Cosmic Pup": "Cachorro Cósmico",
  "Poly Cat": "Gato Poligonal",
  "Neon Fox": "Zorro Neón",
  "Holo Sparrow": "Gorrión Holo",
  "Mecha Bunny": "Conejo Mecha",
  "Data Serpent": "Serpiente de Datos",
  "Pixel Drake": "Draco Píxel",
  "Void Kitten": "Gatito del Vacío",
  "Quantum Hamster": "Hámster Cuántico",
  "Android Unit": "Unidad Android",
  "Skull Face": "Rostro Calavera",
  "Broadcast Head": "Cabeza de Transmisión",
  "Combat Helmet": "Casco de Combate",
  "Xenomorph": "Xenomorfo",
  "Voxel Core": "Núcleo Vóxel",
  "Holo Sphere": "Esfera Holo",
  "Glitch Entity": "Entidad Glitch",
  "Pyramid Mind": "Mente Piramidal",
  "Spark Wisp": "Chispa Etérea",
  "Data Ember": "Ascua de Datos",
  "Cyber Phantom": "Fantasma Cibernético",
  "Nexus Core": "Núcleo Nexus",
  "Oracle Spirit": "Espíritu Oráculo",
  "Infinity Entity": "Entidad Infinita",
  "Aurora Shift": "Cambio de Aurora",
  "Nebula Core": "Núcleo de Nebulosa",
  "Solar Flare": "Llamarada Solar",
  "Eclipse Shadow": "Sombra del Eclipse",
  "Prismatic Entity": "Entidad Prismática",
  "Transcendent Being": "Ser Trascendente",
  "Crystal Mind": "Mente de Cristal",
  "Flame Wraith": "Espectro de Llamas",
  "Storm Cloud": "Nube de Tormenta",
  "Celestial Halo": "Halo Celestial",
  "Galaxy Brain": "Cerebro Galáctico",
  "Omega Form": "Forma Omega",
  "Data Wings": "Alas de Datos",
  "Third Eye": "Tercer Ojo",
  "Energy Crown": "Corona de Energía",
  "Void Helm": "Yelmo del Vacío",
  "Cosmic Visor": "Visor Cósmico",
  "Divine Aura": "Aura Divina",
  "Ice Giant Orbit": "Órbita del Gigante de Hielo",
  "Event Horizon": "Horizonte de Sucesos",
  "Lava World Close-Up": "Primer Plano del Mundo de Lava",
  "Gas Giant Storm": "Tormenta del Gigante Gaseoso",
  "Binary Star System": "Sistema Estelar Binario",
  "Cosmic Nebula Heart": "Corazón de la Nebulosa Cósmica",
  "Star of Death": "Estrella de la Muerte",
  "Grid Miner": "Minero de Cuadrícula",
  "Neon Crate": "Caja Neón",
};

const CLICK_ACHIEVEMENT_TIERS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
const CRIT_ACHIEVEMENT_TIERS = [1, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
const DATA_ACHIEVEMENT_TIERS = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000, 500000000, 1000000000, 5000000000, 10000000000, 50000000000, 100000000000, 500000000000];
const CREDIT_ACHIEVEMENT_TIERS = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000, 500000000, 1000000000];
const CRYPTO_ACHIEVEMENT_TIERS = [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000];
const UPGRADE_ACHIEVEMENT_TIERS = [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 3000];
const CHECKPOINT_ACHIEVEMENT_TIERS = [1, 5, 10, 25, 50, 100, 200, 500, 1000];
const ASCEND_ACHIEVEMENT_TIERS = [1, 2, 5, 10, 15, 25, 50];
const PRESTIGE_SPENT_ACHIEVEMENT_TIERS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const PRESTIGE_UPGRADE_ACHIEVEMENT_TIERS = [1, 5, 10, 25, 50, 100, 200, 500];
const PICKUP_ACHIEVEMENT_TIERS = [10, 50, 100, 250, 500];
const CRIT_PICKUP_ACHIEVEMENT_TIERS = [1, 10, 25];
const DPS_ACHIEVEMENT_TIERS = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000];
const SPEED_ACHIEVEMENT_TIERS = [600, 480, 360, 300];
const PLAYTIME_ACHIEVEMENT_TIERS = [300, 1800, 3600, 7200, 18000, 36000, 86400];
const COSMETIC_ACHIEVEMENT_TIERS = [1, 5, 10, 25, 50];

const CLICK_ACHIEVEMENT_NAMES_TR = ["İlk Adımlar", "Isındı", "Başlıyor", "Tıklama Çırağı", "Tıklama Ustası", "Tıklama Makinesi", "Tıklama Masteri", "Tıklama Uzmanı", "Karpal Tünel", "Tıklama Gazisi", "Tıklama Efsanesi", "Tıklama Şampiyonu", "Tıklama Fatihi", "Tıklama İmparatoru", "Tıklama Tanrısı"];
const CRIT_ACHIEVEMENT_NAMES_TR = ["Şanslı Darbe", "Kritik Başlangıç", "Kritik Merakı", "Kritik Kütle", "Kritik Ustası", "Kritik Masteri", "Kritik Uzmanı", "Kritik Efsanesi", "Kritik Şampiyonu", "Kritik Hükümdarı", "Kritik İmparatoru", "Kritik Tanrısı"];
const DATA_ACHIEVEMENT_NAMES_TR = ["Veri Yeni Başlayan", "Veri Toplayıcı", "Veri İstifçisi", "Veri Biriktirici", "Veri Yığıcı", "Veri Patronu", "Veri Baronu", "Veri Taykunu", "Veri İmparatoru", "Veri Kralı", "Veri Efsanesi", "Veri Şampiyonu", "Veri Hükümdarı", "Veri Ustası", "Veri Tanrısı", "Veri Devi", "Veri Ölümsüzü", "Veri Sonsuzu", "Veri Aşkın", "Veri Sınırsızı"];
const CREDIT_ACHIEVEMENT_NAMES_TR = ["Bozukluk", "Biraz Birikim", "Girişimci", "İşletme Sahibi", "Varlıklı", "Zengin", "Taykun", "Milyoner", "Çok Milyoner", "Milyarder", "Dizin Baronu", "Dizin Kralı", "Dizin İmparatoru", "Dizin Efsanesi", "Dizin Tanrısı"];
const CRYPTO_ACHIEVEMENT_NAMES_TR = ["Kripto Merakı", "Kripto Başlangıcı", "Kripto Koleksiyoncusu", "Kripto Yatırımcısı", "Kripto Tücarı", "Kripto Ustası", "Kripto Masteri", "Kripto Balinası", "Kripto Patronu", "Kripto Baronu", "Kripto Kralı", "Kripto İmparatoru", "Kripto Efsanesi", "Kripto Tanrısı"];
const UPGRADE_ACHIEVEMENT_NAMES_TR = ["İlk Yatırım", "Başlangıç Aşaması", "Büyüyen İş", "Genişleme", "Endüstriyel", "Büyüyen İmparatorluk", "Büyük Oyuncu", "Sektör Lideri", "Şirket Devi", "Mega Şirket", "Küresel Güç", "Dünya Hâkimi", "Kıta Kralı", "Gezegen Hükümdarı", "Güneş İmparatoru", "Galaktik Hükümdar", "Evrensel Usta"];
const CHECKPOINT_ACHIEVEMENT_NAMES_TR = ["Eşik Aşıldı", "Eşik Avcısı", "Eşik Ustası", "Eşik Uzmanı", "Eşik Efsanesi", "Eşik Şampiyonu", "Eşik Hükümdarı", "Eşik Tanrısı", "Eşik Devi"];
const ASCEND_ACHIEVEMENT_NAMES_TR = ["Aşkınlık", "Yeniden Doğuş", "Döngü Başladı", "Ebedi Döngü", "Kendi Kendine Çalışan", "Yükseliş Ustası", "Yükseliş Masteri"];
const PRESTIGE_SPENT_ACHIEVEMENT_NAMES_TR = ["Prestij Harcayıcısı", "Prestij Yatırımcısı", "Prestij Koleksiyoncusu", "Prestij İstifçisi", "Prestij Ustası", "Prestij Uzmanı", "Prestij Efsanesi", "Prestij Şampiyonu", "Prestij Hükümdarı"];
const PRESTIGE_UPGRADE_ACHIEVEMENT_NAMES_TR = ["Ebedi Güç", "Büyüyen Miras", "Kalıcı İlerleme", "Ebedi Yatırımcı", "Miras Ustası", "Ebedi Uzman", "Miras Efsanesi", "Ebedi Şampiyon"];
const PICKUP_ACHIEVEMENT_NAMES_TR = ["Toplayıcı", "Koleksiyoncu", "Ödül Prosu", "Ödül Uzmanı", "Ödül Ustası"];
const CRIT_PICKUP_ACHIEVEMENT_NAMES_TR = ["Büyük İkramiye!", "İkramiye Avcısı", "İkramiye Ustası"];
const DPS_ACHIEVEMENT_NAMES_TR = ["Veri Akışı", "Veri Deresi", "Veri Irmağı", "Veri Seli", "Veri Çağlayanı", "Veri Tsunamisi", "Optimum Sistemler", "Yüksek Verim", "Maksimum Verim", "Sınırsız Bant", "Veri Otoyolu", "Veri Boyutu", "Veri Evreni", "Veri Çoklu Evreni", "Veri Omnievreni"];
const SPEED_ACHIEVEMENT_NAMES_TR = ["Hız Koşucusu", "Hızlı Yükselen", "Çabuk İz Süren", "Ani Yükselen"];
const PLAYTIME_ACHIEVEMENT_NAMES_TR = ["Kısa Bakış", "Bağlanmaya Başladı", "Adanmış", "Kararlı", "Bağımlı", "Hayatsız", "Maraton Koşucusu"];
const COSMETIC_ACHIEVEMENT_NAMES_TR = ["Koleksiyoncu", "Moda Başlangıcı", "Stil Meraklısı", "Kozmetik Ustası", "Moda İkonu"];
const PLAYTIME_DESCRIPTION_LABELS_TR = ["5 Dakika", "30 Dakika", "1 Saat", "2 Saat", "5 Saat", "10 Saat", "1 Gün"];
const CLICK_ACHIEVEMENT_NAMES_PT = ["Primeiros Passos", "Aquecendo", "Começando", "Aprendiz do Clique", "Adepto do Clique", "Máquina de Cliques", "Mestre do Clique", "Especialista em Clique", "Túnel do Carpo", "Veterano do Clique", "Lenda do Clique", "Campeão do Clique", "Conquistador do Clique", "Imperador do Clique", "Deus do Clique"];
const CRIT_ACHIEVEMENT_NAMES_PT = ["Golpe de Sorte", "Início Crítico", "Curioso do Crítico", "Massa Crítica", "Adepto do Crítico", "Mestre do Crítico", "Especialista do Crítico", "Lenda do Crítico", "Campeão do Crítico", "Senhor do Crítico", "Imperador do Crítico", "Deus do Crítico"];
const DATA_ACHIEVEMENT_NAMES_PT = ["Iniciante em Dados", "Colecionador de Dados", "Acumulador de Dados", "Armazenador de Dados", "Empilhador de Dados", "Magnata de Dados", "Barão de Dados", "Tufão de Dados", "Imperador de Dados", "Rei dos Dados", "Lenda dos Dados", "Campeão dos Dados", "Senhor dos Dados", "Mestre dos Dados", "Deus dos Dados", "Titã dos Dados", "Imortal dos Dados", "Eterno dos Dados", "Transcendente dos Dados", "Infinito dos Dados"];
const CREDIT_ACHIEVEMENT_NAMES_PT = ["Troco", "Algumas Economias", "Empreendedor", "Dono do Negócio", "Confortável", "Rico", "Magnata", "Milionário", "Multimilionário", "Bilionário", "Barão dos Nodes", "Rei dos Nodes", "Imperador dos Nodes", "Lenda dos Nodes", "Deus dos Nodes"];
const CRYPTO_ACHIEVEMENT_NAMES_PT = ["Curioso do Cripto", "Início Cripto", "Colecionador de Cripto", "Investidor Cripto", "Trader Cripto", "Especialista em Cripto", "Mestre do Cripto", "Baleia Cripto", "Magnata Cripto", "Barão Cripto", "Rei do Cripto", "Imperador do Cripto", "Lenda do Cripto", "Deus do Cripto"];
const UPGRADE_ACHIEVEMENT_NAMES_PT = ["Primeiro Investimento", "Começando", "Negócio em Crescimento", "Expansão", "Industrial", "Império em Crescimento", "Peixe Grande", "Líder do Setor", "Gigante Corporativo", "Mega Corporação", "Potência Global", "Dominador do Mundo", "Rei Continental", "Governante Planetário", "Imperador Solar", "Senhor Galáctico", "Mestre Universal"];
const CHECKPOINT_ACHIEVEMENT_NAMES_PT = ["Checkpoint Alcançado", "Caçador de Checkpoints", "Mestre do Checkpoint", "Especialista em Checkpoint", "Lenda do Checkpoint", "Campeão do Checkpoint", "Senhor do Checkpoint", "Deus do Checkpoint", "Titã do Checkpoint"];
const ASCEND_ACHIEVEMENT_NAMES_PT = ["Transcendência", "Renascido", "Ciclo Iniciado", "Ciclo Eterno", "Funcionando Sozinho", "Adepto da Ascensão", "Mestre da Ascensão"];
const PRESTIGE_SPENT_ACHIEVEMENT_NAMES_PT = ["Gastador de Prestígio", "Investidor de Prestígio", "Colecionador de Prestígio", "Acumulador de Prestígio", "Mestre do Prestígio", "Especialista do Prestígio", "Lenda do Prestígio", "Campeão do Prestígio", "Senhor do Prestígio"];
const PRESTIGE_UPGRADE_ACHIEVEMENT_NAMES_PT = ["Poder Eterno", "Legado Crescente", "Progresso Permanente", "Investidor Eterno", "Mestre do Legado", "Especialista Eterno", "Lenda do Legado", "Campeão Eterno"];
const PICKUP_ACHIEVEMENT_NAMES_PT = ["Coletor", "Colecionador", "Pro dos Pickups", "Especialista em Pickups", "Mestre dos Pickups"];
const CRIT_PICKUP_ACHIEVEMENT_NAMES_PT = ["Jackpot!", "Caçador de Jackpot", "Mestre do Jackpot"];
const DPS_ACHIEVEMENT_NAMES_PT = ["Fluxo de Dados", "Corrente de Dados", "Rio de Dados", "Enxurrada de Dados", "Cascata de Dados", "Tsunami de Dados", "Sistemas Otimizados", "Alto Rendimento", "Rendimento Máximo", "Largura de Banda Ilimitada", "Autoestrada de Dados", "Dimensão de Dados", "Universo de Dados", "Multiverso de Dados", "Omniverso de Dados"];
const SPEED_ACHIEVEMENT_NAMES_PT = ["Corredor Veloz", "Ascensão Rápida", "Rastreador Veloz", "Ascensão Relâmpago"];
const PLAYTIME_ACHIEVEMENT_NAMES_PT = ["Passada Rápida", "Já Está Curtindo", "Dedicado", "Comprometido", "Viciado", "Sem Vida", "Corredor de Maratona"];
const COSMETIC_ACHIEVEMENT_NAMES_PT = ["Colecionador", "Início Fashion", "Fã de Estilo", "Mestre dos Cosméticos", "Ícone da Moda"];
const PLAYTIME_DESCRIPTION_LABELS_PT = ["5 Minutos", "30 Minutos", "1 Hora", "2 Horas", "5 Horas", "10 Horas", "1 Dia"];
const CLICK_ACHIEVEMENT_NAMES_ES = ["Primeros Pasos", "En Calor", "Empezando", "Aprendiz del Clic", "Adepto del Clic", "Máquina de Clics", "Maestro del Clic", "Experto del Clic", "Túnel Carpiano", "Veterano del Clic", "Leyenda del Clic", "Campeón del Clic", "Conquistador del Clic", "Emperador del Clic", "Dios del Clic"];
const CRIT_ACHIEVEMENT_NAMES_ES = ["Golpe de Suerte", "Inicio Crítico", "Curioso del Crítico", "Masa Crítica", "Adepto del Crítico", "Maestro del Crítico", "Experto del Crítico", "Leyenda del Crítico", "Campeón del Crítico", "Señor del Crítico", "Emperador del Crítico", "Dios del Crítico"];
const DATA_ACHIEVEMENT_NAMES_ES = ["Principiante de Datos", "Coleccionista de Datos", "Acaparador de Datos", "Acumulador de Datos", "Apilador de Datos", "Magnate de Datos", "Barón de Datos", "Tifón de Datos", "Emperador de Datos", "Rey de Datos", "Leyenda de Datos", "Campeón de Datos", "Señor de Datos", "Maestro de Datos", "Dios de Datos", "Titán de Datos", "Inmortal de Datos", "Eterno de Datos", "Trascendente de Datos", "Infinito de Datos"];
const CREDIT_ACHIEVEMENT_NAMES_ES = ["Calderilla", "Algunos Ahorros", "Emprendedor", "Dueño del Negocio", "Acomodado", "Rico", "Magnate", "Millonario", "Multimillonario", "Billonario", "Barón de Nodos", "Rey de Nodos", "Emperador de Nodos", "Leyenda de Nodos", "Dios de Nodos"];
const CRYPTO_ACHIEVEMENT_NAMES_ES = ["Curioso del Cripto", "Inicio Cripto", "Coleccionista de Cripto", "Inversor Cripto", "Trader Cripto", "Experto en Cripto", "Maestro del Cripto", "Ballena Cripto", "Magnate Cripto", "Barón Cripto", "Rey del Cripto", "Emperador del Cripto", "Leyenda del Cripto", "Dios del Cripto"];
const UPGRADE_ACHIEVEMENT_NAMES_ES = ["Primera Inversión", "Empezando", "Negocio en Crecimiento", "Expansión", "Industrial", "Imperio en Crecimiento", "Gran Jugador", "Líder del Sector", "Gigante Corporativo", "Mega Corporación", "Poder Global", "Dominador del Mundo", "Rey Continental", "Gobernante Planetario", "Emperador Solar", "Señor Galáctico", "Maestro Universal"];
const CHECKPOINT_ACHIEVEMENT_NAMES_ES = ["Checkpoint Alcanzado", "Cazador de Checkpoints", "Maestro del Checkpoint", "Experto del Checkpoint", "Leyenda del Checkpoint", "Campeón del Checkpoint", "Señor del Checkpoint", "Dios del Checkpoint", "Titán del Checkpoint"];
const ASCEND_ACHIEVEMENT_NAMES_ES = ["Trascendencia", "Renacido", "Comenzo el Ciclo", "Ciclo Eterno", "Funciona Solo", "Adepto de la Ascensión", "Maestro de la Ascensión"];
const PRESTIGE_SPENT_ACHIEVEMENT_NAMES_ES = ["Gastador de Prestigio", "Inversor de Prestigio", "Coleccionista de Prestigio", "Acaparador de Prestigio", "Maestro del Prestigio", "Experto del Prestigio", "Leyenda del Prestigio", "Campeón del Prestigio", "Señor del Prestigio"];
const PRESTIGE_UPGRADE_ACHIEVEMENT_NAMES_ES = ["Poder Eterno", "Legado en Crecimiento", "Progreso Permanente", "Inversor Eterno", "Maestro del Legado", "Experto Eterno", "Leyenda del Legado", "Campeón Eterno"];
const PICKUP_ACHIEVEMENT_NAMES_ES = ["Recolector", "Coleccionista", "Pro del Pickup", "Experto del Pickup", "Maestro del Pickup"];
const CRIT_PICKUP_ACHIEVEMENT_NAMES_ES = ["Jackpot!", "Cazador de Jackpot", "Maestro del Jackpot"];
const DPS_ACHIEVEMENT_NAMES_ES = ["Flujo de Datos", "Corriente de Datos", "Río de Datos", "Rápidos de Datos", "Cascada de Datos", "Tsunami de Datos", "Sistemas Optimizados", "Alto Rendimiento", "Rendimiento Máximo", "Ancho de Banda Ilimitado", "Autopista de Datos", "Dimensión de Datos", "Universo de Datos", "Multiverso de Datos", "Omniverso de Datos"];
const SPEED_ACHIEVEMENT_NAMES_ES = ["Corredor Veloz", "Ascensor Rápido", "Rastreador Veloz", "Ascenso Relampago"];
const PLAYTIME_ACHIEVEMENT_NAMES_ES = ["Vista Rápida", "Enganchandose", "Dedicado", "Comprometido", "Adicto", "Sin Vida", "Corredor de Maraton"];
const COSMETIC_ACHIEVEMENT_NAMES_ES = ["Coleccionista", "Inicio Fashion", "Fan del Estilo", "Maestro de Cosméticos", "Icono de Moda"];
const PLAYTIME_DESCRIPTION_LABELS_ES = ["5 Minutos", "30 Minutos", "1 Hora", "2 Horas", "5 Horas", "10 Horas", "1 Día"];
const CLICK_ACHIEVEMENT_NAMES_RU = ["Первые шаги", "Разогрев", "Начало положено", "Ученик клика", "Адепт клика", "Машина клика", "Мастер клика", "Эксперт клика", "Карпальный туннель", "Ветеран клика", "Легенда клика", "Чемпион клика", "Покоритель клика", "Император клика", "Бог клика"];
const CRIT_ACHIEVEMENT_NAMES_RU = ["Удачный удар", "Критический старт", "Любитель крита", "Критическая масса", "Адепт крита", "Мастер крита", "Эксперт крита", "Легенда крита", "Чемпион крита", "Повелитель крита", "Император крита", "Бог крита"];
const DATA_ACHIEVEMENT_NAMES_RU = ["Новичок данных", "Сборщик данных", "Накопитель данных", "Аккумулятор данных", "Укладчик данных", "Магнат данных", "Барон данных", "Тайкун данных", "Император данных", "Король данных", "Легенда данных", "Чемпион данных", "Владыка данных", "Мастер данных", "Бог данных", "Титан данных", "Бессмертие данных", "Вечность данных", "Трансцендентность данных", "Бесконечность данных"];
const CREDIT_ACHIEVEMENT_NAMES_RU = ["Мелочь", "Немного накоплений", "Предприниматель", "Владелец бизнеса", "Состоятельный", "Богач", "Магнат", "Миллионер", "Мультимиллионер", "Миллиардер", "Барон узлов", "Король узлов", "Император узлов", "Легенда узлов", "Бог узлов"];
const CRYPTO_ACHIEVEMENT_NAMES_RU = ["Любитель крипты", "Крипто-старт", "Коллекционер крипты", "Инвестор крипты", "Трейдер крипты", "Эксперт крипты", "Мастер крипты", "Крипто-кит", "Крипто-магнат", "Крипто-барон", "Король крипты", "Император крипты", "Легенда крипты", "Бог крипты"];
const UPGRADE_ACHIEVEMENT_NAMES_RU = ["Первая инвестиция", "Начало пути", "Растущий бизнес", "Экспансия", "Индустриальный рывок", "Растущая империя", "Крупный игрок", "Лидер сектора", "Корпоративный гигант", "Мега-корпорация", "Глобальная сила", "Владыка мира", "Король континента", "Правитель планеты", "Солнечный император", "Галактический владыка", "Вселенский мастер"];
const CHECKPOINT_ACHIEVEMENT_NAMES_RU = ["Контрольная точка достигнута", "Охотник за контрольными точками", "Мастер контрольных точек", "Эксперт контрольных точек", "Легенда контрольных точек", "Чемпион контрольных точек", "Повелитель контрольных точек", "Бог контрольных точек", "Титан контрольных точек"];
const ASCEND_ACHIEVEMENT_NAMES_RU = ["Трансцендентность", "Возрождение", "Цикл начался", "Вечный цикл", "Автономный", "Адепт вознесения", "Мастер вознесения"];
const PRESTIGE_SPENT_ACHIEVEMENT_NAMES_RU = ["Тратящий престиж", "Инвестор престижа", "Коллекционер престижа", "Накопитель престижа", "Мастер престижа", "Эксперт престижа", "Легенда престижа", "Чемпион престижа", "Владыка престижа"];
const PRESTIGE_UPGRADE_ACHIEVEMENT_NAMES_RU = ["Вечная сила", "Растущее наследие", "Постоянный прогресс", "Вечный инвестор", "Мастер наследия", "Вечный эксперт", "Легенда наследия", "Вечный чемпион"];
const PICKUP_ACHIEVEMENT_NAMES_RU = ["Сборщик", "Коллекционер", "Профи бонусов", "Эксперт бонусов", "Мастер бонусов"];
const CRIT_PICKUP_ACHIEVEMENT_NAMES_RU = ["Джекпот!", "Охотник за джекпотом", "Мастер джекпота"];
const DPS_ACHIEVEMENT_NAMES_RU = ["Поток данных", "Ручей данных", "Река данных", "Стремнина данных", "Водопад данных", "Цунами данных", "Оптимальные системы", "Высокая эффективность", "Максимальная эффективность", "Безлимитная полоса", "Шоссе данных", "Измерение данных", "Вселенная данных", "Мультивселенная данных", "Омнивселенная данных"];
const SPEED_ACHIEVEMENT_NAMES_RU = ["Скоростной забег", "Быстрое вознесение", "Быстрый следопыт", "Молниеносное вознесение"];
const PLAYTIME_ACHIEVEMENT_NAMES_RU = ["Короткий визит", "Начинает затягивать", "Преданный", "Решительный", "Зависимый", "Без жизни", "Марафонец"];
const COSMETIC_ACHIEVEMENT_NAMES_RU = ["Коллекционер", "Модный старт", "Любитель стиля", "Мастер косметики", "Икона стиля"];
const PLAYTIME_DESCRIPTION_LABELS_RU = ["5 минут", "30 минут", "1 час", "2 часа", "5 часов", "10 часов", "1 день"];

const SECRET_ACHIEVEMENT_TEXTS: Record<string, EntityText> = {
  // v1.03 milestones (automation, challenges, finale, Endless)
  automation_first: {
    name: { en: "Autopilot", tr: "Otopilot", "pt-BR": "Piloto Automático", es: "Piloto Automático", ru: "Автопилот", "zh-CN": "自动驾驶" },
    description: { en: "Turn on automation for the first time", tr: "Otomasyonu ilk kez aç", "pt-BR": "Ative a automação pela primeira vez", es: "Activa la automatización por primera vez", ru: "Впервые включи автоматизацию", "zh-CN": "首次开启自动化" },
  },
  challenge_no_clicks: {
    name: { en: "Hands Off", tr: "Eller Uzakta", "pt-BR": "Mãos Livres", es: "Manos Fuera", ru: "Руки прочь", "zh-CN": "放手" },
    description: { en: "Complete the Hands Off challenge", tr: "Eller Uzakta meydan okumasını tamamla", "pt-BR": "Conclua o desafio Mãos Livres", es: "Completa el desafío Manos Fuera", ru: "Пройди испытание «Руки прочь»", "zh-CN": "完成“放手”挑战" },
  },
  challenge_half_crypto: {
    name: { en: "Drought Survivor", tr: "Kuraklıktan Sağ Çıkan", "pt-BR": "Sobrevivente da Seca", es: "Superviviente de la Sequía", ru: "Переживший засуху", "zh-CN": "旱季幸存者" },
    description: { en: "Complete the Crypto Drought challenge", tr: "Kripto Kuraklığı meydan okumasını tamamla", "pt-BR": "Conclua o desafio Seca de Cripto", es: "Completa el desafío Sequía de Cripto", ru: "Пройди испытание «Криптозасуха»", "zh-CN": "完成“加密干旱”挑战" },
  },
  challenge_sprint: {
    name: { en: "Overclock Sprinter", tr: "Hız Koşucusu", "pt-BR": "Velocista Overclock", es: "Velocista Overclock", ru: "Разгонный спринтер", "zh-CN": "超频冲刺者" },
    description: { en: "Complete the Overclock Sprint challenge", tr: "Hız Koşusu meydan okumasını tamamla", "pt-BR": "Conclua o desafio Sprint Overclock", es: "Completa el desafío Sprint Overclock", ru: "Пройди испытание «Разгонный спринт»", "zh-CN": "完成“超频冲刺”挑战" },
  },
  challenge_bare_metal: {
    name: { en: "Bare Metal", tr: "Çıplak Metal", "pt-BR": "Metal Puro", es: "Metal Desnudo", ru: "Голое железо", "zh-CN": "裸机" },
    description: { en: "Complete the Bare Metal challenge", tr: "Çıplak Metal meydan okumasını tamamla", "pt-BR": "Conclua o desafio Metal Puro", es: "Completa el desafío Metal Desnudo", ru: "Пройди испытание «Голое железо»", "zh-CN": "完成“裸机”挑战" },
  },
  challenge_all: {
    name: { en: "Challenger", tr: "Meydan Okuyan", "pt-BR": "Desafiante", es: "Retador", ru: "Претендент", "zh-CN": "挑战者" },
    description: { en: "Complete every challenge", tr: "Tüm meydan okumaları tamamla", "pt-BR": "Conclua todos os desafios", es: "Completa todos los desafíos", ru: "Пройди все испытания", "zh-CN": "完成所有挑战" },
  },
  finale_breach: {
    name: { en: "Core Breached", tr: "Çekirdek Delindi", "pt-BR": "Núcleo Violado", es: "Núcleo Vulnerado", ru: "Ядро взломано", "zh-CN": "核心已突破" },
    description: { en: "Break the Core and finish DataFall", tr: "Çekirdeği kır ve DataFall'u bitir", "pt-BR": "Destrua o Núcleo e termine DataFall", es: "Rompe el Núcleo y termina DataFall", ru: "Сломай Ядро и пройди DataFall", "zh-CN": "击破核心，通关 DataFall" },
  },
  endless_5: {
    name: { en: "Deep Dive", tr: "Derin Dalış", "pt-BR": "Mergulho Profundo", es: "Inmersión Profunda", ru: "Глубокое погружение", "zh-CN": "深潜" },
    description: { en: "Reach Endless depth 5", tr: "Sonsuz modda 5. derinliğe ulaş", "pt-BR": "Alcance a profundidade 5 no Infinito", es: "Alcanza la profundidad 5 en Infinito", ru: "Достигни глубины 5 в бесконечном режиме", "zh-CN": "在无尽模式中达到深度 5" },
  },
  endless_10: {
    name: { en: "Deeper Still", tr: "Daha da Derine", "pt-BR": "Ainda Mais Fundo", es: "Aún Más Hondo", ru: "Ещё глубже", "zh-CN": "更深一层" },
    description: { en: "Reach Endless depth 10", tr: "Sonsuz modda 10. derinliğe ulaş", "pt-BR": "Alcance a profundidade 10 no Infinito", es: "Alcanza la profundidad 10 en Infinito", ru: "Достигни глубины 10 в бесконечном режиме", "zh-CN": "在无尽模式中达到深度 10" },
  },
  endless_25: {
    name: { en: "Abyss Runner", tr: "Uçurum Koşucusu", "pt-BR": "Corredor do Abismo", es: "Corredor del Abismo", ru: "Бегущий по бездне", "zh-CN": "深渊行者" },
    description: { en: "Reach Endless depth 25", tr: "Sonsuz modda 25. derinliğe ulaş", "pt-BR": "Alcance a profundidade 25 no Infinito", es: "Alcanza la profundidad 25 en Infinito", ru: "Достигни глубины 25 в бесконечном режиме", "zh-CN": "在无尽模式中达到深度 25" },
  },
  secret_1000_clicks_no_upgrade: {
    name: { en: "Purist", tr: "Saf Oyuncu", es: "Purista" },
    description: { en: "Click 1000 times without buying upgrades", tr: "Yükseltme satın almadan 1000 kez tıkla", es: "Haz 1000 clics sin comprar mejoras" },
  },
  secret_max_crit: {
    name: { en: "Critical Overload", tr: "Kritik Aşırı Yük", es: "Sobrecarga Crítica" },
    description: { en: "Reach 50% crit chance", tr: "%50 kritik şansına ulaş", es: "Alcanza un 50% de prob. crítica" },
  },
  secret_millionaire: {
    name: { en: "Crypto Millionaire", tr: "Kripto Milyoneri", es: "Millonario Cripto" },
    description: { en: "Hold 1M+ nodes and 1000+ crypto at once", tr: "Aynı anda 1M+ dizin ve 1000+ kripto tut", es: "Mantén a la vez 1M+ nodos y 1000+ cripto" },
  },
  secret_all_upgrades: {
    name: { en: "Complete Collection", tr: "Tam Koleksiyon" },
    description: { en: "Own at least 1 of every upgrade type", tr: "Her yükseltme türünden en az 1 tanesine sahip ol" },
  },
  secret_prestige_hoarder: {
    name: { en: "Prestige Hoarder", tr: "Prestij İstifçisi" },
    description: { en: "Ascend with 1000+ crypto", tr: "1000+ kriptoyla yüksel" },
  },
  secret_speed_demon: {
    name: { en: "Speed Demon", tr: "Hız Şeytanı" },
    description: { en: "Click 100 times in 10 seconds", tr: "10 saniyede 100 kez tıkla" },
  },
  secret_patient: {
    name: { en: "Patient One", tr: "Sabırlı Olan" },
    description: { en: "Wait 5 minutes without clicking", tr: "Tıklamadan 5 dakika bekle" },
  },
  secret_lucky_streak: {
    name: { en: "Lucky Streak", tr: "Şans Serisi" },
    description: { en: "Land 10 crits in a row", tr: "Arka arkaya 10 kritik vur" },
  },
  secret_night_owl: {
    name: { en: "Night Owl", tr: "Gece Kuşu" },
    description: { en: "Play at midnight", tr: "Gece yarısı oyna" },
  },
  secret_perfectionist: {
    name: { en: "Perfectionist", tr: "Mükemmeliyetçi" },
    description: { en: "Unlock 100 achievements", tr: "100 başarım aç" },
  },
};

Object.assign(GAME_ENTITY_TEXTS, {
  "default::Neon Night": {
    name: { en: "Neon Night", tr: "Neon Gece" },
    description: { en: "Classic cyberpunk atmosphere", tr: "Klasik siberpunk atmosferi" },
  },
  "default::Cyber Agent": {
    name: { en: "Cyber Agent", tr: "Siber Ajan" },
    description: { en: "Standard issue operative head", tr: "Standart görev başlığı" },
  },
  "default::Neon Crate": {
    name: { en: "Neon Crate", tr: "Neon Sandık" },
    description: { en: "Standard ascension crate frame.", tr: "Standart yükseliş sandığı kasası." },
  },
  "default::Grid Miner": {
    name: { en: "Grid Miner", tr: "Izgara Madencisi" },
    description: { en: "Default miner casing on the checkerboard.", tr: "Dama zeminindeki varsayılan madenci kasası." },
  },
  "none::No Pet": {
    name: { en: "No Pet", tr: "Evcil Yok", "pt-BR": "Sem Pet", es: "Sin Mascota" },
    description: { en: "Go solo", tr: "Yalnız ilerle", "pt-BR": "Siga sozinho", es: "Ve por libre" },
  },
  "none::No Cape": {
    name: { en: "No Cape", tr: "Pelerin Yok", "pt-BR": "Sem Capa", es: "Sin Capa" },
    description: { en: "Keep your profile clean and minimal.", tr: "Profilini sade ve temiz tut.", "pt-BR": "Mantenha seu perfil limpo e minimalista.", es: "Mantén tu perfil limpio y minimalista." },
  },
  "none::No Wings": {
    name: { en: "No Wings", tr: "Kanat Yok", "pt-BR": "Sem Asas", es: "Sin Alas" },
    description: { en: "No wing module equipped.", tr: "Kanat mödülu takılı değil.", "pt-BR": "Nenhum módulo de asas equipado.", es: "No hay módulo de alas equipado." },
  },
  "none::No ascension pet equipped": {
    name: { en: "None", tr: "Yok", "pt-BR": "Nenhum", es: "Ninguno" },
    description: { en: "No ascension pet equipped", tr: "Yükseliş evcili takılı değil", "pt-BR": "Nenhum pet de ascensão equipado", es: "No hay mascota de ascensión equipada" },
  },
  ghost: {
    name: { en: "Ghost", tr: "Ghost" },
    title: { en: "Data Broker", tr: "Veri Brokeri" },
  },
  cipher: {
    name: { en: "Cipher", tr: "Cipher" },
    title: { en: "Crypto Dealer", tr: "Kripto Tücarı" },
  },
  nova: {
    name: { en: "Nova", tr: "Nova" },
    title: { en: "Tech Runner", tr: "Teknoloji Koşucusu" },
  },
  razor: {
    name: { en: "Razor", tr: "Razor" },
    title: { en: "Corp Fixer", tr: "Şirket Düzenleyicisi" },
  },
  echo: {
    name: { en: "Echo", tr: "Echo" },
    title: { en: "Net Ghost", tr: "Ağ Hayaleti" },
  },
  default: {
    name: { en: "Neon Violet", tr: "Neon Mor" },
    description: { en: "The classic cyberpunk hacker look", tr: "Klasik siberpunk korsan görünümü" },
  },
  cyan_pulse: {
    name: { en: "Cyan Pulse", tr: "Camgöbeği Darbesi" },
    description: { en: "Cool blue cybernetic enhancement", tr: "Serin mavi sibernetik güçlendirme" },
  },
  ember_core: {
    name: { en: "Ember Core", tr: "Kor Çekirdek" },
    description: { en: "Fiery orange modifications", tr: "Alevli turuncu modifikasyonlar" },
  },
  toxic_green: {
    name: { en: "Toxic Green", tr: "Zehirli Yeşil" },
    description: { en: "Radioactive green implants", tr: "Radyoaktif yeşil implantlar" },
  },
  blood_chrome: {
    name: { en: "Blood Chrome", tr: "Kan Kromu" },
    description: { en: "Crimson chrome cybernetics", tr: "Kızıl krom sibernetikler" },
  },
  gold_elite: {
    name: { en: "Gold Elite", tr: "Altın Elit" },
    description: { en: "Luxurious golden enhancements", tr: "Lüks altın geliştirmeler" },
  },
  plasma_pink: {
    name: { en: "Plasma Pink", tr: "Plazma Pembe" },
    description: { en: "Hot pink energy signature", tr: "Parlak pembe enerji izi" },
  },
  void_walker: {
    name: { en: "Void Walker", tr: "Boşluk Gezgini" },
    description: { en: "Dark matter infused tech", tr: "Karanlık maddeyle işlenmiş teknoloji" },
  },
  quantum_ghost: {
    name: { en: "Quantum Ghost", tr: "Kuantum Hayaleti" },
    description: { en: "Phase-shifted ethereal form", tr: "Faz değiştirmiş eterik form" },
  },
  singularity: {
    name: { en: "Singularity", tr: "Tekillik" },
    description: { en: "Beyond human comprehension", tr: "İnsan kavrayışının ötesinde" },
  },
  relic_luminous_core: {
    name: { en: "Luminous Core", tr: "Işıklı Çekirdek" },
    description: { en: "Relic body forged from condensed crypto light", tr: "Yoğunlaştırılmış kripto ışığından dövülmüş relik gövde" },
  },
  arctic_lab: {
    name: { en: "Arctic Lab", tr: "Arktik Lab" },
    description: { en: "Cold sterile research facility", tr: "Soğuk ve steril araştırma tesisi" },
  },
  crimson_bunker: {
    name: { en: "Crimson Bunker", tr: "Kızıl Sığınak" },
    description: { en: "Underground military installation", tr: "Yer altı askeri tesisi" },
  },
  toxic_wasteland: {
    name: { en: "Toxic Wasteland", tr: "Zehirli Çorak" },
    description: { en: "Irradiated industrial zone", tr: "Işınlanmış endüstri bölgesi" },
  },
  golden_palace: {
    name: { en: "Golden Palace", tr: "Altın Saray" },
    description: { en: "Opulent corporate headquarters", tr: "Görkemli şirket merkezi" },
  },
  synthwave_sunset: {
    name: { en: "Synthwave Sunset", tr: "Synthwave Günesbatımı" },
    description: { en: "Retro-futuristic pink paradise", tr: "Retro-futuristik pembe cennet" },
  },
  deep_void: {
    name: { en: "Deep Void", tr: "Derin Boşluk" },
    description: { en: "The darkness between stars", tr: "Yıldızların arasındaki karanlık" },
  },
  quantum_realm: {
    name: { en: "Quantum Realm", tr: "Kuantum Âlemi" },
    description: { en: "Reality bends to your will", tr: "Gerçeklik iradene göre bükülür" },
  },
  none: {
    name: { en: "None", tr: "Yok" },
    description: { en: "No accessory equipped", tr: "Aksesuar takılı değil" },
  },
  cowboy_hat: {
    name: { en: "Cowboy Hat", tr: "Kovboy Şapkası" },
    description: { en: "Yeehaw, cyber cowboy", tr: "Siber kovboya yakışan stil" },
  },
  bowler_hat: {
    name: { en: "Bowler Hat", tr: "Melon Şapka" },
    description: { en: "Classic gentleman hacker", tr: "Klasik beyefendi korsan" },
  },
  beanie: {
    name: { en: "Beanie", tr: "Bere" },
    description: { en: "Cozy hacker vibes", tr: "Rahat korsan havası" },
  },
  sunglasses: {
    name: { en: "Cyber Shades", tr: "Siber Gözlük" },
    description: { en: "Too cool for the matrix", tr: "Matrix için bile fazla havalı" },
  },
  propeller_hat: {
    name: { en: "Propeller Hat", tr: "Pervaneli Şapka" },
    description: { en: "Silly but aerodynamic", tr: "Komik ama aerodinamik" },
  },
  top_hat: {
    name: { en: "Top Hat", tr: "Silindir Şapka" },
    description: { en: "Distinguished cyber aristocrat", tr: "Seçkin siber aristokrat" },
  },
  vr_visor: {
    name: { en: "VR Visor", tr: "VR Vizörü" },
    description: { en: "See the code", tr: "Kodu olduğu gibi gör" },
  },
  headphones: {
    name: { en: "DJ Headphones", tr: "DJ Kulaklığı" },
    description: { en: "Drop the bass, hack the system", tr: "Basları bırak, sistemi kır" },
  },
  gaming_headset: {
    name: { en: "Gaming Headset", tr: "Oyuncu Kulaklığı" },
    description: { en: "Pro gamer setup with mic", tr: "Mikrofonlu profesyonel oyuncu düzeni" },
  },
  crown: {
    name: { en: "Royal Crown", tr: "Kraliyet Tacı" },
    description: { en: "King of the digital realm", tr: "Dijital alemin kralı" },
  },
  halo: {
    name: { en: "Digital Halo", tr: "Dijital Hale" },
    description: { en: "Angelic data overflow", tr: "Meleksi veri taşkını" },
  },
  monocle: {
    name: { en: "Cyber Monocle", tr: "Siber Monokl" },
    description: { en: "Sophisticated analysis", tr: "Sofistike analiz" },
  },
  neural_link: {
    name: { en: "Neural Link", tr: "Nöral Bağ" },
    description: { en: "Direct brain interface", tr: "Doğrudan beyin arayüzü" },
  },
  horns: {
    name: { en: "Demon Horns", tr: "Şeytan Boynuzları" },
    description: { en: "Embrace the dark web", tr: "Karanlık ağı kucakla" },
  },
  antenna: {
    name: { en: "Signal Antenna", tr: "Sinyal Anteni" },
    description: { en: "Intercept all frequencies", tr: "Tüm frekansları yakala" },
  },
  relic_quantum_wings: {
    name: { en: "Quantum Wings", tr: "Kuantum Kanatları" },
    description: { en: "Ultra-rare relic accessory from deep space ruins", tr: "Derin uzay kalıntılarından çıkmış ultra nadir relik aksesuar" },
  },
  no_pet: {
    name: { en: "No Pet", tr: "Evcil Yok", "pt-BR": "Sem Pet", es: "Sin Mascota" },
    description: { en: "Go solo", tr: "Yalnız ilerle", "pt-BR": "Siga sozinho", es: "Ve por libre" },
  },
  cosmic_dog: {
    name: { en: "Cosmic Pup", tr: "Kozmik Köpek" },
    description: { en: "+1% Production Rate", tr: "+1% Üretim Hızı" },
  },
  geo_cat: {
    name: { en: "Poly Cat", tr: "Poli Kedi" },
    description: { en: "+1% Click Value", tr: "+1% Tıklama Değeri" },
  },
  cyber_fox: {
    name: { en: "Neon Fox", tr: "Neon Tilki" },
    description: { en: "+1% Crit Chance", tr: "+1% Kritik Şansı" },
  },
  holo_bird: {
    name: { en: "Holo Sparrow", tr: "Holo Serçe" },
    description: { en: "+1% Crypto Rate", tr: "+1% Kripto Hızı" },
  },
  robo_bunny: {
    name: { en: "Mecha Bunny", tr: "Meka Tavşan" },
    description: { en: "+6% Production Rate", tr: "+6% Üretim Hızı" },
  },
  data_snake: {
    name: { en: "Data Serpent", tr: "Veri Yılanı" },
    description: { en: "+3% Click Value", tr: "+3% Tıklama Değeri" },
  },
  pixel_dragon: {
    name: { en: "Pixel Drake", tr: "Piksel Ejderi" },
    description: { en: "+6% Crit Chance", tr: "+6% Kritik Şansı" },
  },
  void_cat: {
    name: { en: "Void Kitten", tr: "Boşluk Kedisi" },
    description: { en: "+2% Production, +1% Click", tr: "+2% Üretim, +1% Tıklama" },
  },
  quantum_hamster: {
    name: { en: "Quantum Hamster", tr: "Kuantum Hamster" },
    description: { en: "+2% Click, +1% Crit", tr: "+2% Tıklama, +1% Kritik" },
  },
});

Object.assign(GAME_ENTITY_TEXTS, {
  android: {
    name: { en: "Android Unit", tr: "Android Birimi" },
    description: { en: "Synthetic humanoid design", tr: "Sentetik insansı tasarım" },
  },
  skull: {
    name: { en: "Skull Face", tr: "Kuru Kafa" },
    description: { en: "Death incarnate, chrome plated", tr: "Ölümün krom kaplı hâli" },
  },
  tv_head: {
    name: { en: "Broadcast Head", tr: "Yayın Kafası" },
    description: { en: "Retro CRT monitor face", tr: "Retro CRT monitör yüz" },
  },
  helmet: {
    name: { en: "Combat Helmet", tr: "Savaş Miğeri" },
    description: { en: "Military-grade tactical headgear", tr: "Askeri seviye taktik başlık" },
  },
  alien: {
    name: { en: "Xenomorph", tr: "Ksenomorf" },
    description: { en: "Elongated alien cranium", tr: "Uzatılmış uzaylı kafatası" },
  },
  cube: {
    name: { en: "Voxel Core", tr: "Voksel Çekirdek" },
    description: { en: "Geometric digital construct", tr: "Geometrik dijital yapı" },
  },
  orb: {
    name: { en: "Holo Sphere", tr: "Holo Küre" },
    description: { en: "Floating energy orb consciousness", tr: "Yüzer enerji küresi bilinci" },
  },
  glitch: {
    name: { en: "Glitch Entity", tr: "Glitch Varlığı" },
    description: { en: "Corrupted data visualization", tr: "Bozulmuş veri görüntüsü" },
  },
  void: {
    name: { en: "Void Walker", tr: "Boşluk Gezgini" },
    description: { en: "Pure darkness with starlight eyes", tr: "Yıldız gözlü saf karanlık" },
  },
  triangle: {
    name: { en: "Pyramid Mind", tr: "Piramit Zihni" },
    description: { en: "Ancient geometry meets future tech", tr: "Kadim geometri gelecekle buluşur" },
  },
  relic_celestial_crown: {
    name: { en: "Celestial Crown", tr: "Göksel Taç" },
    description: { en: "Relic headstyle with a stellar halo matrix", tr: "Yıldız hale matrisi taşıyan relik başlık" },
  },
  relic_node_body: {
    name: { en: "Luminous Core", tr: "Işıklı Çekirdek" },
    description: { en: "Permanent bonus to production, clicks, crit and crypto. Grows every level, no need to equip.", tr: "Üretim, tık, kritik ve kriptoya kalıcı bonus. Her seviyede artar, kuşanmana gerek yok." },
  },
  relic_node_head: {
    name: { en: "Celestial Crown", tr: "Göksel Taç" },
    description: { en: "Bigger permanent bonus to production, clicks, crit and crypto. Requires Luminous Core.", tr: "Üretim, tık, kritik ve kriptoya daha büyük kalıcı bonus. Işıklı Çekirdek gerekir." },
  },
  relic_node_accessory: {
    name: { en: "Quantum Wings", tr: "Kuantum Kanatları" },
    description: { en: "Largest permanent bonus to production, clicks, crit and crypto. Requires Celestial Crown.", tr: "Üretim, tık, kritik ve kriptoya en büyük kalıcı bonus. Göksel Taç gerekir." },
  },
  ascension_spark: {
    name: { en: "Spark Wisp", tr: "Kıvılcım Perisi" },
    description: { en: "+2% All Stats", tr: "+2% Tüm İstatistikler" },
  },
  ascension_ember: {
    name: { en: "Data Ember", tr: "Veri Koru" },
    description: { en: "+4% Production", tr: "+4% Üretim" },
  },
  ascension_phantom: {
    name: { en: "Cyber Phantom", tr: "Siber Hayalet" },
    description: { en: "+4% Click, +2% Crit", tr: "+4% Tıklama, +2% Kritik" },
  },
  ascension_nexus: {
    name: { en: "Nexus Core", tr: "Nexus Çekirdeği" },
    description: { en: "+6% Production, +4% Crit", tr: "+6% Üretim, +4% Kritik" },
  },
  ascension_oracle: {
    name: { en: "Oracle Spirit", tr: "Kâhin Ruhu" },
    description: { en: "+8% Production, +6% Click", tr: "+8% Üretim, +6% Tıklama" },
  },
  ascension_infinity: {
    name: { en: "Infinity Entity", tr: "Sonsuzluk Varlığı" },
    description: { en: "+10% All Stats", tr: "+10% Tüm İstatistikler" },
  },
  asc_aurora: {
    name: { en: "Aurora Shift", tr: "Aurora Kayması" },
    description: { en: "+4% Production - Shifting aurora colors", tr: "+4% Üretim - Renk değiştiren aurora tonları" },
  },
  asc_nebula: {
    name: { en: "Nebula Core", tr: "Nebula Çekirdeği" },
    description: { en: "+6% Production, +4% Crit - Purple cosmic gradient", tr: "+6% Üretim, +4% Kritik - Mor kozmik geçiş" },
  },
  asc_solar: {
    name: { en: "Solar Flare", tr: "Güneş Patlaması" },
    description: { en: "+8% Click, +4% Production - Animated solar pulse", tr: "+8% Tıklama, +4% Üretim - Animasyonlu güneş atımı" },
  },
  asc_eclipse: {
    name: { en: "Eclipse Shadow", tr: "Tutulma Gölgesi" },
    description: { en: "+6% All Stats - Dark void gradient", tr: "+6% Tüm İstatistikler - Karanlık boşluk geçişi" },
  },
  asc_prismatic: {
    name: { en: "Prismatic Entity", tr: "Prizmatik Varlık" },
    description: { en: "+8% Production, +8% Crypto - Rainbow shimmer", tr: "+8% Üretim, +8% Kripto - Gökkuşağı parıltısı" },
  },
  asc_transcendent: {
    name: { en: "Transcendent Being", tr: "Aşkın Varlık" },
    description: { en: "+10% All Stats - Pure light radiance", tr: "+10% Tüm İstatistikler - Saf ışık parıltısı" },
  },
  paragon_apex_core: {
    name: { en: "Apex Core", tr: "Apex Çekirdeği" },
    description: { en: "+14% Production, +12% Click, +12% Crypto, +10% Crit - Paragon-grade body shell", tr: "+14% Üretim, +12% Tıklama, +12% Kripto, +10% Kritik - Paragon sınıfı gövde" },
  },
  asc_crystal: {
    name: { en: "Crystal Mind", tr: "Kristal Zihin" },
    description: { en: "+4% Click", tr: "+4% Tıklama" },
  },
  asc_flame: {
    name: { en: "Flame Wraith", tr: "Alev Varlığı" },
    description: { en: "+6% Production", tr: "+6% Üretim" },
  },
  asc_storm: {
    name: { en: "Storm Cloud", tr: "Fırtına Bulutu" },
    description: { en: "+6% Crit, +4% Click", tr: "+6% Kritik, +4% Tıklama" },
  },
  asc_celestial: {
    name: { en: "Celestial Halo", tr: "Göksel Hale" },
    description: { en: "+8% Production, +4% Crypto", tr: "+8% Üretim, +4% Kripto" },
  },
  asc_galaxy: {
    name: { en: "Galaxy Brain", tr: "Galaksi Beyni" },
    description: { en: "+8% All Stats", tr: "+8% Tüm İstatistikler" },
  },
  asc_omega: {
    name: { en: "Omega Form", tr: "Omega Formu" },
    description: { en: "+10% Production, +10% Click", tr: "+10% Üretim, +10% Tıklama" },
  },
  paragon_quantum_crown: {
    name: { en: "Quantum Crownframe", tr: "Kuantum Taç İskeleti" },
    description: { en: "+14% Crit, +12% Click, +8% Production", tr: "+14% Kritik, +12% Tıklama, +8% Üretim" },
  },
  asc_wings_small: {
    name: { en: "Data Wings", tr: "Veri Kanatları" },
    description: { en: "+4% Production", tr: "+4% Üretim" },
  },
  asc_third_eye: {
    name: { en: "Third Eye", tr: "Üçüncü Göz" },
    description: { en: "+6% Crit", tr: "+6% Kritik" },
  },
  asc_crown_energy: {
    name: { en: "Energy Crown", tr: "Enerji Tacı" },
    description: { en: "+6% Click, +4% Crypto", tr: "+6% Tıklama, +4% Kripto" },
  },
  asc_void_helm: {
    name: { en: "Void Helm", tr: "Boşluk Miğeri" },
    description: { en: "+8% Crypto, +4% Crit", tr: "+8% Kripto, +4% Kritik" },
  },
  asc_cosmic_visor: {
    name: { en: "Cosmic Visor", tr: "Kozmik Vizör" },
    description: { en: "+8% Crit, +6% Click", tr: "+8% Kritik, +6% Tıklama" },
  },
  asc_divine_aura: {
    name: { en: "Divine Aura", tr: "İlahi Aura" },
    description: { en: "+10% All Stats", tr: "+10% Tüm İstatistikler" },
  },
  paragon_void_diadem: {
    name: { en: "Void Diadem", tr: "Boşluk Diyademi" },
    description: { en: "+14% Crypto, +12% Crit, +10% Production", tr: "+14% Kripto, +12% Kritik, +10% Üretim" },
  },
  no_cape: {
    name: { en: "No Cape", tr: "Pelerin Yok", "pt-BR": "Sem Capa", es: "Sin Capa" },
    description: { en: "Keep your profile clean and minimal.", tr: "Profilini sade ve temiz tut.", "pt-BR": "Mantenha seu perfil limpo e minimalista.", es: "Mantén tu perfil limpio y minimalista." },
  },
  bm_void_cape: {
    name: { en: "Void Veil Cape", tr: "Boşluk Tülü Pelerin", "pt-BR": "Capa Veu do Vazio", es: "Capa Velo del Vacio" },
    description: { en: "Dark market stealth weave with low-noise trails.", tr: "Düşük izli karaborsa gizlilik dokusu.", "pt-BR": "Tecido furtivo do mercado negro com rastros discretos.", es: "Tejido furtivo del mercado negro con estelas discretas." },
  },
  bm_plasma_cape: {
    name: { en: "Plasma Mantle", tr: "Plazma Mantosu", "pt-BR": "Manto de Plasma", es: "Manto de Plasma" },
    description: { en: "Reactive plasma cloth that amplifies click output.", tr: "Tıklama gücünü artıran tepkisel plazma kumaşı.", "pt-BR": "Tecido de plasma reativo que amplia o poder de clique.", es: "Tela de plasma reactiva que amplifica el poder de clic." },
  },
  bm_singularity_cape: {
    name: { en: "Singularity Shroud", tr: "Tekillik Örtüsü", "pt-BR": "Manto da Singularidade", es: "Sudario de la Singularidad" },
    description: { en: "Legendary drape built from compressed event-horizon fiber.", tr: "Sıkıştırılmış olay ufku lifinden yapılmış efsanevi örtü.", "pt-BR": "Manto lendário feito de fibra comprimida de horizonte de eventos.", es: "Cobertura legendaria hecha de fibra comprimida de horizonte de sucesos." },
  },
  no_wings: {
    name: { en: "No Wings", tr: "Kanat Yok", "pt-BR": "Sem Asas", es: "Sin Alas" },
    description: { en: "No wing module equipped.", tr: "Kanat modülü takılı değil.", "pt-BR": "Nenhum módulo de asas equipado.", es: "No hay módulo de alas equipado." },
  },
  bm_ion_wings: {
    name: { en: "Ion Wings", tr: "İyon Kanatları", "pt-BR": "Asas de Ion", es: "Alas de Iones" },
    description: { en: "Dual ion vanes tuned for sustained fabrication output.", tr: "Sürekli Üretim için ayarlanmış Çift iyon kanatçıklar.", "pt-BR": "Aletas duplas de íon ajustadas para produção sustentada.", es: "Aletas dobles de iones ajustadas para producción sostenida." },
  },
  bm_prism_wings: {
    name: { en: "Prism Wings", tr: "Prizma Kanatları", "pt-BR": "Asas de Prisma", es: "Alas Prisma" },
    description: { en: "Split-spectrum emitters that sharpen critical hits.", tr: "Kritik vuruşları keskinleştiren çok renkli yayıcılar.", "pt-BR": "Emissores de espectro dividido que refinam acertos críticos.", es: "Emisores de espectro dividido que afilan los golpes críticos." },
  },
  bm_quantum_wings_mk2: {
    name: { en: "Quantum Wings Mk-II", tr: "Kuantum Kanatları Mk-II", "pt-BR": "Asas Quanticas Mk-II", es: "Alas Cuánticas Mk-II" },
    description: { en: "Black market wing frame with recursive phase blades.", tr: "Tekrarlayan faz bıçaklı karaborsa kanat iskeleti.", "pt-BR": "Estrutura de asas do mercado negro com lâminas de fase recursivas.", es: "Estructura de alas del mercado negro con hojas de fase recursivas." },
  },
});

Object.assign(GAME_ENTITY_TEXTS, {
  click_overflow: {
    name: { en: "Click Overflow", tr: "Tıklama Taşması", "pt-BR": "Overflow de Clique", es: "Overflow de Clic" },
    description: { en: "Allows crit chance over 100%. Overflow converts into extra crit multiplier.", tr: "Kritik Şansı %100'ü aşabilir. Taşma ek kritik çarpana dönüşür.", "pt-BR": "Permite chance crítica acima de 100%. O excedente vira multiplicador crítico extra.", es: "Permite prob. crítica por encima del 100%. El excedente se convierte en multiplicador crítico extra." },
  },
  adjacency_matrix: {
    name: { en: "Adjacency Matrix", tr: "Komşuluk Matrisi", "pt-BR": "Matriz de Adjacência", es: "Matriz de Adyacencia" },
    description: { en: "One-time passive. Arrange miners: horizontal 3s boost click, vertical 3s boost production, 2x2 squares boost crypto. All patterns add luck.", tr: "Tek seferlik pasif. Yatay 3'lüler tıklama, dikey 3'lüler üretim, 2x2 kareler kriptoyu güçlendirir. Tüm dizilimler şans ekler.", "pt-BR": "Passivo ?nico. Organize mineradores: trios horizontais melhoram clique, trios verticais melhoram produção, quadrados 2x2 melhoram cripto. Todos os padrões adicionam sorte.", es: "Pasivo único. Organiza mineros: filas horizontales de 3 mejoran el clic, verticales de 3 mejoran la producción y cuadrados 2x2 mejoran el cripto. Todos los patrones anaden suerte." },
  },
  overclock_lattice: {
    name: { en: "Overclock Lattice", tr: "Hız Aşırtma Kafesi", "pt-BR": "Treliça de Overclock", es: "Retícula de Overclock", ru: "Разгонная решётка", "zh-CN": "超频晶格" },
    description: { en: "+7% production per level. Paragon II.", tr: "Seviye başına +%7 üretim. Paragon II.", "pt-BR": "+7% de produção por nível. Paragon II.", es: "+7% de producción por nivel. Paragon II.", ru: "+7% производства за уровень. Paragon II.", "zh-CN": "每级产量 +7%。Paragon II。" },
  },
  quantum_ledger: {
    name: { en: "Quantum Ledger", tr: "Kuantum Defteri", "pt-BR": "Livro Quântico", es: "Libro Cuántico", ru: "Квантовый реестр", "zh-CN": "量子账本" },
    description: { en: "+9% crypto production per level. Paragon II.", tr: "Seviye başına +%9 kripto üretimi. Paragon II.", "pt-BR": "+9% de produção de cripto por nível. Paragon II.", es: "+9% de producción de cripto por nivel. Paragon II.", ru: "+9% добычи крипты за уровень. Paragon II.", "zh-CN": "每级加密币产量 +9%。Paragon II。" },
  },
  singularity_tap: {
    name: { en: "Singularity Tap", tr: "Tekillik Musluğu", "pt-BR": "Torneira da Singularidade", es: "Grifo de la Singularidad", ru: "Кран сингулярности", "zh-CN": "奇点汲取" },
    description: { en: "+8% data per click per level. Paragon II.", tr: "Seviye başına tık başına +%8 veri. Paragon II.", "pt-BR": "+8% de dados por clique por nível. Paragon II.", es: "+8% de datos por clic por nivel. Paragon II.", ru: "+8% данных за клик за уровень. Paragon II.", "zh-CN": "每级每次点击数据 +8%。Paragon II。" },
  },
  breach_driver: {
    name: { en: "Breach Driver", tr: "Sızma Sürücüsü", "pt-BR": "Driver de Invasão", es: "Driver de Brecha", ru: "Драйвер взлома", "zh-CN": "突破驱动器" },
    description: { en: "+5% damage against every boss per level. Paragon III.", tr: "Seviye başına tüm bosslara +%5 hasar. Paragon III.", "pt-BR": "+5% de dano contra todos os chefes por nível. Paragon III.", es: "+5% de daño contra todos los jefes por nivel. Paragon III.", ru: "+5% урона по всем боссам за уровень. Paragon III.", "zh-CN": "每级对所有首领伤害 +5%。Paragon III。" },
  },
  chrono_siege: {
    name: { en: "Chrono Siege", tr: "Zaman Kuşatması", "pt-BR": "Cerco Cronal", es: "Asedio Cronal", ru: "Хроноосада", "zh-CN": "时序围攻" },
    description: { en: "+1 second on every boss timer per level. Paragon III.", tr: "Seviye başına her boss süresine +1 saniye. Paragon III.", "pt-BR": "+1 segundo em todo cronômetro de chefe por nível. Paragon III.", es: "+1 segundo en cada temporizador de jefe por nivel. Paragon III.", ru: "+1 секунда к таймеру каждого босса за уровень. Paragon III.", "zh-CN": "每级所有首领战计时 +1 秒。Paragon III。" },
  },
  critical_cascade: {
    name: { en: "Critical Cascade", tr: "Kritik Çağlayan", "pt-BR": "Cascata Crítica", es: "Cascada Crítica", ru: "Критический каскад", "zh-CN": "暴击瀑流" },
    description: { en: "+3.5% crit chance per level. Paragon II.", tr: "Seviye başına +%3.5 kritik şansı. Paragon II.", "pt-BR": "+3,5% de chance de crítico por nível. Paragon II.", es: "+3,5% de prob. de crítico por nivel. Paragon II.", ru: "+3,5% шанса крита за уровень. Paragon II.", "zh-CN": "每级暴击率 +3.5%。Paragon II。" },
  },
  softcap_breaker: {
    name: { en: "Softcap Breaker", tr: "Yumuşak Sınır Kırıcı", "pt-BR": "Quebrador de Softcap", es: "Rompe Softcap" },
    description: { en: "+7% production per level. Stacks with all other bonuses.", tr: "Seviye başına +7% üretim. Diğer tüm bonuslarla birlikte çalışır.", "pt-BR": "+7% de produção por nível. Acumula com todos os outros bônus.", es: "+7% de producción por nivel. Se suma a todas las demás bonificaciones." },
  },
  node_compression: {
    name: { en: "Node Compression", tr: "Dizin Sıkıştırması", "pt-BR": "Compressão de Nodes", es: "Compresión de Nodos" },
    description: { en: "Selling is cheaper: 6% less data per Node per level (minimum 40 data).", tr: "Satış ucuzlar: seviye başına Dizin başına %6 daha az veri (en az 40 veri).", "pt-BR": "Vender fica mais barato: 6% menos dados por Node por nível (mínimo 40 dados).", es: "Vender sale más barato: 6% menos datos por Nodo por nivel (mínimo 40 datos)." },
  },
  crypto_echo: {
    name: { en: "Crypto Echo", tr: "Kripto Yankısı", "pt-BR": "Eco de Cripto", es: "Eco de Cripto" },
    description: { en: "Boosts crypto production from all mining sources.", tr: "Tüm madencilik kaynaklarından gelen kriptoyu artırır.", "pt-BR": "Aumenta a produção de cripto de todas as fontes de mineração.", es: "Aumenta la producción de cripto de todas las fuentes de minería." },
  },
  persistent_momentum: {
    name: { en: "Persistent Momentum", tr: "Kalıcı Momentum", "pt-BR": "Momentum Persistente", es: "Impulso Persistente" },
    description: { en: "+6% data per click per level.", tr: "Seviye başına tık başına +6% veri.", "pt-BR": "+6% de dados por clique por nível.", es: "+6% de datos por clic por nivel." },
  },
  floater_reactor: {
    name: { en: "Floater Reactor", tr: "Yüzer Reaktör", "pt-BR": "Reator de Floaters", es: "Reactor de Floaters" },
    description: { en: "Floating pickups appear 5% more often per level.", tr: "Yüzen toplanabilirler seviye başına %5 daha sık çıkar.", "pt-BR": "Itens flutuantes aparecem 5% mais vezes por nível.", es: "Los objetos flotantes aparecen un 5% más a menudo por nivel." },
  },
  timewarp_overdrive: {
    name: { en: "Timewarp Overdrive", tr: "Timewarp Aşırı Sürüş", "pt-BR": "Overdrive de Timewarp", es: "Overdrive de Timewarp" },
    description: { en: "Raises Time Warp payout from mini-game clicks.", tr: "Mini oyun tıklamalarından gelen Time Warp ödülünü artırır.", "pt-BR": "Aumenta a recompensa de Time Warp obtida nos cliques do minijogo.", es: "Aumenta la recompensa de Time Warp obtenida en los clics del minijuego." },
  },
  critical_singularity: {
    name: { en: "Critical Singularity", tr: "Kritik Tekillik", "pt-BR": "Singularidade Crítica", es: "Singularidad Crítica" },
    description: { en: "+3.5% crit chance per level.", tr: "Seviye başına +3,5% kritik şansı.", "pt-BR": "+3,5% de chance de crítico por nível.", es: "+3,5% de prob. de crítico por nivel." },
  },
  chrono_stabilizer: {
    name: { en: "Chrono Stabilizer", tr: "Krono Dengeleyici", "pt-BR": "Estabilizador Crono", es: "Estabilizador Crono" },
    description: { en: "Time Warp recharges 5% faster per level.", tr: "Time Warp seviye başına %5 daha hızlı dolar.", "pt-BR": "O Time Warp recarrega 5% mais rápido por nível.", es: "Time Warp se recarga un 5% más rápido por nivel." },
  },
  asc_crystal_cave: {
    name: { en: "Ice Giant Orbit", tr: "Buz Devi Yörüngesi" },
    description: { en: "+4% Production - View from icy moon orbit", tr: "+4% Üretim - Buzlu ay yörüngesinden görünüm" },
  },
  asc_void_station: {
    name: { en: "Event Horizon", tr: "Olay Ufku" },
    description: { en: "+6% Crypto - Station at black hole edge", tr: "+6% Kripto - Karadelik kenarındaki istasyon" },
  },
  asc_solar_forge: {
    name: { en: "Lava World Close-Up", tr: "Lav Gezegeni Yakından" },
    description: { en: "+8% Production, +4% Click - Volcanic planet surface", tr: "+8% Üretim, +4% Tıklama - Volkanik gezegen yüzeyi" },
  },
  asc_nebula_core: {
    name: { en: "Gas Giant Storm", tr: "Gaz Devi Fırtınası" },
    description: { en: "+8% All Stats - Inside massive storm bands", tr: "+8% Tüm İstatistikler - Dev fırtına kuşaklarının içinde" },
  },
  asc_dimension_rift: {
    name: { en: "Binary Star System", tr: "Çift Yıldız Sistemi" },
    description: { en: "+10% Crypto, +6% Crit - Twin suns dance", tr: "+10% Kripto, +6% Kritik - İkiz güneşler dans ediyor" },
  },
  asc_transcendence: {
    name: { en: "Cosmic Nebula Heart", tr: "Kozmik Bulutsu Kalbi" },
    description: { en: "+12% All Stats - Birth of stars", tr: "+12% Tüm İstatistikler - Yıldızların doğuşu" },
  },
  asc_star_of_death: {
    name: { en: "Star of Death", tr: "Ölüm Yıldızı" },
    description: { en: "+10% All Stats - Ultimate weapon in orbit", tr: "+10% Tüm İstatistikler - Yörüngedeki nihai silah" },
  },
  paragon_singularity_vault: {
    name: { en: "Singularity Vault", tr: "Tekillik Kasası", "pt-BR": "Cofre da Singularidade", es: "Boveda de la Singularidad" },
    description: { en: "+16% Production, +14% Crypto, +10% Click - End-game command deck", tr: "+16% Üretim, +14% Kripto, +10% Tıklama - Son oyun komuta güvertesi", "pt-BR": "+16% Produção, +14% Cripto, +10% Clique - Centro de comando do fim de jogo", es: "+16% Producción, +14% Cripto, +10% Clic - Centro de mando del final de juego" },
  },
  ember_surge: {
    name: { en: "Ember Surge", tr: "Kor Dalgası", "pt-BR": "Surto de Brasas", es: "Oleada de Brasas" },
    description: { en: "Ignites each click with short-lived fire sparks.", tr: "Her tıklamayı kısa ömürlü ateş kıvılcımlarıyla yakar.", "pt-BR": "Incendeia cada clique com faiscas breves de fogo.", es: "Enciende cada clic con chispas breves de fuego." },
  },
  ion_arc: {
    name: { en: "Ion Arc", tr: "İyon Yayı", "pt-BR": "Arco Iônico", es: "Arco Ionico" },
    description: { en: "High-voltage arc lines burst from impact points.", tr: "Yüksek voltajlı yaylar çarpma noktalarından fırlar.", "pt-BR": "Arcos de alta voltagem explodem dos pontos de impacto.", es: "Arcos de alto voltaje brotan de los puntos de impacto." },
  },
  phase_shatter: {
    name: { en: "Phase Shatter", tr: "Faz Kırılması", "pt-BR": "Estilhaco de Fase", es: "Fragmento de Fase" },
    description: { en: "Violet shards split outward with each tap.", tr: "Her dokunuşta mor parçacıklar etrafa saçılır.", "pt-BR": "Fragmentos violetas se espalham a cada toque.", es: "Fragmentos violetas se dispersan con cada toque." },
  },
  plasma_wave: {
    name: { en: "Plasma Wave", tr: "Plazma Dalgası", "pt-BR": "Onda de Plasma", es: "Onda de Plasma" },
    description: { en: "Dense plasma bloom leaves a neon afterglow.", tr: "Yoğun plazma patlaması neon bir ardıl ışık bırakır.", "pt-BR": "Uma explosão densa de plasma deixa um brilho neon residual.", es: "Una densa explosión de plasma deja un resplandor neón residual." },
  },
  solar_flare: {
    name: { en: "Solar Flare", tr: "Güneş Patlaması" },
    description: { en: "Legendary flare pulse with golden fragments.", tr: "Altın parçacıklı efsanevi patlama atımı." },
  },
  ember_vault: {
    name: { en: "Ember Vault", tr: "Kor Kasası" },
    description: { en: "Industrial furnace shell with hot plasma seams.", tr: "Sıcak plazma damarlı endüstriyel fırın kasası." },
  },
  glacier_matrix: {
    name: { en: "Glacier Matrix", tr: "Buzul Matrisi" },
    description: { en: "Cryo-forged casing with ionized blue edges.", tr: "İyonize mavi kenarlı kriyo kasa." },
  },
  pulse_cataclysm: {
    name: { en: "Pulse Cataclysm", tr: "Darbe Felaketi" },
    description: { en: "Epic surge plating with prismatic reactor rails.", tr: "Prizmatik reaktör raylı epik enerji kaplaması." },
  },
  void_relic_case: {
    name: { en: "Void Relic Case", tr: "Boşluk Relik Kasası" },
    description: { en: "Legendary deep-space container with singularity glow.", tr: "Tekillik parıltısına sahip efsanevi derin uzay kasası." },
  },
  grid_miner: {
    name: { en: "Grid Miner", tr: "Izgara Madencisi" },
    description: { en: "Default miner casing on the checkerboard.", tr: "Dama zeminindeki varsayılan madenci kasası." },
  },
  fusion_cyan: {
    name: { en: "Fusion Cyan Miner", tr: "Füzyon Camgöbeği Madenci" },
    description: { en: "Clean cyan overdrive shell for miner stacks.", tr: "Madenci dizilimleri için temiz camgöbeği kaplama." },
  },
  ember_core_box: {
    name: { en: "Ember Core Miner", tr: "Kor Çekirdek Madenci" },
    description: { en: "High-heat industrial miner skin.", tr: "Yüksek ısılı endüstriyel madenci kaplaması." },
  },
  phase_prism_box: {
    name: { en: "Phase Prism Miner", tr: "Faz Prizma Madenci" },
    description: { en: "Epic violet prism sheen across all miners.", tr: "Tüm madencilerde epik mor prizma parlaklığı." },
  },
  singularity_chrome: {
    name: { en: "Singularity Chrome Miner", tr: "Tekillik Krom Madenci" },
    description: { en: "Legendary black-chrome miner frame with deep-space glow.", tr: "Derin uzay parıltısına sahip efsanevi siyah krom madenci kasası." },
  },
});

const localizeEntityFields = <T extends { id: string }>(item: T, language: Language): Partial<T> => {
  const candidateKeys = [
    "name" in item ? `${item.id}::${String((item as { name?: string }).name || "")}` : "",
    "title" in item ? `${item.id}::${String((item as { title?: string }).title || "")}` : "",
    "description" in item ? `${item.id}::${String((item as { description?: string }).description || "")}` : "",
    item.id,
  ].filter(Boolean);
  const entry = candidateKeys.map((key) => GAME_ENTITY_TEXTS[key]).find(Boolean);
  if (!entry) return {};

  const localized: Record<string, unknown> = {};
  if ("name" in item && entry.name) localized.name = localizeText(entry.name, language);
  if ("description" in item && entry.description) localized.description = localizeText(entry.description, language);
  if ("title" in item && entry.title) localized.title = localizeText(entry.title, language);
  return localized as Partial<T>;
};

const getLanguageTextFallback = (text: string, language: Language): string | undefined => {
  if (language === "ru") return getRussianTextFallback(text);
  if (language === "zh-CN") return getSimplifiedChineseTextFallback(text);
  if (language === "pt-BR") return PT_BR_TEXT_FALLBACKS[text] ?? V104_PT_BR[text];
  if (language === "es") return ES_TEXT_FALLBACKS[text] ?? V104_ES[text];
  return undefined;
};

const applyLanguageTextFallbacks = <T extends Record<string, unknown>>(item: T, language: Language): T => {
  if (language === "en" || language === "tr") return item;

  const localized = { ...item } as T & {
    name?: unknown;
    description?: unknown;
    title?: unknown;
  };

  if (typeof localized.name === "string") {
    localized.name = getLanguageTextFallback(localized.name, language) ?? localized.name;
  }
  if (typeof localized.description === "string") {
    localized.description = getLanguageTextFallback(localized.description, language) ?? localized.description;
  }
  if (typeof localized.title === "string") {
    localized.title = getLanguageTextFallback(localized.title, language) ?? localized.title;
  }

  return localized as T;
};

const formatCompactValue = (value: number): string => {
  if (value >= 1000000000) return `${value / 1000000000}B`;
  if (value >= 1000000) return `${value / 1000000}M`;
  if (value >= 1000) return `${value / 1000}K`;
  return String(value);
};

const formatAchievementDuration = (seconds: number, language: Language): string => {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    if (language === "tr") {
      return remainder > 0 ? `${minutes}dk ${remainder}sn` : `${minutes}dk`;
    }
    if (language === "ru") {
      return remainder > 0 ? `${minutes}мин ${remainder}с` : `${minutes}мин`;
    }
    return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }
  if (language === "tr") return `${seconds}sn`;
  if (language === "ru") return `${seconds}с`;
  return `${seconds}s`;
};

const getTierIndex = (tiers: number[], value: number): number => tiers.findIndex((tier) => tier === value);

const getAchievementTranslation = (id: string, language: Language): { name: string; description: string } | null => {
  if (language === "en") return null;

  if (SECRET_ACHIEVEMENT_TEXTS[id]) {
    const text = SECRET_ACHIEVEMENT_TEXTS[id];
    return {
      name: localizeText(text.name || id, language),
      description: localizeText(text.description || id, language),
    };
  }

  const makeResult = (names: string[], index: number, description: string) => ({
    name: names[index] || names[names.length - 1],
    description,
  });

  if (language === "ru") {
    if (id.startsWith("prestige_spent_")) {
      const amount = Number(id.replace("prestige_spent_", ""));
      const index = getTierIndex(PRESTIGE_SPENT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(PRESTIGE_SPENT_ACHIEVEMENT_NAMES_RU, index, `Потрать ${formatCompactValue(amount)} очков престижа`);
    }

    if (id.startsWith("prestige_upgrades_")) {
      const amount = Number(id.replace("prestige_upgrades_", ""));
      const index = getTierIndex(PRESTIGE_UPGRADE_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          PRESTIGE_UPGRADE_ACHIEVEMENT_NAMES_RU,
          index,
          amount === 1 ? "Купи улучшение престижа" : `Купи ${amount} улучшений престижа`,
        );
      }
    }

    if (id.startsWith("crit_pickups_")) {
      const amount = Number(id.replace("crit_pickups_", ""));
      const index = getTierIndex(CRIT_PICKUP_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          CRIT_PICKUP_ACHIEVEMENT_NAMES_RU,
          index,
          amount === 1 ? "Подбери свой первый критический бонус" : `Подбери ${amount} критических бонусов`,
        );
      }
    }

    if (id.startsWith("clicks_")) {
      const amount = Number(id.replace("clicks_", ""));
      const index = getTierIndex(CLICK_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(CLICK_ACHIEVEMENT_NAMES_RU, index, `Сделай ${formatCompactValue(amount)} кликов`);
    }

    if (id.startsWith("crits_")) {
      const amount = Number(id.replace("crits_", ""));
      const index = getTierIndex(CRIT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          CRIT_ACHIEVEMENT_NAMES_RU,
          index,
          amount === 1 ? "Сделай свой первый критический удар" : `Нанеси ${formatCompactValue(amount)} критических ударов`,
        );
      }
    }

    if (id.startsWith("data_")) {
      const amount = Number(id.replace("data_", ""));
      const index = getTierIndex(DATA_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(DATA_ACHIEVEMENT_NAMES_RU, index, `Собери всего ${formatCompactValue(amount)} данных`);
    }

    if (id.startsWith("credits_")) {
      const amount = Number(id.replace("credits_", ""));
      const index = getTierIndex(CREDIT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(CREDIT_ACHIEVEMENT_NAMES_RU, index, `Заработай всего ${formatCompactValue(amount)} узлов`);
    }

    if (id.startsWith("crypto_")) {
      const amount = Number(id.replace("crypto_", ""));
      const index = getTierIndex(CRYPTO_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(CRYPTO_ACHIEVEMENT_NAMES_RU, index, `Добудь ${formatCompactValue(amount)} крипты`);
    }

    if (id.startsWith("upgrades_")) {
      const amount = Number(id.replace("upgrades_", ""));
      const index = getTierIndex(UPGRADE_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          UPGRADE_ACHIEVEMENT_NAMES_RU,
          index,
          amount === 1 ? "Купи своё первое улучшение" : `Купи всего ${formatCompactValue(amount)} улучшений`,
        );
      }
    }

    if (id.startsWith("checkpoints_")) {
      const amount = Number(id.replace("checkpoints_", ""));
      const index = getTierIndex(CHECKPOINT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          CHECKPOINT_ACHIEVEMENT_NAMES_RU,
          index,
          amount === 1 ? "Достигни своей первой контрольной точки" : `Достигни ${amount} контрольных точек`,
        );
      }
    }

    if (id.startsWith("ascend_")) {
      const amount = Number(id.replace("ascend_", ""));
      const index = getTierIndex(ASCEND_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          ASCEND_ACHIEVEMENT_NAMES_RU,
          index,
          amount === 1 ? "Вознесись впервые" : `Вознесись ${amount} раз`,
        );
      }
    }

    if (id.startsWith("pickups_")) {
      const amount = Number(id.replace("pickups_", ""));
      const index = getTierIndex(PICKUP_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(PICKUP_ACHIEVEMENT_NAMES_RU, index, `Собери ${formatCompactValue(amount)} парящих бонусов`);
    }

    if (id.startsWith("dps_")) {
      const amount = Number(id.replace("dps_", ""));
      const index = getTierIndex(DPS_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(DPS_ACHIEVEMENT_NAMES_RU, index, `Достигни ${formatCompactValue(amount)} данных в секунду`);
    }

    if (id.startsWith("speed_")) {
      const amount = Number(id.replace("speed_", ""));
      const index = getTierIndex(SPEED_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(SPEED_ACHIEVEMENT_NAMES_RU, index, `Вознесись быстрее чем за ${formatAchievementDuration(amount, language)}`);
    }

    if (id.startsWith("playtime_")) {
      const amount = Number(id.replace("playtime_", ""));
      const index = getTierIndex(PLAYTIME_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(PLAYTIME_ACHIEVEMENT_NAMES_RU, index, `Играй ${PLAYTIME_DESCRIPTION_LABELS_RU[index]}`);
    }

    if (id.startsWith("cosmetics_")) {
      const amount = Number(id.replace("cosmetics_", ""));
      const index = getTierIndex(COSMETIC_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          COSMETIC_ACHIEVEMENT_NAMES_RU,
          index,
          amount === 1 ? "Купи свою первую косметику" : `Купи ${amount} косметических предметов`,
        );
      }
    }
  }

  if (language === "es") {
    if (id.startsWith("prestige_spent_")) {
      const amount = Number(id.replace("prestige_spent_", ""));
      const index = getTierIndex(PRESTIGE_SPENT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(PRESTIGE_SPENT_ACHIEVEMENT_NAMES_ES, index, `Gasta ${formatCompactValue(amount)} puntos de prestigio`);
    }

    if (id.startsWith("prestige_upgrades_")) {
      const amount = Number(id.replace("prestige_upgrades_", ""));
      const index = getTierIndex(PRESTIGE_UPGRADE_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          PRESTIGE_UPGRADE_ACHIEVEMENT_NAMES_ES,
          index,
          amount === 1 ? "Compra una mejora de prestigio" : `Compra ${amount} mejoras de prestigio`,
        );
      }
    }

    if (id.startsWith("crit_pickups_")) {
      const amount = Number(id.replace("crit_pickups_", ""));
      const index = getTierIndex(CRIT_PICKUP_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          CRIT_PICKUP_ACHIEVEMENT_NAMES_ES,
          index,
          amount === 1 ? "Recoge tu primer pickup crítico" : `Recoge ${amount} pickups críticos`,
        );
      }
    }

    if (id.startsWith("clicks_")) {
      const amount = Number(id.replace("clicks_", ""));
      const index = getTierIndex(CLICK_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(CLICK_ACHIEVEMENT_NAMES_ES, index, `Haz ${formatCompactValue(amount)} clics`);
    }

    if (id.startsWith("crits_")) {
      const amount = Number(id.replace("crits_", ""));
      const index = getTierIndex(CRIT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          CRIT_ACHIEVEMENT_NAMES_ES,
          index,
          amount === 1 ? "Da tu primer golpe crítico" : `Da ${formatCompactValue(amount)} golpes críticos`,
        );
      }
    }

    if (id.startsWith("data_")) {
      const amount = Number(id.replace("data_", ""));
      const index = getTierIndex(DATA_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(DATA_ACHIEVEMENT_NAMES_ES, index, `Recoge ${formatCompactValue(amount)} datos en total`);
    }

    if (id.startsWith("credits_")) {
      const amount = Number(id.replace("credits_", ""));
      const index = getTierIndex(CREDIT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(CREDIT_ACHIEVEMENT_NAMES_ES, index, `Gana ${formatCompactValue(amount)} nodos en total`);
    }

    if (id.startsWith("crypto_")) {
      const amount = Number(id.replace("crypto_", ""));
      const index = getTierIndex(CRYPTO_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(CRYPTO_ACHIEVEMENT_NAMES_ES, index, `Mina ${formatCompactValue(amount)} de cripto`);
    }

    if (id.startsWith("upgrades_")) {
      const amount = Number(id.replace("upgrades_", ""));
      const index = getTierIndex(UPGRADE_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          UPGRADE_ACHIEVEMENT_NAMES_ES,
          index,
          amount === 1 ? "Compra tu primera mejora" : `Compra ${formatCompactValue(amount)} mejoras en total`,
        );
      }
    }

    if (id.startsWith("checkpoints_")) {
      const amount = Number(id.replace("checkpoints_", ""));
      const index = getTierIndex(CHECKPOINT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          CHECKPOINT_ACHIEVEMENT_NAMES_ES,
          index,
          amount === 1 ? "Alcanza tu primer checkpoint" : `Alcanza ${amount} checkpoints`,
        );
      }
    }

    if (id.startsWith("ascend_")) {
      const amount = Number(id.replace("ascend_", ""));
      const index = getTierIndex(ASCEND_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          ASCEND_ACHIEVEMENT_NAMES_ES,
          index,
          amount === 1 ? "Asciende por primera vez" : `Asciende ${amount} veces`,
        );
      }
    }

    if (id.startsWith("pickups_")) {
      const amount = Number(id.replace("pickups_", ""));
      const index = getTierIndex(PICKUP_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(PICKUP_ACHIEVEMENT_NAMES_ES, index, `Recoge ${formatCompactValue(amount)} pickups flotantes`);
    }

    if (id.startsWith("dps_")) {
      const amount = Number(id.replace("dps_", ""));
      const index = getTierIndex(DPS_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(DPS_ACHIEVEMENT_NAMES_ES, index, `Alcanza ${formatCompactValue(amount)} datos por segundo`);
    }

    if (id.startsWith("speed_")) {
      const amount = Number(id.replace("speed_", ""));
      const index = getTierIndex(SPEED_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(SPEED_ACHIEVEMENT_NAMES_ES, index, `Asciende en menos de ${formatAchievementDuration(amount, language)}`);
    }

    if (id.startsWith("playtime_")) {
      const amount = Number(id.replace("playtime_", ""));
      const index = getTierIndex(PLAYTIME_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(PLAYTIME_ACHIEVEMENT_NAMES_ES, index, `Juega durante ${PLAYTIME_DESCRIPTION_LABELS_ES[index]}`);
    }

    if (id.startsWith("cosmetics_")) {
      const amount = Number(id.replace("cosmetics_", ""));
      const index = getTierIndex(COSMETIC_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          COSMETIC_ACHIEVEMENT_NAMES_ES,
          index,
          amount === 1 ? "Compra tu primer cosmetico" : `Compra ${amount} cosmeticos`,
        );
      }
    }
  }

  if (language === "pt-BR") {
    if (id.startsWith("prestige_spent_")) {
      const amount = Number(id.replace("prestige_spent_", ""));
      const index = getTierIndex(PRESTIGE_SPENT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(PRESTIGE_SPENT_ACHIEVEMENT_NAMES_PT, index, `Gaste ${formatCompactValue(amount)} pontos de prestígio`);
    }

    if (id.startsWith("prestige_upgrades_")) {
      const amount = Number(id.replace("prestige_upgrades_", ""));
      const index = getTierIndex(PRESTIGE_UPGRADE_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          PRESTIGE_UPGRADE_ACHIEVEMENT_NAMES_PT,
          index,
          amount === 1 ? "Compre uma melhoria de prestígio" : `Compre ${amount} melhorias de prestígio`,
        );
      }
    }

    if (id.startsWith("crit_pickups_")) {
      const amount = Number(id.replace("crit_pickups_", ""));
      const index = getTierIndex(CRIT_PICKUP_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          CRIT_PICKUP_ACHIEVEMENT_NAMES_PT,
          index,
          amount === 1 ? "Colete seu primeiro pickup crítico" : `Colete ${amount} pickups críticos`,
        );
      }
    }

    if (id.startsWith("clicks_")) {
      const amount = Number(id.replace("clicks_", ""));
      const index = getTierIndex(CLICK_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(CLICK_ACHIEVEMENT_NAMES_PT, index, `Faça ${formatCompactValue(amount)} cliques`);
    }

    if (id.startsWith("crits_")) {
      const amount = Number(id.replace("crits_", ""));
      const index = getTierIndex(CRIT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          CRIT_ACHIEVEMENT_NAMES_PT,
          index,
          amount === 1 ? "Acerte seu primeiro crítico" : `Acerte ${formatCompactValue(amount)} críticos`,
        );
      }
    }

    if (id.startsWith("data_")) {
      const amount = Number(id.replace("data_", ""));
      const index = getTierIndex(DATA_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(DATA_ACHIEVEMENT_NAMES_PT, index, `Colete ${formatCompactValue(amount)} dados no total`);
    }

    if (id.startsWith("credits_")) {
      const amount = Number(id.replace("credits_", ""));
      const index = getTierIndex(CREDIT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(CREDIT_ACHIEVEMENT_NAMES_PT, index, `Ganhe ${formatCompactValue(amount)} Nodes no total`);
    }

    if (id.startsWith("crypto_")) {
      const amount = Number(id.replace("crypto_", ""));
      const index = getTierIndex(CRYPTO_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(CRYPTO_ACHIEVEMENT_NAMES_PT, index, `Mine ${formatCompactValue(amount)} de cripto`);
    }

    if (id.startsWith("upgrades_")) {
      const amount = Number(id.replace("upgrades_", ""));
      const index = getTierIndex(UPGRADE_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          UPGRADE_ACHIEVEMENT_NAMES_PT,
          index,
          amount === 1 ? "Compre sua primeira melhoria" : `Compre ${formatCompactValue(amount)} melhorias no total`,
        );
      }
    }

    if (id.startsWith("checkpoints_")) {
      const amount = Number(id.replace("checkpoints_", ""));
      const index = getTierIndex(CHECKPOINT_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          CHECKPOINT_ACHIEVEMENT_NAMES_PT,
          index,
          amount === 1 ? "Alcance seu primeiro checkpoint" : `Alcance ${amount} checkpoints`,
        );
      }
    }

    if (id.startsWith("ascend_")) {
      const amount = Number(id.replace("ascend_", ""));
      const index = getTierIndex(ASCEND_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          ASCEND_ACHIEVEMENT_NAMES_PT,
          index,
          amount === 1 ? "Ascenda pela primeira vez" : `Ascenda ${amount} vezes`,
        );
      }
    }

    if (id.startsWith("pickups_")) {
      const amount = Number(id.replace("pickups_", ""));
      const index = getTierIndex(PICKUP_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(PICKUP_ACHIEVEMENT_NAMES_PT, index, `Colete ${formatCompactValue(amount)} pickups flutuantes`);
    }

    if (id.startsWith("dps_")) {
      const amount = Number(id.replace("dps_", ""));
      const index = getTierIndex(DPS_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(DPS_ACHIEVEMENT_NAMES_PT, index, `Alcance ${formatCompactValue(amount)} dados por segundo`);
    }

    if (id.startsWith("speed_")) {
      const amount = Number(id.replace("speed_", ""));
      const index = getTierIndex(SPEED_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(SPEED_ACHIEVEMENT_NAMES_PT, index, `Ascenda em menos de ${formatAchievementDuration(amount, language)}`);
    }

    if (id.startsWith("playtime_")) {
      const amount = Number(id.replace("playtime_", ""));
      const index = getTierIndex(PLAYTIME_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) return makeResult(PLAYTIME_ACHIEVEMENT_NAMES_PT, index, `Jogue por ${PLAYTIME_DESCRIPTION_LABELS_PT[index]}`);
    }

    if (id.startsWith("cosmetics_")) {
      const amount = Number(id.replace("cosmetics_", ""));
      const index = getTierIndex(COSMETIC_ACHIEVEMENT_TIERS, amount);
      if (index >= 0) {
        return makeResult(
          COSMETIC_ACHIEVEMENT_NAMES_PT,
          index,
          amount === 1 ? "Compre seu primeiro cosmético" : `Compre ${amount} cosméticos`,
        );
      }
    }

    return null;
  }

  if (id.startsWith("prestige_spent_")) {
    const amount = Number(id.replace("prestige_spent_", ""));
    const index = getTierIndex(PRESTIGE_SPENT_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) return makeResult(PRESTIGE_SPENT_ACHIEVEMENT_NAMES_TR, index, `${formatCompactValue(amount)} prestij puanı harca`);
  }

  if (id.startsWith("prestige_upgrades_")) {
    const amount = Number(id.replace("prestige_upgrades_", ""));
    const index = getTierIndex(PRESTIGE_UPGRADE_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) {
      return makeResult(
        PRESTIGE_UPGRADE_ACHIEVEMENT_NAMES_TR,
        index,
        amount === 1 ? "Bir prestij yükseltmesi satın al" : `${amount} prestij yükseltmesi satın al`,
      );
    }
  }

  if (id.startsWith("crit_pickups_")) {
    const amount = Number(id.replace("crit_pickups_", ""));
    const index = getTierIndex(CRIT_PICKUP_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) {
      return makeResult(
        CRIT_PICKUP_ACHIEVEMENT_NAMES_TR,
        index,
        amount === 1 ? "İlk kritik ödülünü topla" : `${amount} kritik ödül topla`,
      );
    }
  }

  if (id.startsWith("clicks_")) {
    const amount = Number(id.replace("clicks_", ""));
    const index = getTierIndex(CLICK_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) return makeResult(CLICK_ACHIEVEMENT_NAMES_TR, index, `${formatCompactValue(amount)} kez tıkla`);
  }

  if (id.startsWith("crits_")) {
    const amount = Number(id.replace("crits_", ""));
    const index = getTierIndex(CRIT_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) {
      return makeResult(
        CRIT_ACHIEVEMENT_NAMES_TR,
        index,
        amount === 1 ? "İlk kritik vuruşunu yap" : `${formatCompactValue(amount)} kritik vuruş yap`,
      );
    }
  }

  if (id.startsWith("data_")) {
    const amount = Number(id.replace("data_", ""));
    const index = getTierIndex(DATA_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) return makeResult(DATA_ACHIEVEMENT_NAMES_TR, index, `Toplam ${formatCompactValue(amount)} veri topla`);
  }

  if (id.startsWith("credits_")) {
    const amount = Number(id.replace("credits_", ""));
    const index = getTierIndex(CREDIT_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) return makeResult(CREDIT_ACHIEVEMENT_NAMES_TR, index, `Toplam ${formatCompactValue(amount)} dizin kazan`);
  }

  if (id.startsWith("crypto_")) {
    const amount = Number(id.replace("crypto_", ""));
    const index = getTierIndex(CRYPTO_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) return makeResult(CRYPTO_ACHIEVEMENT_NAMES_TR, index, `${formatCompactValue(amount)} kripto kaz`);
  }

  if (id.startsWith("upgrades_")) {
    const amount = Number(id.replace("upgrades_", ""));
    const index = getTierIndex(UPGRADE_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) {
      return makeResult(
        UPGRADE_ACHIEVEMENT_NAMES_TR,
        index,
        amount === 1 ? "İlk yükseltmeni satın al" : `Toplam ${formatCompactValue(amount)} yükseltme satın al`,
      );
    }
  }

  if (id.startsWith("checkpoints_")) {
    const amount = Number(id.replace("checkpoints_", ""));
    const index = getTierIndex(CHECKPOINT_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) {
      return makeResult(
        CHECKPOINT_ACHIEVEMENT_NAMES_TR,
        index,
        amount === 1 ? "İlk eşiğe ulaş" : `${amount} eşiğe ulaş`,
      );
    }
  }

  if (id.startsWith("ascend_")) {
    const amount = Number(id.replace("ascend_", ""));
    const index = getTierIndex(ASCEND_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) {
      return makeResult(
        ASCEND_ACHIEVEMENT_NAMES_TR,
        index,
        amount === 1 ? "İlk kez yüksel" : `${amount} kez yüksel`,
      );
    }
  }

  if (id.startsWith("pickups_")) {
    const amount = Number(id.replace("pickups_", ""));
    const index = getTierIndex(PICKUP_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) return makeResult(PICKUP_ACHIEVEMENT_NAMES_TR, index, `${formatCompactValue(amount)} yüzer ödül topla`);
  }

  if (id.startsWith("dps_")) {
    const amount = Number(id.replace("dps_", ""));
    const index = getTierIndex(DPS_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) return makeResult(DPS_ACHIEVEMENT_NAMES_TR, index, `${formatCompactValue(amount)} veri/sn Üretime ulaş`);
  }

  if (id.startsWith("speed_")) {
    const amount = Number(id.replace("speed_", ""));
    const index = getTierIndex(SPEED_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) return makeResult(SPEED_ACHIEVEMENT_NAMES_TR, index, `${formatAchievementDuration(amount, language)} altında yüksel`);
  }

  if (id.startsWith("playtime_")) {
    const amount = Number(id.replace("playtime_", ""));
    const index = getTierIndex(PLAYTIME_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) return makeResult(PLAYTIME_ACHIEVEMENT_NAMES_TR, index, `${PLAYTIME_DESCRIPTION_LABELS_TR[index]} oyna`);
  }

  if (id.startsWith("cosmetics_")) {
    const amount = Number(id.replace("cosmetics_", ""));
    const index = getTierIndex(COSMETIC_ACHIEVEMENT_TIERS, amount);
    if (index >= 0) {
      return makeResult(
        COSMETIC_ACHIEVEMENT_NAMES_TR,
        index,
        amount === 1 ? "İlk kozmetik eşyanı satın al" : `${amount} kozmetik eşya satın al`,
      );
    }
  }

  return null;
};

export const localizeCatalogEntry = <T extends { id: string; name: string; description: string }>(
  item: T,
  language: Language,
): T => {
  const localized = applyLanguageTextFallbacks({
    ...item,
    ...localizeEntityFields(item, language),
  }, language);
  // v1.03: item stats come from one rarity table, so descriptions that only listed numbers are
  // generated from the item's real boost (keeping any flavor text after " - ").
  const boost = (item as { boost?: BoostValues }).boost;
  if (boost && /^[+-]\d/.test(item.description)) {
    const lines = getBoostLines(boost, language);
    const flavorIndex = localized.description.indexOf(" - ");
    const flavor = flavorIndex >= 0 ? localized.description.slice(flavorIndex + 3) : "";
    return { ...localized, description: [lines.join(", "), flavor].filter(Boolean).join(" - ") };
  }
  return localized;
};

export const localizeOptionalCatalogEntry = <T extends { id: string; name: string; description: string }>(
  item: T | null,
  language: Language,
): T | null => (item ? localizeCatalogEntry(item, language) : null);

export const localizeTitledEntry = <T extends { id: string; name: string; title: string }>(
  item: T,
  language: Language,
): T => applyLanguageTextFallbacks({
  ...item,
  ...localizeEntityFields(item, language),
}, language);

export const localizeAchievementText = <T extends { id: string; name: string; description: string }>(
  achievement: T,
  language: Language,
): T => {
  if (language === "zh-CN") {
    const own = SECRET_ACHIEVEMENT_TEXTS[achievement.id];
    if (own && typeof own.name !== "string" && own.name?.["zh-CN"]) {
      return { ...achievement, name: localizeText(own.name, language), description: localizeText(own.description || achievement.description, language) };
    }
    return {
      ...achievement,
      name: getSimplifiedChineseTextFallback(achievement.name) ?? achievement.name,
      description: getSimplifiedChineseTextFallback(achievement.description) ?? achievement.description,
    };
  }
  const translated = getAchievementTranslation(achievement.id, language);
  if (!translated) return achievement;
  return {
    ...achievement,
    name: translated.name,
    description: translated.description,
  };
};

export const localizeContractText = <T extends { objectiveType: string; targetAmount: number; title: string; description: string }>(
  contract: T,
  language: Language,
): T => {
  if (language === "en") return contract;
  if (language === "zh-CN") {
    const amount = formatCompactValue(Math.floor(contract.targetAmount));
    let description = contract.description;

    switch (contract.objectiveType) {
      case "sell_data":
        description = `出售 ${amount} 数据并转换为节点`;
        break;
      case "collect_pickups":
        description = `收集 ${amount} 个浮动奖励`;
        break;
      case "spend_credits":
        description = `在升级上花费 ${amount} 节点`;
        break;
      case "reach_production":
        description = `达到每秒 ${amount} 数据产出`;
        break;
      case "rapid_clicks":
        description = `点击 ${amount} 次`;
        break;
      case "crit_streak":
        description = `打出 ${amount} 次暴击`;
        break;
      case "upgrade_single":
        description = `购买 ${amount} 次升级`;
        break;
      case "maintain_resources":
        description = `保持 ${amount}+ 数据`;
        break;
      default:
        description = getSimplifiedChineseTextFallback(contract.description) ?? contract.description;
        break;
    }

    return {
      ...contract,
      title: getSimplifiedChineseTextFallback(contract.title) ?? contract.title,
      description,
    };
  }

  const amount = formatCompactValue(Math.floor(contract.targetAmount));
  const title = localizeText(CONTRACT_TITLE_TEXTS[contract.objectiveType] ?? contract.title, language);
  let description = contract.description;

  if (language === "ru") {
    switch (contract.objectiveType) {
      case "sell_data":
        description = `Продайте ${amount} данных и конвертируйте их в узлы`;
        break;
      case "collect_pickups":
        description = `Соберите ${amount} парящих бонусов`;
        break;
      case "spend_credits":
        description = `Потратьте ${amount} узлов на улучшения`;
        break;
      case "reach_production":
        description = `Достигните ${amount} данных/с`;
        break;
      case "rapid_clicks":
        description = `Сделайте ${amount} кликов`;
        break;
      case "crit_streak":
        description = `Нанесите ${amount} критических ударов`;
        break;
      case "upgrade_single":
        description = `Купите ${amount} улучшений`;
        break;
      case "maintain_resources":
        description = `Удерживайте ${amount}+ данных`;
        break;
      default:
        description = getRussianTextFallback(contract.description) ?? contract.description;
        break;
    }

    return {
      ...contract,
      title,
      description,
    };
  }

  if (language === "es") {
    switch (contract.objectiveType) {
      case "sell_data":
        description = `Vende ${amount} Datos y conviértelos en Nodos`;
        break;
      case "collect_pickups":
        description = `Recoge ${amount} pickups flotantes`;
        break;
      case "spend_credits":
        description = `Gasta ${amount} Nodos en mejoras`;
        break;
      case "reach_production":
        description = `Alcanza ${amount} Datos/s`;
        break;
      case "rapid_clicks":
        description = `Haz ${amount} clics`;
        break;
      case "crit_streak":
        description = `Consigue ${amount} golpes críticos`;
        break;
      case "upgrade_single":
        description = `Compra ${amount} mejoras`;
        break;
      case "maintain_resources":
        description = `Mantén ${amount}+ Datos`;
        break;
      default:
        break;
    }

    return {
      ...contract,
      title,
      description,
    };
  }

  if (language === "pt-BR") {
    switch (contract.objectiveType) {
      case "sell_data":
        description = `Venda ${amount} Dados e converta em Nodes`;
        break;
      case "collect_pickups":
        description = `Colete ${amount} pickups flutuantes`;
        break;
      case "spend_credits":
        description = `Gaste ${amount} Nodes em melhorias`;
        break;
      case "reach_production":
        description = `Alcance ${amount} Dados/s`;
        break;
      case "rapid_clicks":
        description = `Clique ${amount} vezes`;
        break;
      case "crit_streak":
        description = `Acerte ${amount} críticos`;
        break;
      case "upgrade_single":
        description = `Compre ${amount} melhorias`;
        break;
      case "maintain_resources":
        description = `Tenha ${amount}+ Dados`;
        break;
      default:
        break;
    }

    return {
      ...contract,
      title: CONTRACT_TITLE_TEXTS_PT[contract.objectiveType] ?? title,
      description,
    };
  }

  switch (contract.objectiveType) {
    case "sell_data":
      description = `${amount} Veri sat ve dizine çevir`;
      break;
    case "collect_pickups":
      description = `${amount} yüzer ödül topla`;
      break;
    case "spend_credits":
      description = `Yükseltmelere ${amount} Dizin harca`;
      break;
    case "reach_production":
      description = `${amount} Veri/sn Üretime ulaş`;
      break;
    case "rapid_clicks":
      description = `${amount} kez tıkla`;
      break;
    case "crit_streak":
      description = `${amount} kritik vuruş yap`;
      break;
    case "upgrade_single":
      description = `${amount} yükseltme satın al`;
      break;
    case "maintain_resources":
      description = `${amount}+ Veri bulundur`;
      break;
    default:
      break;
  }

  return {
    ...contract,
    title,
    description,
  };
};

export const getRarityLabel = (rarity: string, language: Language): string => {
  return localizeText(RARITY_LABELS[rarity] ?? rarity, language);
};

export const getLootTypeLabel = (type: string, language: Language): string => {
  return localizeText(LOOT_TYPE_LABELS[type] ?? type, language);
};

export const getTutorialRewardTypeLabel = (type: string, language: Language): string => {
  return localizeText(TUTORIAL_REWARD_TYPE_LABELS[type] ?? type, language);
};

export const getRelicSlotLabel = (slot: string, language: Language): string => {
  return localizeText(RELIC_SLOT_LABELS[slot] ?? slot, language);
};

export const getCurrencyLabel = (currency: string, language: Language): string => {
  return localizeText(CURRENCY_LABELS[currency] ?? currency, language);
};

export const getBoostLines = (
  boost: BoostValues | undefined,
  language: Language,
  variant: "full" | "compact" = "full",
): string[] => {
  if (!boost) return [];

  const labels = variant === "compact" ? COMPACT_BOOST_LABELS : FULL_BOOST_LABELS;
  const entries: Array<keyof BoostValues> = [
    "productionBoost",
    "clickBoost",
    "critBoost",
    "cryptoBoost",
    "critDamageBoost",
    "luckBoost",
  ];

  return entries
    .filter((key) => boost[key])
    .map((key) => `+${boost[key]}% ${localizeText(labels[key], language)}`);
};

export const getParagonEffectLabel = (effectType: string, language: Language): string => {
  return localizeText(PARAGON_EFFECT_LABELS[effectType] ?? effectType, language);
};
