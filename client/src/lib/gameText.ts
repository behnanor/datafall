import { localizeText, type Language, type LocalizedText } from "./i18n";

type TextEntry = {
  name: LocalizedText;
  description: LocalizedText;
};

const UPGRADE_TEXTS: Record<string, TextEntry> = {
  unlock_click_upgrades: {
    name: { en: "Manual Intrusion Protocol", tr: "Manuel Sızma Protokolü", "pt-BR": "Protocolo de Intrusão Manual", es: "Protocolo de Intrusión Manual" },
    description: { en: "Unlock direct manual execution methods.", tr: "Doğrudan manuel çalıştırma yöntemlerini açar.", "pt-BR": "Desbloqueia métodos de execução manual direta.", es: "Desbloquea métodos directos de ejecución manual." },
  },
  data_miner_v1: {
    name: { en: "Basic Data Miner", tr: "Temel Veri Madencisi", "pt-BR": "Minerador Básico de Dados", es: "Minero Básico de Datos" },
    description: { en: "Simple script to mine Data automatically.", tr: "Veriyi otomatik kazanmak için basit bir betik.", "pt-BR": "Script simples para minerar Dados automaticamente.", es: "Script simple para minar Datos automáticamente." },
  },
  data_miner_v2: {
    name: { en: "Advanced Data Miner", tr: "Gelişmiş Veri Madencisi", "pt-BR": "Minerador Avançado de Dados", es: "Minero Avanzado de Datos" },
    description: { en: "Optimized algorithms for faster Data mining.", tr: "Daha hızlı veri madenciliği için optimize algoritmalar.", "pt-BR": "Algoritmos otimizados para mineração de Dados mais rápida.", es: "Algoritmos optimizados para una minería de Datos más rápida." },
  },
  botnet_node: {
    name: { en: "Botnet Cluster", tr: "Botnet Kümesi", "pt-BR": "Cluster de Botnet", es: "Clúster de Botnet" },
    description: { en: "Infects vulnerable devices to mine Data en masse.", tr: "Zayıf cihazları enfekte ederek toplu veri çıkarır.", "pt-BR": "Infecta dispositivos vulneráveis para minerar Dados em massa.", es: "Infecta dispositivos vulnerables para minar Datos en masa." },
  },
  quantum_server: {
    name: { en: "Quantum Server", tr: "Kuantum Sunucusu", "pt-BR": "Servidor Quântico", es: "Servidor Cuántico" },
    description: { en: "Leverages quantum superposition for massive Data yields.", tr: "Devasa veri üretimi için kuantum süperpozisyonundan yararlanır.", "pt-BR": "Usa superposição quântica para gerar enormes quantidades de Dados.", es: "Aprovecha la superposición cuántica para generar enormes cantidades de Datos." },
  },
  ai_core: {
    name: { en: "AI Core", tr: "YZ Çekirdeği", "pt-BR": "Núcleo de IA", es: "Núcleo de IA" },
    description: { en: "Self-improving AI that generates Data at an exponential rate.", tr: "Veriyi üssel hızda üreten, kendi kendini geliştiren yapay zekâ.", "pt-BR": "IA autoevolutiva que gera Dados em ritmo exponencial.", es: "IA autoevolutiva que genera Datos a un ritmo exponencial." },
  },
  neural_network: {
    name: { en: "Global Neural Network", tr: "Küresel Nöral Ağ", "pt-BR": "Rede Neural Global", es: "Red Neural Global" },
    description: { en: "Connects the entire planet to your Data processing grid.", tr: "Tüm gezegeni veri işleme ağına bağlar.", "pt-BR": "Conecta o planeta inteiro a sua grade de processamento de Dados.", es: "Conecta todo el planeta a tu red de procesamiento de Datos." },
  },
  overclock_core: {
    name: { en: "Overclocked Core", tr: "Hız Aşırtılmış Çekirdek", "pt-BR": "Núcleo Overclockado", es: "Núcleo Overclockeado" },
    description: { en: "A singularity core pushed far past its safety limits.", tr: "Güvenlik sınırlarının çok ötesine zorlanmış bir tekillik çekirdeği.", "pt-BR": "Um núcleo de singularidade levado muito além dos limites.", es: "Un núcleo de singularidad llevado mucho más allá de sus límites." },
  },
  overclock_rig: {
    name: { en: "Overclocked Rig", tr: "Hız Aşırtılmış Rig", "pt-BR": "Rig Overclockado", es: "Rig Overclockeado" },
    description: { en: "Liquid-cooled mining array running far beyond spec.", tr: "Sınırlarının çok ötesinde çalışan sıvı soğutmalı madencilik dizisi.", "pt-BR": "Matriz de mineração com refrigeração líquida, muito além da especificação.", es: "Matriz de minería con refrigeración líquida, muy por encima de su especificación." },
  },
  singularity_nexus: {
    name: { en: "Singularity Nexus", tr: "Tekillik Merkezi", "pt-BR": "Nexus da Singularidade", es: "Nexo de la Singularidad" },
    description: { en: "Transcends reality itself. Infinite computational recursion.", tr: "Gerçekliğin ötesine geçer. Sonsuz hesaplama özyinelemesi.", "pt-BR": "Transcende a própria realidade. Recursão computacional infinita.", es: "Trasciende la propia realidad. Recursión computacional infinita." },
  },
  unlock_crypto_mining: {
    name: { en: "Mining Protocol Access", tr: "Madencilik Protokolü Erişimi", "pt-BR": "Acesso ao Protocolo de Mineração", es: "Acceso al Protocolo de Minería" },
    description: { en: "Establish connection to decentralized mining networks.", tr: "Merkezsiz madencilik ağlarına bağlantı kurar.", "pt-BR": "Estabelece conexão com redes de mineração descentralizadas.", es: "Establece conexion con redes de minería descentralizadas." },
  },
  manual_override: {
    name: { en: "Manual Override", tr: "Manuel Geçersiz Kılma", "pt-BR": "Sobrescrita Manual", es: "Anulación Manual" },
    description: { en: "Increases base click value by 1.", tr: "Temel tıklama değerini 1 artırır.", "pt-BR": "Aumenta o valor base do clique em 1.", es: "Aumenta el valor base del clic en 1." },
  },
  zero_day: {
    name: { en: "Zero-Day Payload", tr: "Zero-Day Yükleme", "pt-BR": "Carga Zero-Day", es: "Carga Zero-Day" },
    description: { en: "Increases chance to find critical vulnerabilities (+0.5% per level).", tr: "Kritik açık bulma şansını artırır (seviye başına +0.5%).", "pt-BR": "Aumenta a chance de encontrar vulnerabilidades críticas (+0.5% por nível).", es: "Aumenta la probabilidad de encontrar vulnerabilidades críticas (+0.5% por nivel)." },
  },
  exploit_finder: {
    name: { en: "Exploit Finder", tr: "Açık Avcısı", "pt-BR": "Localizador de Exploits", es: "Buscador de Exploits" },
    description: { en: "Increases critical hit damage multiplier.", tr: "Kritik vuruş hasar çarpanını artırır.", "pt-BR": "Aumenta o multiplicador de dano crítico.", es: "Aumenta el multiplicador de daño crítico." },
  },
  crypto_rig_basic: {
    name: { en: "Basic Mining Rig", tr: "Temel Madencilik Düzeni", "pt-BR": "Rig Básica de Mineração", es: "Rig Básico de Minería" },
    description: { en: "A simple crypto mining setup. Generates crypto passively.", tr: "Basit bir kripto madencilik düzeni. Pasif kripto üretir.", "pt-BR": "Configuração simples de mineração de cripto. Gera cripto passivamente.", es: "Configuración simple de minería de cripto. Genera cripto de forma pasiva." },
  },
  crypto_rig_advanced: {
    name: { en: "Advanced Mining Rig", tr: "Gelişmiş Madencilik Düzeni", "pt-BR": "Rig Avançada de Mineração", es: "Rig Avanzado de Minería" },
    description: { en: "High-performance mining hardware for faster crypto generation.", tr: "Daha hızlı kripto üretimi için yüksek performanslı donanım.", "pt-BR": "Hardware de alta performance para gerar cripto mais rápido.", es: "Hardware de alto rendimiento para generar cripto más rápido." },
  },
  crypto_farm: {
    name: { en: "Crypto Farm", tr: "Kripto Çiftliği", "pt-BR": "Fazenda de Cripto", es: "Granja de Cripto" },
    description: { en: "Industrial-scale crypto mining operation.", tr: "Endüstriyel ölçekte kripto madenciliği operasyonu.", "pt-BR": "Operação de mineração de cripto em escala industrial.", es: "Operación de minería de cripto a escala industrial." },
  },
  quantum_miner: {
    name: { en: "Quantum Miner", tr: "Kuantum Madencisi", "pt-BR": "Minerador Quântico", es: "Minero Cuántico" },
    description: { en: "Quantum computing applied to blockchain algorithms.", tr: "Blokzincir algoritmalarına uygulanan kuantum hesaplama.", "pt-BR": "Computação quântica aplicada a algoritmos de blockchain.", es: "Computación cuántica aplicada a algoritmos de blockchain." },
  },
  mining_datacenter: {
    name: { en: "Mining Datacenter", tr: "Madencilik Veri Merkezi", "pt-BR": "Datacenter de Mineração", es: "Datacenter de Minería" },
    description: { en: "Massive facility dedicated to crypto extraction.", tr: "Kripto çıkarmaya adanmış dev tesis.", "pt-BR": "Instalação massiva dedicada à extração de cripto.", es: "Instalación masiva dedicada a la extracción de cripto." },
  },
};

const PRESTIGE_UPGRADE_TEXTS: Record<string, TextEntry> = {
  p_click: {
    name: { en: "Eternal Strike", tr: "Ebedi Darbe", "pt-BR": "Golpe Eterno", es: "Golpe Eterno" },
    description: { en: "+5% click power per level.", tr: "Seviye başına +5% tıklama gücü.", "pt-BR": "+5% de poder de clique por nível.", es: "+5% de poder de clic por nivel." },
  },
  p_prod: {
    name: { en: "Legacy Production", tr: "Miras Üretim", "pt-BR": "Produção Legada", es: "Producción Legada" },
    description: { en: "+10% production per level.", tr: "Seviye başına +10% üretim.", "pt-BR": "+10% de produção por nível.", es: "+10% de producción por nivel." },
  },
  p_starting: {
    name: { en: "Head Start", tr: "Önde Başlangıç", "pt-BR": "Largada Inicial", es: "Ventaja Inicial" },
    description: { en: "Start each run with 1 minute of your last run's data production per level.", tr: "Her tura, seviye başına önceki turun 1 dakikalık veri üretimiyle başla.", "pt-BR": "Comece cada run com 1 minuto da produção de dados da run anterior por nível.", es: "Empieza cada partida con 1 minuto de la producción de datos de la anterior por nivel." },
  },
  p_crit: {
    name: { en: "Cursed Fate", tr: "Lanetli Kader", "pt-BR": "Destino Amaldiçoado", es: "Destino Maldito" },
    description: { en: "+0.5% crit chance per level.", tr: "Seviye başına +0.5% kritik şansı.", "pt-BR": "+0.5% de chance crítica por nível.", es: "+0.5% de prob. crítica por nivel." },
  },
  p_crit_mult: {
    name: { en: "Lethal Precision", tr: "Ölümcül Hassasiyet", "pt-BR": "Precisão Letal", es: "Precisión Letal" },
    description: { en: "+8% crit damage per level.", tr: "Seviye başına +8% kritik hasarı.", "pt-BR": "+8% de dano crítico por nível.", es: "+8% de daño crítico por nivel." },
  },
  p_luck: {
    name: { en: "Fortune Protocol", tr: "Talih Protokolü", "pt-BR": "Protocolo da Fortuna", es: "Protocolo de Fortuna" },
    description: { en: "+3% chance per level that a click drops a pickup.", tr: "Seviye başına tıklamanın toplanabilir düşürme şansı +3%.", "pt-BR": "+3% de chance por nível de um clique soltar um item.", es: "+3% de prob. por nivel de que un clic suelte un objeto." },
  },
  p_pickup: {
    name: { en: "Scavenger Network", tr: "Toplayıcı Ağ", "pt-BR": "Rede de Coleta", es: "Red de Recolección" },
    description: { en: "+10% pickup value per level.", tr: "Seviye başına +10% toplama değeri.", "pt-BR": "+10% de valor dos pickups por nível.", es: "+10% de valor de pickups por nivel." },
  },
  p_signal: {
    name: { en: "Signal Amplifier", tr: "Sinyal Yükseltici", "pt-BR": "Amplificador de Sinal", es: "Amplificador de Senal" },
    description: { en: "+7% floating pickup spawn rate per level.", tr: "Seviye başına +7% havada beliren ödül hızı.", "pt-BR": "+7% de taxa de surgimento de pickups por nível.", es: "+7% de aparición de pickups flotantes por nivel." },
  },
  p_timewarp_chance: {
    name: { en: "Temporal Hook", tr: "Zamansal Kanca", "pt-BR": "Gancho Temporal", es: "Gancho Temporal" },
    description: { en: "+2.5% Time Warp trigger chance per level.", tr: "Seviye başına +2.5% Time Warp tetikleme şansı.", "pt-BR": "+2.5% de chance de ativar Time Warp por nível.", es: "+2.5% de prob. de activar Time Warp por nivel." },
  },
  p_timewarp_power: {
    name: { en: "Chrono Compression", tr: "Krono Sıkıştırma", "pt-BR": "Compressão Crono", es: "Compresión Crono" },
    description: { en: "+90s production burst per Time Warp trigger.", tr: "Her Time Warp tetiğinde +90 sn üretim patlaması.", "pt-BR": "+90s de explosão de produção por ativação de Time Warp.", es: "+90 s de explosión de producción por activación de Time Warp." },
  },
  p_timewarp_sync: {
    name: { en: "Phase Lock", tr: "Faz Kilidi", "pt-BR": "Travamento de Fase", es: "Bloqueo de Fase" },
    description: { en: "-6s Time Warp cooldown per level (min 30s).", tr: "Seviye başına -6 sn Time Warp bekleme süresi (min 30 sn).", "pt-BR": "-6s de recarga do Time Warp por nível (min 30s).", es: "-6 s de recarga de Time Warp por nivel (min 30 s)." },
  },
  p_sell: {
    name: { en: "Market Arbitrage", tr: "Piyasa Arbitrajı", "pt-BR": "Arbitragem de Mercado", es: "Arbitraje de Mercado" },
    description: { en: "+4% more Nodes when selling data, per level.", tr: "Veri satarken seviye başına +4% daha fazla Dizin.", "pt-BR": "+4% mais Nodes ao vender dados, por nível.", es: "+4% más Nodos al vender datos, por nivel." },
  },
  p_prestige: {
    name: { en: "Ascension Catalyst", tr: "Yükseliş Katalizörü", "pt-BR": "Catalisador de Ascensão", es: "Catalizador de Ascensión" },
    description: { en: "+4% prestige gain per level.", tr: "Seviye başına +4% prestij kazancı.", "pt-BR": "+4% de ganho de prestígio por nível.", es: "+4% de ganancia de prestígio por nivel." },
  },
  p_offline: {
    name: { en: "Passive Matrix", tr: "Pasif Matris", "pt-BR": "Matriz Passiva", es: "Matriz Pasiva" },
    description: { en: "+5% offline earnings per level.", tr: "Seviye başına +5% çevrimdışı kazanç.", "pt-BR": "+5% de ganhos offline por nível.", es: "+5% de ganancias offline por nivel." },
  },
  p_crypto: {
    name: { en: "Chain Singularity", tr: "Zincir Tekilliği", "pt-BR": "Singularidade da Cadeia", es: "Singularidad de la Cadena" },
    description: { en: "+12% crypto production per level.", tr: "Seviye başına +12% kripto üretimi.", "pt-BR": "+12% de produção de cripto por nível.", es: "+12% de producción de cripto por nivel." },
  },
  p_mega_prod: {
    name: { en: "Quantum Forge", tr: "Kuantum Dökümhanesi", "pt-BR": "Forja Quântica", es: "Forja Cuántica" },
    description: { en: "+15% all production per level.", tr: "Seviye başına +15% tüm üretim.", "pt-BR": "+15% de toda a produção por nível.", es: "+15% de toda la producción por nivel." },
  },
  p_mega_crit: {
    name: { en: "Fatal Algorithm", tr: "Ölümcül Algoritma", "pt-BR": "Algoritmo Fatal", es: "Algoritmo Fatal" },
    description: { en: "+25% crit damage per level.", tr: "Seviye başına +25% kritik hasarı.", "pt-BR": "+25% de dano crítico por nível.", es: "+25% de daño crítico por nivel." },
  },
  p_mega_prestige: {
    name: { en: "Transcendence Core", tr: "Aşkınlık Çekirdeği", "pt-BR": "Núcleo da Transcendencia", es: "Núcleo de la Trascendencia" },
    description: { en: "+10% prestige gain per level.", tr: "Seviye başına +10% prestij kazancı.", "pt-BR": "+10% de ganho de prestígio por nível.", es: "+10% de ganancia de prestígio por nivel." },
  },
  p_offline_window: {
    name: { en: "Chrono Vault", tr: "Krono Kasası", "pt-BR": "Cofre Crono", es: "Boveda Crono" },
    description: { en: "+1.2h max offline progression per level.", tr: "Seviye başına +1.2 sa maksimum çevrimdışı ilerleme.", "pt-BR": "+1.2h de progresso offline máximo por nível.", es: "+1.2 h de progreso offline máximo por nivel." },
  },
};

const TUTORIAL_PHASE_TEXTS: Array<{ title: LocalizedText; description: LocalizedText }> = [
  {
    title: { en: "Boot Sequence", tr: "Başlangıç Dizisi", "pt-BR": "Sequência de Inicialização", es: "Secuencia de Arranque" },
    description: { en: "Learn click controls, camera zoom, and camera pan.", tr: "Tıklama kontrollerini, kamera yakınlaştırmayı ve kaydırmayı öğren.", "pt-BR": "Aprenda os controles de clique, zoom e movimento da câmera.", es: "Aprende los controles de clic, zoom y movimiento de camara." },
  },
  {
    title: { en: "Expansion", tr: "Genişleme", "pt-BR": "Expansão", es: "Expansión" },
    description: { en: "Buy your first upgrade and convert data into nodes.", tr: "İlk yükseltmeni al ve veriyi dizine dönüştür.", "pt-BR": "Compre sua primeira melhoria e converta dados em Nodes.", es: "Compra tu primera mejora y convierte datos en nodos." },
  },
  {
    title: { en: "Prestige", tr: "Prestij", "pt-BR": "Prestígio", es: "Prestígio" },
    description: { en: "Open the Prestige Shop to review long-run progression.", tr: "Uzun vadeli ilerlemeyi incelemek için Prestij Dükkânı'nı aç.", "pt-BR": "Abra a Loja de Prestígio para revisar o progresso de longo prazo.", es: "Abre la Tienda de Prestígio para revisar la progresión a largo plazo." },
  },
  {
    title: { en: "Cosmetics", tr: "Kozmetikler", "pt-BR": "Cosméticos", es: "Cosméticos" },
    description: { en: "Open the Cosmetics Market to explore customization.", tr: "Özelleştirmeleri görmek için Kozmetik Pazarı'nı aç.", "pt-BR": "Abra o Mercado Cosmético para explorar personalizações.", es: "Abre el Mercado Cosmético para explorar personalizaciones." },
  },
  {
    title: { en: "Mining", tr: "Madencilik", "pt-BR": "Mineração", es: "Minería" },
    description: { en: "Unlock the Mining segment and start earning crypto.", tr: "Madencilik bölümünün kilidini aç ve kripto kazanmaya başla.", "pt-BR": "Desbloqueie a aba de Mineração e comece a ganhar cripto.", es: "Desbloquea la sección de Minería y empieza a ganar cripto." },
  },
  {
    title: { en: "Ascension", tr: "Yükseliş", "pt-BR": "Ascensão", es: "Ascensión" },
    description: {
      en: "Open the Ascend window and review what will reset.\nTip: You can collapse or expand this panel with the arrow button.",
      tr: "Yükseliş penceresini aç ve nelerin sıfırlanacağını incele.\nİpucu: Bu paneli ok tuşuyla daraltıp genişletebilirsin.",
      "pt-BR": "Abra a janela de Ascensão e revise o que será resetado.\nDica: Você pode recolher ou expandir este painel pelo botão de seta.",
      es: "Abre la ventana de Ascensión y revisa que se reiniciara.\nConsejo: puedes contraer o expandir este panel con el boton de flecha.",
    },
  },
];

const TUTORIAL_OBJECTIVE_TEXTS: Record<string, LocalizedText> = {
  click_core: { en: "Click to generate your first resources.", tr: "İlk kaynaklarını üretmek için tıkla.", "pt-BR": "Clique para gerar seus primeiros recursos.", es: "Haz clic para generar tus primeros recursos." },
  right_click_core: { en: "Right-click also works. Try a right-click on the core.", tr: "Sağ tık da çalışır. Çekirdeğin üstünde bir kez sağ tık dene.", "pt-BR": "Clique com o botão direito também funciona. Teste no núcleo.", es: "El clic derecho también funciona. Pruebalo sobre el núcleo." },
  camera_zoom: { en: "Use the mouse wheel (middle scroll) to zoom the camera.", tr: "Kamerayı yakınlaştırmak için fare tekerini kullan.", "pt-BR": "Use a roda do mouse para dar zoom na câmera.", es: "Usa la rueda del raton para acercar la camara." },
  camera_pan: { en: "Hold middle mouse button and drag to move the camera.", tr: "Kamerayı hareket ettirmek için orta tuşa basılı tutup sürükle.", "pt-BR": "Segure o botão do meio e arraste para mover a câmera.", es: "Mantén pulsado el boton central y arrastra para mover la camara." },
  buy_first_upgrade: { en: "Buy your first upgrade.", tr: "İlk yükseltmeni satın al.", "pt-BR": "Compre sua primeira melhoria.", es: "Compra tu primera mejora." },
  convert_data: { en: "Convert data into nodes using the Convert controls. (100 Data = 1 Node)", tr: "Dönüştür kontrollerini kullanarak veriyi dizine çevir. (100 Veri = 1 Dizin)", "pt-BR": "Converta dados em Nodes usando os controles de Conversão. (100 Dados = 1 Node)", es: "Convierte datos en nodos usando los controles de Conversión. (100 Datos = 1 Nodo)" },
  view_prestige: { en: "Open the Prestige Shop.", tr: "Prestij Dükkânı'nı aç.", "pt-BR": "Abra a Loja de Prestígio.", es: "Abre la Tienda de Prestígio." },
  open_cosmetics: { en: "Open the Cosmetics Market.", tr: "Kozmetik Pazarı'nı aç.", "pt-BR": "Abra o Mercado Cosmético.", es: "Abre el Mercado Cosmético." },
  open_mining_tab: { en: "Open the Mining segment in Upgrades (unlock it via Mining Protocol Access in Click segment).", tr: "Yükseltmeler içinde Madencilik bölümünü aç (Tıklama bölümündeki Madencilik Protokolü Erişimi ile kilidi aç).", "pt-BR": "Abra a aba de Mineração em Melhorias (desbloqueie por Acesso ao Protocolo de Mineração na aba de Clique).", es: "Abre la pestana de Minería en Mejoras (desbloqueala mediante Acceso al Protocolo de Minería en la pestana de Clic)." },
  earn_crypto: { en: "Start earning crypto from Mining upgrades.", tr: "Madencilik yükseltmelerinden kripto kazanmaya başla.", "pt-BR": "Comece a ganhar cripto com as melhorias de Mineração.", es: "Empieza a ganar cripto con las mejoras de Minería." },
  open_ascend: { en: "Open the Ascend window.", tr: "Yükseliş penceresini aç.", "pt-BR": "Abra a janela de Ascensão.", es: "Abre la ventana de Ascensión." },
};

const RESOURCE_LABELS: Record<string, LocalizedText> = {
  credits: { en: "nodes", tr: "dizin", "pt-BR": "Nodes", es: "nodos" },
  data: { en: "data", tr: "veri", "pt-BR": "dados", es: "datos" },
  crypto: { en: "crypto", tr: "kripto", "pt-BR": "cripto", es: "cripto" },
  silicon: { en: "silicon", tr: "silikon", "pt-BR": "silício", es: "silicio" },
  prestige: { en: "prestige", tr: "prestij", "pt-BR": "prestígio", es: "prestigio" },
};

const UPGRADE_CATEGORY_LABELS: Record<string, LocalizedText> = {
  fabrication: { en: "Factory", tr: "Üretim", "pt-BR": "Produção", es: "Producción" },
  click_upgrades: { en: "Click", tr: "Tıklama", "pt-BR": "Clique", es: "Clic" },
  crypto_mining: { en: "Mining", tr: "Madencilik", "pt-BR": "Mineração", es: "Minería" },
  contracts: { en: "Jobs", tr: "Görevler", "pt-BR": "Contratos", es: "Contratos" },
};

const getLocalizedEntry = (entry: TextEntry | undefined, language: Language) => {
  if (!entry) return null;
  return {
    name: localizeText(entry.name, language),
    description: localizeText(entry.description, language),
  };
};

export const localizeUpgradeText = <T extends { id: string; name: string; description: string }>(
  upgrade: T,
  language: Language,
): T => {
  const localized = getLocalizedEntry(UPGRADE_TEXTS[upgrade.id], language);
  if (!localized) return upgrade;
  return {
    ...upgrade,
    name: localized.name,
    description: localized.description,
  };
};

export const localizePrestigeUpgradeText = <T extends { id: string; name: string; description: string }>(
  upgrade: T,
  language: Language,
): T => {
  const localized = getLocalizedEntry(PRESTIGE_UPGRADE_TEXTS[upgrade.id], language);
  if (!localized) return upgrade;
  return {
    ...upgrade,
    name: localized.name,
    description: localized.description,
  };
};

export const getLocalizedTutorialPhaseText = (
  phaseIndex: number,
  fallback: { title: string; description: string },
  language: Language,
) => {
  const phase = TUTORIAL_PHASE_TEXTS[phaseIndex];
  if (!phase) return fallback;

  return {
    title: localizeText(phase.title, language),
    description: localizeText(phase.description, language),
  };
};

export const getLocalizedTutorialObjectiveText = (
  objectiveId: string,
  fallback: string,
  language: Language,
): string => {
  return localizeText(TUTORIAL_OBJECTIVE_TEXTS[objectiveId] ?? fallback, language);
};

export const getResourceLabel = (resource: string, language: Language): string => {
  return localizeText(RESOURCE_LABELS[resource] ?? resource, language);
};

export const getUpgradeCategoryLabel = (category: string, language: Language): string => {
  return localizeText(UPGRADE_CATEGORY_LABELS[category] ?? category, language);
};
