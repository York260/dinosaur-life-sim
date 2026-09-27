import { GameEvent, GameAction, GameState } from './types';
import { getAgeStage } from './species';
import { EventTemplate, meetsRequirement } from './eventTypes';
import { EXTRA_EVENTS } from './eventsExtra';

// ========== 事件模板 ==========

const JUVENILE_EVENTS: EventTemplate[] = [
  {
    id: 'juv_nest',
    narratives: [
      '清晨的森林裡瀰漫著薄霧，你在母親的巢穴附近探險，發現了一片新的覓食區域。',
      '一場暴雨剛過，地面濕滑泥濘，空氣中充滿了泥土和植物的氣息。',
      '遠處傳來了奇怪的吼叫聲，是另一群恐龍正在遷徙。',
    ],
    stages: ['juvenile'],
    mainActions: [
      {
        id: 'explore_nest',
        label: '探索巢穴附近',
        description: '在安全的區域覓食和學習生存技巧',
        primaryStat: 'int',
        dc: 8,
        successResult: {
          narrative: '你找到了一些食物，也學會了辨認危險的氣味。',
          hpChange: 0, hungerChange: 20, hydrationChange: 10,
          statChanges: { int: 1 },
        },
        failureResult: {
          narrative: '你迷了路，費了好大力氣才找回巢穴。',
          hpChange: -5, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'play_fight',
        label: '與同伴嬉戲打鬥',
        description: '與其他幼龍練習戰鬥技巧',
        primaryStat: 'str',
        dc: 10,
        successResult: {
          narrative: '你在打鬥中展現了天賦，力量增長了！',
          hpChange: 0, hungerChange: 10, hydrationChange: 5,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '你被同伴壓制了，但也從中學到了經驗。',
          hpChange: -5, hungerChange: 5, hydrationChange: 5,
        },
        resourceCost: { hunger: 8, hydration: 5 },
      },
      {
        id: 'hide_observe',
        tags: ['study'],
        label: '躲藏觀察',
        description: '安靜地觀察周圍環境，學習生存之道',
        primaryStat: 'agi',
        dc: 7,
        successResult: {
          knowledge: 1,
          narrative: '你發現了一條隱蔽的水源路線，收穫滿滿。',
          hpChange: 5, hungerChange: 10, hydrationChange: 25,
          statChanges: { agi: 1 },
        },
        failureResult: {
          narrative: '你不小心驚動了一隻路過的大型恐龍，嚇得你拔腿就跑。',
          hpChange: -3, hungerChange: -5, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
    subActions: [
      {
        id: 'drink_water',
        label: '尋找水源',
        description: '花額外時間找水喝',
        primaryStat: 'int',
        dc: 9,
        successResult: {
          narrative: '找到了清澈的溪流！',
          hpChange: 0, hungerChange: 0, hydrationChange: 20,
        },
        failureResult: {
          narrative: '水源已經乾涸了。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 0 },
      },
      {
        id: 'rest',
        tags: ['rest'],
        label: '休息養傷',
        description: '安靜地休養身體',
        primaryStat: 'int',
        dc: 6,
        successResult: {
          narrative: '充足的休息讓你恢復了體力。',
          hpChange: 15, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '環境太吵了，沒有休息好。',
          hpChange: 5, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 2, hydration: 2 },
      },
    ],
  },
  {
    id: 'juv_pterosaur',
    fact: '翼龍不是恐龍！牠們是恐龍的近親，也是第一批學會主動飛行的脊椎動物。',
    narratives: [
      '天空中出現了一群翼龍，牠們的影子掠過地面，引起了一陣騷動。',
      '你發現了一個被遺棄的蛋殼堆，空氣中還殘留著某種掠食者的氣味。',
    ],
    stages: ['juvenile'],
    mainActions: [
      {
        id: 'forage_bugs',
        label: '搜尋昆蟲',
        description: '在腐木和石頭下尋找蛋白質豐富的昆蟲',
        primaryStat: 'int',
        dc: 8,
        successResult: {
          narrative: '你翻開一塊大石頭，發現了滿滿的甲蟲群！',
          hpChange: 0, hungerChange: 25, hydrationChange: 5,
        },
        failureResult: {
          narrative: '石頭底下空空如也，白忙一場。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'follow_adults',
        label: '跟隨成年恐龍',
        description: '緊跟在成年恐龍身後學習覓食',
        primaryStat: 'agi',
        dc: 9,
        successResult: {
          narrative: '成年恐龍帶你找到了豐富的食物來源。',
          hpChange: 0, hungerChange: 20, hydrationChange: 15,
          statChanges: { int: 1 },
        },
        failureResult: {
          narrative: '你跟丟了，獨自在野外徘徊了很久。',
          hpChange: -5, hungerChange: -10, hydrationChange: -5,
        },
        resourceCost: { hunger: 8, hydration: 5 },
      },
      {
        id: 'dig_roots',
        label: '挖掘根莖',
        description: '用爪子挖出地底的植物根莖',
        primaryStat: 'str',
        dc: 9,
        successResult: {
          narrative: '你挖出了幾根多汁的根莖，味道還不錯。',
          hpChange: 0, hungerChange: 15, hydrationChange: 10,
        },
        failureResult: {
          narrative: '地面太硬了，挖了半天也沒什麼收穫。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 8, hydration: 5 },
      },
    ],
    subActions: [
      {
        id: 'build_shelter',
        label: '尋找避難所',
        description: '找個安全的地方躲避',
        primaryStat: 'int',
        dc: 10,
        successResult: {
          narrative: '你找到了一個隱蔽的洞穴。',
          hpChange: 5, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '附近沒有合適的藏身之處。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
      {
        id: 'mark_territory',
        label: '標記領地',
        description: '在附近留下氣味標記',
        primaryStat: 'cha',
        dc: 8,
        successResult: {
          narrative: '你成功標記了領地，其他小恐龍會避開這裡。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '你的標記被更大的恐龍覆蓋了。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 2, hydration: 3 },
      },
    ],
  },
  {
    id: 'juv_night',
    tags: ['night'],
    fact: '竊蛋龍（Oviraptor）的名字意思是「偷蛋賊」，但後來的化石顯示牠其實是在孵自己的蛋——這是古生物學界有名的冤案。',
    narratives: [
      '夜幕低垂，巢穴外傳來窸窣的腳步聲。一隻偷蛋龍正悄悄靠近你們的巢穴。',
      '你從巢穴探出頭，發現遠處的灌木叢中有兩顆閃爍的眼睛正盯著你看。',
      '母親外出覓食遲遲未歸，巢穴附近出現了陌生掠食者的氣味。',
    ],
    stages: ['juvenile'],
    mainActions: [
      {
        id: 'alarm_call',
        label: '發出警報叫聲',
        description: '大聲呼叫引起成年恐龍注意',
        primaryStat: 'cha',
        dc: 8,
        successResult: {
          narrative: '你的叫聲引來了附近的成年恐龍，掠食者嚇得轉身逃走了！',
          hpChange: 0, hungerChange: 5, hydrationChange: 5,
        },
        failureResult: {
          narrative: '你的叫聲太小了，沒有引起任何注意。掠食者更加肆無忌憚。',
          hpChange: -10, hungerChange: -5, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
      {
        id: 'flee_nest',
        tags: ['flee'],
        label: '棄巢逃跑',
        description: '放棄巢穴，全速逃向安全地帶',
        primaryStat: 'agi',
        dc: 9,
        successResult: {
          narrative: '你飛快地鑽進了密林，掠食者追了一會就放棄了。',
          hpChange: 0, hungerChange: -5, hydrationChange: -5,
        },
        failureResult: {
          narrative: '你跑得不夠快，被掠食者的爪子劃傷了背部。',
          hpChange: -15, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 8, hydration: 5 },
      },
      {
        id: 'hide_still',
        tags: ['night'],
        label: '躲在巢穴深處不動',
        description: '屏住呼吸，希望掠食者沒有發現你',
        primaryStat: 'int',
        dc: 10,
        successResult: {
          narrative: '你完美地偽裝成了巢穴的一部分，掠食者搜尋了一會後離開了。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '你忍不住打了個噴嚏，暴露了位置！倉皇逃出巢穴。',
          hpChange: -8, hungerChange: -3, hydrationChange: -3,
        },
        resourceCost: { hunger: 2, hydration: 2 },
      },
    ],
    subActions: [
      {
        id: 'gather_eggshells',
        label: '收集蛋殼碎片',
        description: '撿拾蛋殼補充礦物質',
        primaryStat: 'int',
        dc: 7,
        successResult: {
          narrative: '你啃食了一些蛋殼碎片，骨骼似乎更強壯了。',
          hpChange: 5, hungerChange: 5, hydrationChange: 0,
        },
        failureResult: {
          narrative: '蛋殼已經風化碎裂，沒什麼營養價值了。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 2, hydration: 2 },
      },
      {
        id: 'dig_burrow',
        label: '挖掘藏身洞',
        description: '在地面挖一個緊急藏身用的小洞',
        primaryStat: 'str',
        dc: 9,
        successResult: {
          narrative: '你挖出了一個剛好能藏身的小洞，以後遇到危險可以躲進去。',
          hpChange: 5, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '土壤太硬了，你的爪子還不夠強壯。',
          hpChange: 0, hungerChange: -3, hydrationChange: -2,
        },
        resourceCost: { hunger: 5, hydration: 3 },
      },
    ],
  },
  {
    id: 'juv_flood',
    narratives: [
      '連日大雨讓附近的小溪暴漲成了湍急的河流，擋住了你回巢穴的路。',
      '昨晚的暴風雨沖垮了好幾棵大樹，地形變得面目全非。',
    ],
    stages: ['juvenile'],
    mainActions: [
      {
        id: 'swim_across',
        label: '嘗試游泳渡河',
        description: '鼓起勇氣踏入水中，游向對岸',
        primaryStat: 'str',
        dc: 11,
        successResult: {
          narrative: '你奮力划動四肢，成功游到了對岸！還意外抓到了幾條魚。',
          hpChange: 0, hungerChange: 20, hydrationChange: 15,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '水流太急了，你被沖到了下游，掙扎了好久才爬上岸。',
          hpChange: -15, hungerChange: -10, hydrationChange: 5,
        },
        resourceCost: { hunger: 8, hydration: 0 },
      },
      {
        id: 'find_crossing',
        label: '沿河尋找淺灘',
        description: '沿著河岸走，尋找可以安全通過的地方',
        primaryStat: 'int',
        dc: 9,
        successResult: {
          narrative: '你找到了一處倒木形成的天然橋樑，安全地走了過去。',
          hpChange: 0, hungerChange: 5, hydrationChange: 10,
        },
        failureResult: {
          narrative: '走了很遠也沒找到淺灘，天色漸暗，你只好在河邊過夜。',
          hpChange: -5, hungerChange: -10, hydrationChange: 5,
        },
        resourceCost: { hunger: 10, hydration: 5 },
      },
      {
        id: 'wait_flood',
        label: '等待洪水退去',
        description: '就地紮營，等水位降低',
        primaryStat: 'int',
        dc: 7,
        successResult: {
          narrative: '你耐心等待了一天，水位果然退了。還在附近找到了不少被沖上岸的食物。',
          hpChange: 5, hungerChange: 15, hydrationChange: 20,
        },
        failureResult: {
          narrative: '水位不降反升，你被迫移到更高的地方，浪費了大量體力。',
          hpChange: -5, hungerChange: -8, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 3 },
      },
    ],
    subActions: [
      {
        id: 'catch_fish',
        label: '在淺水抓魚',
        description: '趁水位高漲時在淺灘捕魚',
        primaryStat: 'agi',
        dc: 10,
        successResult: {
          narrative: '你笨拙地撲向水面，竟然真的叼住了一條魚！',
          hpChange: 0, hungerChange: 15, hydrationChange: 5,
        },
        failureResult: {
          narrative: '魚太滑了，從你嘴邊溜走了。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 0 },
      },
      {
        id: 'collect_driftwood_bugs',
        label: '翻找漂流木中的蟲子',
        description: '在被沖上岸的木頭裡尋找昆蟲',
        primaryStat: 'int',
        dc: 8,
        successResult: {
          narrative: '漂流木裡滿是肥美的幼蟲，你飽餐了一頓。',
          hpChange: 0, hungerChange: 12, hydrationChange: 3,
        },
        failureResult: {
          narrative: '木頭裡只有泥巴和碎石。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 2, hydration: 2 },
      },
    ],
  },
  {
    id: 'juv_plants',
    fact: '開花植物（被子植物）在白堊紀迅速擴張，到了白堊紀末期已成為許多地區的優勢植物。',
    narratives: [
      '你在叢林深處發現了一種從未見過的奇異植物，散發著甜膩的氣味。',
      '地面上長滿了色彩斑斕的菌類，有些恐龍正在啃食它們。',
      '一陣微風帶來了奇特的花粉，讓你忍不住打了好幾個噴嚏。',
    ],
    stages: ['juvenile'],
    mainActions: [
      {
        id: 'taste_plant',
        label: '嘗試品嚐奇異植物',
        description: '小心翼翼地咬一口看看能不能吃',
        primaryStat: 'int',
        dc: 10,
        successResult: {
          narrative: '這種植物出奇地美味又營養！你記住了它的樣子，以後可以常來採食。',
          hpChange: 5, hungerChange: 25, hydrationChange: 10,
          statChanges: { int: 1 },
        },
        failureResult: {
          narrative: '味道苦澀難當，你趕緊吐了出來，肚子一陣翻攪。',
          hpChange: -8, hungerChange: -5, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
      {
        id: 'chase_butterflies',
        label: '追逐大型昆蟲',
        description: '追捕被花粉吸引來的巨型昆蟲',
        primaryStat: 'agi',
        dc: 9,
        successResult: {
          narrative: '你敏捷地撲住了一隻巨大的蜻蜓，嘎嘎嘎地咬碎了它的翅膀。',
          hpChange: 0, hungerChange: 15, hydrationChange: 5,
          statChanges: { agi: 1 },
        },
        failureResult: {
          narrative: '昆蟲飛得太高了，你撲了個空，摔了一跤。',
          hpChange: -3, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 3 },
      },
      {
        id: 'observe_others_eating',
        tags: ['study'],
        label: '觀察其他恐龍的進食',
        description: '看看其他恐龍吃什麼，跟著學習',
        primaryStat: 'int',
        dc: 7,
        successResult: {
          knowledge: 1,
          narrative: '你觀察到年長的恐龍只吃特定顏色的菌類，你跟著吃，味道不錯！',
          hpChange: 0, hungerChange: 18, hydrationChange: 8,
          statChanges: { int: 1 },
        },
        failureResult: {
          narrative: '你模仿了一隻看起來很笨的恐龍，結果吃到了苦澀的東西。',
          hpChange: -3, hungerChange: -3, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
    subActions: [
      {
        id: 'roll_in_mud',
        label: '在泥坑打滾',
        description: '用泥巴覆蓋身體防蟲咬',
        primaryStat: 'agi',
        dc: 6,
        successResult: {
          narrative: '厚厚的泥巴層讓討厭的蚊蟲不再靠近你了。',
          hpChange: 5, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '泥坑比想像的深，你差點陷進去。',
          hpChange: -3, hungerChange: 0, hydrationChange: -3,
        },
        resourceCost: { hunger: 2, hydration: 2 },
      },
      {
        id: 'nap_shade',
        tags: ['rest'],
        label: '在樹蔭下小睡',
        description: '趁涼爽時休息一下',
        primaryStat: 'int',
        dc: 5,
        successResult: {
          narrative: '舒適的午覺讓你精力充沛。',
          hpChange: 10, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '一顆果實砸到你頭上，把你嚇醒了。',
          hpChange: 2, hungerChange: 3, hydrationChange: 0,
        },
        resourceCost: { hunger: 2, hydration: 2 },
      },
    ],
  },
];

const ADOLESCENT_EVENTS: EventTemplate[] = [
  {
    id: 'ado_valley',
    narratives: [
      '你已經長大了不少，開始獨自探索更遠的區域。今天，你發現了一片從未見過的河谷。',
      '季節交替，森林中的食物分布正在改變。你需要做出選擇。',
      '一群遷徙中的恐龍經過你的領地，帶來了新的機會和威脅。',
    ],
    stages: ['adolescent'],
    mainActions: [
      {
        id: 'hunt_small',
        enemy: 'small_theropod',
        label: '狩獵小型獵物',
        description: '追捕蜥蜴、小型恐龍或昆蟲群',
        primaryStat: 'str',
        dc: 11,
        isCombat: true,
        threatDC: 11,
        successResult: {
          narrative: '你成功捕獲了獵物，飽餐了一頓！',
          hpChange: 0, hungerChange: 30, hydrationChange: 5,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '獵物逃走了，你白費了力氣。',
          hpChange: -10, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 10, hydration: 8 },
      },
      {
        id: 'explore_territory',
        label: '探索新領地',
        description: '前往未知區域尋找資源',
        primaryStat: 'int',
        dc: 12,
        successResult: {
          narrative: '你發現了一片資源豐富的新區域！',
          hpChange: 0, hungerChange: 25, hydrationChange: 25,
          statChanges: { int: 1 },
        },
        failureResult: {
          narrative: '新區域危機四伏，你差點走不出來。',
          hpChange: -15, hungerChange: -10, hydrationChange: -10,
        },
        resourceCost: { hunger: 12, hydration: 10 },
      },
      {
        id: 'defend_territory',
        enemy: 'rival',
        label: '保衛領地',
        description: '驅趕入侵你領地的其他恐龍',
        primaryStat: 'str',
        dc: 13,
        isCombat: true,
        threatDC: 13,
        successResult: {
          narrative: '你成功驅趕了入侵者，鞏固了自己的地盤！',
          hpChange: 0, hungerChange: 10, hydrationChange: 10,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '入侵者太強了，你被迫退讓。',
          hpChange: -20, hungerChange: -5, hydrationChange: -5,
          statChanges: { str: -1 },
        },
        resourceCost: { hunger: 10, hydration: 8 },
      },
    ],
    subActions: [
      {
        id: 'find_water_source',
        label: '尋找水源',
        description: '探索周圍尋找穩定的水源',
        primaryStat: 'int',
        dc: 11,
        successResult: {
          narrative: '你找到了一個隱藏的泉水！',
          hpChange: 0, hungerChange: 0, hydrationChange: 25,
        },
        failureResult: {
          narrative: '水源搜索無果。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 0 },
      },
      {
        id: 'practice_skills',
        label: '磨練技能',
        description: '練習戰鬥或覓食技巧',
        primaryStat: 'agi',
        dc: 10,
        successResult: {
          narrative: '刻苦的訓練讓你更加靈活了。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
          statChanges: { agi: 1 },
        },
        failureResult: {
          narrative: '訓練中扭傷了腳踝，需要休息。',
          hpChange: -5, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 8, hydration: 5 },
      },
    ],
  },
  {
    id: 'ado_volcano',
    fact: '白堊紀末期，印度的「德干暗色岩」火山群持續噴發了數十萬年，釋放大量氣體，可能讓生態系統在隕石撞擊前就已承受壓力。',
    narratives: [
      '地面在輕微震動，遠方的火山噴出了灰色的煙柱。空氣中充滿了硫磺的氣味。',
      '乾旱的季節來臨了，河流開始乾涸，所有的恐龍都在尋找水源。',
    ],
    stages: ['adolescent'],
    mainActions: [
      {
        id: 'migrate',
        label: '遷徙尋找新地',
        description: '離開危險區域，尋找更安全的棲地',
        primaryStat: 'agi',
        dc: 12,
        successResult: {
          narrative: '你成功遷徙到了一片水草豐美的新棲地！',
          hpChange: 0, hungerChange: 20, hydrationChange: 30,
          statChanges: { agi: 1 },
        },
        failureResult: {
          narrative: '遷徙途中迷路了，消耗了大量體力。',
          hpChange: -10, hungerChange: -15, hydrationChange: -15,
        },
        resourceCost: { hunger: 15, hydration: 12 },
      },
      {
        id: 'forage_desperate',
        label: '拚命覓食',
        description: '不顧危險地搜刮一切可食用的東西',
        primaryStat: 'int',
        dc: 10,
        successResult: {
          narrative: '你找到了隱藏的食物儲備，暫時免於飢餓。',
          hpChange: 0, hungerChange: 35, hydrationChange: 10,
        },
        failureResult: {
          narrative: '覓食時遭遇了掠食者，倉皇逃離。',
          hpChange: -15, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'dig_for_water',
        label: '挖掘地下水',
        description: '用爪子在乾涸的河床挖掘',
        primaryStat: 'str',
        dc: 13,
        successResult: {
          narrative: '你挖到了地下水層！清涼的水湧了出來。',
          hpChange: 5, hungerChange: 5, hydrationChange: 40,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '挖了很深也沒有水，爪子都磨損了。',
          hpChange: -5, hungerChange: -5, hydrationChange: 0,
        },
        resourceCost: { hunger: 10, hydration: 5 },
      },
    ],
    subActions: [
      {
        id: 'rest_heal',
        tags: ['rest'],
        label: '休息恢復',
        description: '找個陰涼處休養',
        primaryStat: 'int',
        dc: 8,
        successResult: {
          narrative: '安靜的休息讓你恢復了些許體力。',
          hpChange: 15, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '太熱了，無法好好休息。',
          hpChange: 5, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
      {
        id: 'scavenge',
        label: '翻找殘骸',
        description: '搜索其他恐龍留下的食物殘渣',
        primaryStat: 'int',
        dc: 11,
        successResult: {
          narrative: '你找到了一些還能吃的殘骸！',
          hpChange: 0, hungerChange: 15, hydrationChange: 0,
        },
        failureResult: {
          narrative: '殘骸已經被清理乾淨了。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
  },
  {
    id: 'ado_wildfire',
    narratives: [
      '森林邊緣冒出了滾滾濃煙，一場野火正在蔓延，熱浪讓空氣都在扭曲。',
      '閃電擊中了一棵枯樹，火焰迅速蔓延到了整片灌木叢。',
      '遠處的山丘上烈焰沖天，動物們驚慌地四處奔逃。',
    ],
    stages: ['adolescent'],
    mainActions: [
      {
        id: 'flee_fire',
        tags: ['flee'],
        label: '全速逃離火場',
        description: '朝逆風方向拔腿狂奔',
        primaryStat: 'agi',
        dc: 11,
        successResult: {
          narrative: '你順著河谷方向全力奔跑，成功逃離了火場，還發現了一片未被波及的沃土。',
          hpChange: 0, hungerChange: 10, hydrationChange: 15,
          statChanges: { agi: 1 },
        },
        failureResult: {
          narrative: '煙霧讓你迷失了方向，皮膚被灼傷，好不容易才找到出路。',
          hpChange: -20, hungerChange: -10, hydrationChange: -10,
        },
        resourceCost: { hunger: 12, hydration: 10 },
      },
      {
        id: 'river_refuge',
        label: '衝向河流避火',
        description: '記得附近有條河，跳入水中避開火焰',
        primaryStat: 'int',
        dc: 10,
        successResult: {
          narrative: '你成功找到了河流，泡在涼爽的水中看著火焰從兩旁掠過。河裡還有魚可以吃。',
          hpChange: 5, hungerChange: 15, hydrationChange: 25,
        },
        failureResult: {
          narrative: '記錯了方向，繞了一大圈才找到水源，吸入了不少濃煙。',
          hpChange: -12, hungerChange: -5, hydrationChange: 10,
        },
        resourceCost: { hunger: 8, hydration: 5 },
      },
      {
        id: 'fire_hunt',
        enemy: 'hadrosaur',
        label: '趁火打劫——捕捉逃竄的獵物',
        description: '火災讓小動物無處躲藏，正是狩獵的好時機',
        primaryStat: 'str',
        dc: 12,
        isCombat: true,
        threatDC: 10,
        successResult: {
          narrative: '你輕鬆捕獲了幾隻被大火逼出巢穴的小型恐龍，飽餐一頓！',
          hpChange: -5, hungerChange: 35, hydrationChange: 5,
        },
        failureResult: {
          narrative: '你太貪心了，被火焰逼到了角落，灼傷了尾巴。',
          hpChange: -18, hungerChange: 5, hydrationChange: -5,
        },
        resourceCost: { hunger: 8, hydration: 8 },
      },
    ],
    subActions: [
      {
        id: 'help_others_flee',
        label: '引導其他恐龍逃生',
        description: '用叫聲引導迷路的恐龍找到出路',
        primaryStat: 'cha',
        dc: 10,
        successResult: {
          narrative: '幾隻年幼的恐龍跟著你的叫聲逃出了火場，牠們對你感激不盡。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '你的叫聲被火焰的轟鳴蓋過了，沒有恐龍聽到。',
          hpChange: 0, hungerChange: -3, hydrationChange: -3,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'scavenge_burnt',
        label: '搜索燒焦的區域',
        description: '火災過後翻找烤熟的食物',
        primaryStat: 'int',
        dc: 9,
        successResult: {
          narrative: '你找到了幾隻被火烤熟的蜥蜴，味道竟然還不錯。',
          hpChange: 0, hungerChange: 18, hydrationChange: 0,
        },
        failureResult: {
          narrative: '灰燼中什麼也沒有，只有嗆人的煙味。',
          hpChange: -3, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
  },
  {
    id: 'ado_graveyard',
    fact: '大量恐龍骨骼集中在一起的「骨床」，常是旱災或洪水造成集體死亡後被河流沖積而成。',
    narratives: [
      '你在探索一片荒蕪的岩地時，發現了大量散落的巨大骨骸——這是一處恐龍墓地。',
      '峽谷深處堆滿了泛白的骨頭，空氣中瀰漫著一股古老而陰沉的氣息。',
    ],
    stages: ['adolescent'],
    mainActions: [
      {
        id: 'gnaw_bones',
        label: '啃食骨骸攝取礦物質',
        description: '咬碎老舊的骨頭補充鈣質',
        primaryStat: 'str',
        dc: 9,
        successResult: {
          narrative: '你咬碎了幾塊骨頭，骨髓中殘存的營養讓你的身體更強壯了。',
          hpChange: 10, hungerChange: 10, hydrationChange: 0,
        },
        failureResult: {
          narrative: '骨頭太硬了，你差點崩斷了一顆牙齒。',
          hpChange: -5, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'investigate_graveyard',
        tags: ['study'],
        label: '調查骨骸的死因',
        description: '觀察骨骸上的痕跡，學習這片區域的危險',
        primaryStat: 'int',
        dc: 11,
        successResult: {
          knowledge: 1,
          narrative: '你從骨骸的咬痕和分布推斷出附近有巨型掠食者的巢穴，提前避開了危險。',
          hpChange: 0, hungerChange: 5, hydrationChange: 5,
          statChanges: { int: 1 },
        },
        failureResult: {
          narrative: '你沉迷於研究，沒注意到一隻食腐恐龍已經悄悄靠近了你。',
          hpChange: -10, hungerChange: -5, hydrationChange: -3,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'ambush_scavengers',
        enemy: 'raptor',
        label: '伏擊前來食腐的恐龍',
        description: '利用骨骸作為誘餌，埋伏等待獵物上門',
        primaryStat: 'agi',
        dc: 12,
        isCombat: true,
        threatDC: 11,
        successResult: {
          narrative: '一隻不知情的食腐龍走進了你的埋伏圈，你一擊得手！',
          hpChange: 0, hungerChange: 30, hydrationChange: 5,
        },
        failureResult: {
          narrative: '你埋伏的位置被風向出賣了，對方發現了你並反過來攻擊。',
          hpChange: -15, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 8, hydration: 5 },
      },
    ],
    subActions: [
      {
        id: 'sharpen_claws',
        label: '在骨頭上磨爪',
        description: '利用堅硬的骨骸磨利自己的爪子',
        primaryStat: 'str',
        dc: 8,
        successResult: {
          narrative: '你的爪子變得鋒利無比，閃著寒光。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '磨爪時用力過猛，爪尖反而崩裂了一小塊。',
          hpChange: -3, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
      {
        id: 'bone_shelter',
        label: '用骨骸搭建遮蔽處',
        description: '利用巨大的骨架作為臨時避難所',
        primaryStat: 'int',
        dc: 10,
        successResult: {
          narrative: '你用巨大的肋骨搭了一個簡易遮蔽處，非常涼爽。',
          hpChange: 10, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '骨架不夠穩固，被風一吹就散了。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
  },
  {
    id: 'ado_tar',
    narratives: [
      '你行走在一片低窪地帶，突然感覺腳下的地面變得黏稠——你踩進了一個焦油坑！',
      '一股刺鼻的瀝青氣味瀰漫在空氣中，地面上到處是深色的黏稠液體。',
    ],
    stages: ['adolescent'],
    mainActions: [
      {
        id: 'struggle_free',
        label: '奮力掙脫焦油',
        description: '用盡全身力氣把自己拔出來',
        primaryStat: 'str',
        dc: 12,
        successResult: {
          narrative: '你使出渾身力氣，終於把四肢從黏稠的焦油中拔了出來。',
          hpChange: -5, hungerChange: -10, hydrationChange: -5,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '你越掙扎陷得越深，耗盡了大量體力才勉強脫身。',
          hpChange: -20, hungerChange: -15, hydrationChange: -10,
        },
        resourceCost: { hunger: 10, hydration: 8 },
      },
      {
        id: 'call_for_help',
        label: '呼叫同伴救援',
        description: '大聲呼救，期待有恐龍來幫忙',
        primaryStat: 'cha',
        dc: 13,
        successResult: {
          narrative: '一隻路過的大型草食恐龍聽到了你的呼救，用長脖子把你拉了出來！',
          hpChange: 0, hungerChange: -5, hydrationChange: -3,
        },
        failureResult: {
          narrative: '沒有任何恐龍回應你的呼救，你只能獨自掙扎。',
          hpChange: -15, hungerChange: -10, hydrationChange: -8,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'calm_escape',
        label: '冷靜思考脫身之法',
        description: '停止掙扎，觀察周圍尋找支撐物',
        primaryStat: 'int',
        dc: 10,
        successResult: {
          narrative: '你注意到旁邊有根粗樹枝，慢慢移過去抓住它，借力爬了出來。',
          hpChange: -3, hungerChange: -5, hydrationChange: -3,
        },
        failureResult: {
          narrative: '你試圖抓住一根樹枝，但它斷了，你又陷了下去。',
          hpChange: -12, hungerChange: -8, hydrationChange: -5,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
    ],
    subActions: [
      {
        id: 'tar_prey',
        label: '捕食焦油中的困獸',
        description: '趁其他被困動物無法動彈時捕食',
        primaryStat: 'str',
        dc: 9,
        successResult: {
          narrative: '一隻小型恐龍也被困在焦油中，你輕鬆地享用了它。',
          hpChange: 0, hungerChange: 20, hydrationChange: 0,
        },
        failureResult: {
          narrative: '被困的動物掙扎得太厲害了，你不敢靠近。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
      {
        id: 'clean_tar',
        label: '清理身上的焦油',
        description: '在沙地上打滾清除焦油',
        primaryStat: 'agi',
        dc: 8,
        successResult: {
          narrative: '你在粗糙的沙地上反覆打滾，總算把大部分焦油蹭掉了。',
          hpChange: 5, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '焦油黏得太牢了，沙子反而黏了一身。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
  },
  {
    id: 'ado_geothermal',
    narratives: [
      '你闖入了一片你從未見過的地熱區域，地面冒著蒸氣，空氣溫暖而潮濕。',
      '前方的山坡上有好幾個冒著熱氣的泉眼，地面呈現出奇異的橙黃色。',
    ],
    stages: ['adolescent'],
    mainActions: [
      {
        id: 'hot_spring_soak',
        tags: ['rest'],
        label: '在溫泉中泡澡',
        description: '小心翼翼地進入溫度適中的泉水中',
        primaryStat: 'int',
        dc: 10,
        successResult: {
          narrative: '溫暖的泉水讓你全身的疲勞一掃而空，傷口也加速癒合了。',
          hpChange: 20, hungerChange: 0, hydrationChange: 20,
        },
        failureResult: {
          narrative: '你選的泉水溫度太高了！腳掌被燙傷，趕緊跳了出來。',
          hpChange: -10, hungerChange: 0, hydrationChange: 5,
        },
        resourceCost: { hunger: 5, hydration: 0 },
      },
      {
        id: 'geothermal_forage',
        label: '在地熱區覓食',
        description: '尋找在溫暖環境中生長的植物和昆蟲',
        primaryStat: 'int',
        dc: 11,
        successResult: {
          narrative: '溫暖的環境孕育了大量肥美的昆蟲和嫩芽，你吃得肚子圓滾滾的。',
          hpChange: 0, hungerChange: 30, hydrationChange: 10,
        },
        failureResult: {
          narrative: '不小心踩到了地熱噴口附近的脆弱地面，腳被熱蒸氣燙傷了。',
          hpChange: -8, hungerChange: 5, hydrationChange: 5,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'claim_warm_spot',
        enemy: 'ceratops',
        label: '佔據溫暖的棲息地',
        description: '趕走這裡的其他恐龍，獨佔這片溫暖之地',
        primaryStat: 'str',
        dc: 13,
        isCombat: true,
        threatDC: 12,
        successResult: {
          narrative: '你成功驅趕了這裡的佔據者，這片溫暖的土地現在是你的了！',
          hpChange: 0, hungerChange: 15, hydrationChange: 15,
        },
        failureResult: {
          narrative: '原本的主人比你想像的更強悍，你被打得灰頭土臉地逃走了。',
          hpChange: -18, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 10, hydration: 8 },
      },
    ],
    subActions: [
      {
        id: 'mineral_lick',
        label: '舔食礦物結晶',
        description: '品嚐地熱區域的礦物沉積物',
        primaryStat: 'int',
        dc: 9,
        successResult: {
          narrative: '你舔到了富含礦物質的結晶，感覺骨骼都在變強。',
          hpChange: 8, hungerChange: 5, hydrationChange: 0,
        },
        failureResult: {
          narrative: '那些結晶味道刺鼻難聞，你趕緊吐了出來。',
          hpChange: -2, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 2, hydration: 3 },
      },
      {
        id: 'warm_nap',
        tags: ['rest'],
        label: '在溫暖的地面休息',
        description: '躺在被地熱加溫的岩石上休息',
        primaryStat: 'int',
        dc: 7,
        successResult: {
          narrative: '溫暖的石頭讓你睡了一個前所未有的好覺。',
          hpChange: 15, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '石頭比你想的更燙，你被燙醒了好幾次。',
          hpChange: 3, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
  },
];

const ADULT_EVENTS: EventTemplate[] = [
  {
    id: 'adu_plains',
    narratives: [
      '你已經是一隻成熟的恐龍了。廣袤的平原上，你看到了無盡的可能——或者是無盡的危險。',
      '一場森林大火過後，灰燼中冒出了新芽。生命在毀滅中重新開始。',
      '遠方傳來了同類的呼喚，那是求偶的信號。',
    ],
    stages: ['adult'],
    mainActions: [
      {
        id: 'hunt_large',
        enemy: 'hadrosaur',
        label: '挑戰大型獵物',
        description: '嘗試獵捕體型巨大的恐龍',
        primaryStat: 'str',
        dc: 15,
        isCombat: true,
        threatDC: 15,
        successResult: {
          narrative: '你擊倒了一隻巨大的獵物！足夠吃好幾天了。',
          hpChange: 0, hungerChange: 50, hydrationChange: 10,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '對方的反擊太過猛烈，你傷痕累累地撤退了。',
          hpChange: -30, hungerChange: -10, hydrationChange: -5,
          statChanges: { str: -1 },
        },
        resourceCost: { hunger: 15, hydration: 10 },
      },
      {
        id: 'seek_mate',
        requires: { noMate: true },
        label: '尋找伴侶',
        description: '展示自己的魅力，吸引異性',
        primaryStat: 'cha',
        dc: 13,
        successResult: {
          mateGain: true,
          traitRemove: 'grief',
          narrative: '你的求偶舞蹈打動了對方！你找到了人生伴侶。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
          statChanges: { cha: 1 },
        },
        failureResult: {
          narrative: '對方對你的表演興趣缺缺，轉身離去。',
          hpChange: 0, hungerChange: -10, hydrationChange: -5,
        },
        resourceCost: { hunger: 15, hydration: 10 },
      },
      {
        id: 'establish_territory',
        label: '建立領地',
        description: '開拓並守護一片新的領地',
        primaryStat: 'str',
        dc: 14,
        successResult: {
          narrative: '你成功建立了一片富饒的領地！',
          hpChange: 0, hungerChange: 25, hydrationChange: 25,
        },
        failureResult: {
          narrative: '這片區域已經被更強大的恐龍佔據了。',
          hpChange: -15, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 12, hydration: 10 },
      },
    ],
    subActions: [
      {
        id: 'gather_herbs',
        label: '收集藥草',
        description: '尋找具有治療效果的植物',
        primaryStat: 'int',
        dc: 14,
        successResult: {
          narrative: '你找到了珍貴的藥草！傷口加速癒合。',
          hpChange: 20, hungerChange: 5, hydrationChange: 0,
          traitRemove: 'infected',
        },
        failureResult: {
          narrative: '沒有找到有用的藥草。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'scout_ahead',
        label: '偵察前方',
        description: '偵查未知區域的情況',
        primaryStat: 'agi',
        dc: 12,
        successResult: {
          narrative: '你發現了前方的情報，為下次行動做好了準備。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '前方什麼也沒有發現。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
    ],
  },
  {
    id: 'adu_clouds',
    narratives: [
      '天空中飄過不尋常的雲層，空氣中有股不安的味道。你的直覺告訴你，有什麼大事即將發生。',
      '地震頻繁發生，大地似乎在警告著什麼。周圍的恐龍們都顯得焦躁不安。',
    ],
    stages: ['adult'],
    mainActions: [
      {
        id: 'raid_rival',
        enemy: 'rival',
        label: '突襲敵對族群',
        description: '掠奪其他族群的資源',
        primaryStat: 'str',
        dc: 15,
        isCombat: true,
        threatDC: 15,
        successResult: {
          narrative: '突襲成功！你搶到了大量食物和水源位置。',
          hpChange: -5, hungerChange: 40, hydrationChange: 20,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '對方的防禦比預想的更堅固，你被打退了。',
          hpChange: -25, hungerChange: -10, hydrationChange: -5,
          statChanges: { str: -1 },
        },
        resourceCost: { hunger: 15, hydration: 10 },
      },
      {
        id: 'build_nest',
        requires: { mate: true },
        label: '築巢繁育',
        description: '建造安全的巢穴，為下一代做準備',
        primaryStat: 'int',
        dc: 12,
        successResult: {
          narrative: '你建造了一個溫暖安全的巢穴！',
          hpChange: 5, hungerChange: 10, hydrationChange: 10,
          packChange: 1,
        },
        failureResult: {
          narrative: '巢穴的位置選得不好，被洪水沖毀了。',
          hpChange: 0, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 10, hydration: 8 },
      },
      {
        id: 'forage_rich',
        label: '深入覓食',
        description: '到更遠更危險的地方尋找食物',
        primaryStat: 'agi',
        dc: 13,
        successResult: {
          narrative: '你在遙遠的山谷中找到了豐富的食物！',
          hpChange: 0, hungerChange: 35, hydrationChange: 20,
        },
        failureResult: {
          narrative: '路途太過遙遠，你精疲力竭地返回。',
          hpChange: -10, hungerChange: -5, hydrationChange: -10,
        },
        resourceCost: { hunger: 12, hydration: 10 },
      },
    ],
    subActions: [
      {
        id: 'train_pack',
        requires: { minPack: 1 },
        label: '訓練族群',
        description: '教導族群成員戰鬥與覓食技巧',
        primaryStat: 'cha',
        dc: 13,
        successResult: {
          narrative: '族群成員變得更加團結和強大。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '族群成員不太聽話，訓練效果不佳。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'find_water_deep',
        label: '尋找深水源',
        description: '探索更遠的地方尋找穩定水源',
        primaryStat: 'int',
        dc: 13,
        successResult: {
          narrative: '你發現了一條地下河！水量充沛。',
          hpChange: 0, hungerChange: 0, hydrationChange: 30,
        },
        failureResult: {
          narrative: '搜索無果，白跑一趟。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 3 },
      },
    ],
  },
  {
    id: 'adu_river',
    condition: s => s.packSize >= 1,
    narratives: [
      '你在河邊飲水時，注意到水面映照出遠方天際一道不尋常的光芒。',
      '一群受傷的恐龍從北方逃來，牠們帶來了令人不安的消息。',
    ],
    stages: ['adult'],
    mainActions: [
      {
        id: 'protect_pack',
        enemy: 'tyrant',
        label: '保護族群',
        description: '守護族群成員不受威脅',
        primaryStat: 'str',
        dc: 14,
        isCombat: true,
        threatDC: 14,
        successResult: {
          narrative: '你英勇地擊退了掠食者，族群安全了！',
          hpChange: -5, hungerChange: 10, hydrationChange: 5,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '你未能完全保護族群，有成員受傷了。',
          hpChange: -20, hungerChange: -5, hydrationChange: -5,
          packChange: -1,
        },
        resourceCost: { hunger: 12, hydration: 8 },
      },
      {
        id: 'long_migration',
        requires: { minPack: 1 },
        label: '長距離遷徙',
        description: '帶領族群進行一次大規模遷徙',
        primaryStat: 'agi',
        dc: 14,
        successResult: {
          narrative: '成功的遷徙！你們找到了一片伊甸園般的棲地。',
          hpChange: 0, hungerChange: 30, hydrationChange: 30,
          statChanges: { agi: 1 },
        },
        failureResult: {
          narrative: '遷徙途中損失慘重。',
          hpChange: -15, hungerChange: -15, hydrationChange: -15,
        },
        resourceCost: { hunger: 15, hydration: 15 },
      },
      {
        id: 'diplomacy',
        label: '與鄰近族群交涉',
        description: '嘗試與其他恐龍族群建立和平關係',
        primaryStat: 'cha',
        dc: 14,
        successResult: {
          narrative: '你成功與鄰近族群達成了和平協議，共享資源。',
          hpChange: 0, hungerChange: 20, hydrationChange: 20,
          packChange: 1,
          statChanges: { cha: 1 },
        },
        failureResult: {
          narrative: '交涉失敗，對方態度敵對。',
          hpChange: -10, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 8, hydration: 8 },
      },
    ],
    subActions: [
      {
        id: 'stockpile',
        label: '儲備食物',
        description: '為未來收集和儲存食物',
        primaryStat: 'int',
        dc: 12,
        successResult: {
          setFlags: ['food_cache'],
          narrative: '你成功儲備了一批食物。',
          hpChange: 0, hungerChange: 15, hydrationChange: 0,
        },
        failureResult: {
          narrative: '儲備的食物被其他恐龍偷走了。',
          hpChange: 0, hungerChange: -5, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 3 },
      },
      {
        id: 'rest_recover',
        tags: ['rest'],
        label: '休養生息',
        description: '好好休息一段時間',
        primaryStat: 'int',
        dc: 8,
        successResult: {
          narrative: '充分的休息讓你煥然一新。',
          hpChange: 20, hungerChange: 0, hydrationChange: 5,
        },
        failureResult: {
          narrative: '總是被打擾，沒能好好休息。',
          hpChange: 5, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
  },
  {
    id: 'adu_flood',
    narratives: [
      '連日暴雨導致上游河流潰堤，洪水正朝你的棲地洶湧而來。',
      '你腳下的大地在震動，遠方傳來轟隆隆的水聲——洪水來了！',
      '一夜之間，河流改道了。原本的水源消失了，棲地的一半被泥漿覆蓋。',
    ],
    stages: ['adult'],
    mainActions: [
      {
        id: 'lead_pack_uphill',
        requires: { minPack: 1 },
        label: '帶領族群撤往高地',
        description: '指揮所有成員向高處轉移',
        primaryStat: 'int',
        dc: 13,
        successResult: {
          narrative: '你果斷地帶領族群撤離，所有成員都安全抵達了高地。洪水在腳下咆哮而過。',
          hpChange: 0, hungerChange: 10, hydrationChange: 20,
          statChanges: { int: 1 },
        },
        failureResult: {
          narrative: '你判斷錯了方向，族群被迫涉水而行，有成員受傷了。',
          hpChange: -15, hungerChange: -10, hydrationChange: 5,
          packChange: -1,
        },
        resourceCost: { hunger: 10, hydration: 5 },
      },
      {
        id: 'salvage_flood',
        label: '趁洪水撈取漂流物資',
        description: '冒險在洪水邊緣撈取被沖來的食物',
        primaryStat: 'agi',
        dc: 14,
        successResult: {
          narrative: '你身手矯健地從湍流中撈出了大量被沖來的獵物屍體和植物。',
          hpChange: -5, hungerChange: 40, hydrationChange: 15,
        },
        failureResult: {
          narrative: '一波巨浪差點將你捲走，你拼命掙扎才回到岸上。',
          hpChange: -25, hungerChange: -5, hydrationChange: 10,
        },
        resourceCost: { hunger: 8, hydration: 5 },
      },
      {
        id: 'build_dam',
        label: '用倒木築壩引流',
        description: '嘗試改變水流方向，保護棲地',
        primaryStat: 'str',
        dc: 15,
        successResult: {
          narrative: '你推動巨大的倒木成功改變了水流方向，棲地得以保全！一隻被你救下的年輕恐龍決定追隨你。',
          hpChange: -5, hungerChange: 5, hydrationChange: 25,
          packChange: 1,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '木頭被水流沖散了，你白費了力氣，還差點被砸傷。',
          hpChange: -15, hungerChange: -10, hydrationChange: 5,
        },
        resourceCost: { hunger: 15, hydration: 10 },
      },
    ],
    subActions: [
      {
        id: 'rescue_stranded',
        requires: { minPack: 1 },
        label: '救援被困的幼龍',
        description: '涉水救回被洪水困住的族群幼龍',
        primaryStat: 'str',
        dc: 12,
        successResult: {
          narrative: '你從洪水中救回了幾隻幼龍，族群凝聚力大增。',
          hpChange: -5, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '水流太急了，你沒能靠近被困的幼龍。',
          hpChange: -5, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 3 },
      },
      {
        id: 'mud_bath',
        label: '泥漿浴',
        description: '利用洪水帶來的泥漿覆蓋身體，驅除寄生蟲',
        primaryStat: 'int',
        dc: 8,
        successResult: {
          narrative: '厚厚的泥漿殺死了皮膚上的寄生蟲，你感覺渾身輕鬆。',
          hpChange: 10, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '泥漿裡混雜了碎石，把你的皮膚刮傷了。',
          hpChange: -3, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 2, hydration: 2 },
      },
    ],
  },
  {
    id: 'adu_plague',
    condition: s => s.packSize >= 2,
    weight: 0.8,
    narratives: [
      '你注意到族群中有幾隻成員開始咳嗽、行動遲緩，一場疫病似乎正在蔓延。',
      '附近水源的水變得混濁，好幾隻恐龍喝了之後都開始嘔吐。',
    ],
    stages: ['adult'],
    mainActions: [
      {
        id: 'quarantine',
        label: '隔離病患',
        description: '將生病的族群成員隔離，防止疫情擴散',
        primaryStat: 'int',
        dc: 13,
        successResult: {
          narrative: '你果斷地隔離了病患，疫情被控制住了。大部分成員安然無恙。',
          hpChange: 0, hungerChange: -5, hydrationChange: -5,
          statChanges: { int: 1 },
        },
        failureResult: {
          narrative: '隔離措施太晚了，更多成員被感染，族群規模縮小。',
          hpChange: -10, hungerChange: -10, hydrationChange: -5,
          packChange: -1,
        },
        resourceCost: { hunger: 8, hydration: 8 },
      },
      {
        id: 'seek_cure_plant',
        label: '尋找解毒植物',
        description: '到森林深處尋找能治病的草藥',
        primaryStat: 'int',
        dc: 14,
        successResult: {
          narrative: '你憑藉敏銳的嗅覺找到了一種苦澀的草藥，餵給病患後牠們逐漸好轉。',
          hpChange: 15, hungerChange: 5, hydrationChange: 5,
          traitRemove: 'infected',
        },
        failureResult: {
          narrative: '你找到的植物沒有療效，白跑了一趟，自己也感覺不太舒服。',
          hpChange: -8, hungerChange: -8, hydrationChange: -5,
        },
        resourceCost: { hunger: 10, hydration: 8 },
      },
      {
        id: 'relocate_clean',
        label: '遷移到乾淨的水源地',
        description: '帶領族群遠離污染區域',
        primaryStat: 'agi',
        dc: 13,
        successResult: {
          narrative: '你帶領族群找到了一處水質清澈的新棲地，大家的健康逐漸恢復。',
          hpChange: 10, hungerChange: 10, hydrationChange: 30,
        },
        failureResult: {
          narrative: '遷移過程中幾隻虛弱的成員掉隊了，族群損失了成員。',
          hpChange: -5, hungerChange: -10, hydrationChange: 10,
          packChange: -1,
        },
        resourceCost: { hunger: 12, hydration: 10 },
      },
    ],
    subActions: [
      {
        id: 'boil_water',
        label: '尋找地熱淨水',
        description: '找地熱噴口附近的高溫殺菌水源',
        primaryStat: 'int',
        dc: 12,
        successResult: {
          narrative: '你找到了一處地熱加溫的泉水，水質乾淨又溫暖。',
          hpChange: 5, hungerChange: 0, hydrationChange: 20,
        },
        failureResult: {
          narrative: '附近沒有地熱水源，只能繼續喝混濁的水。',
          hpChange: 0, hungerChange: 0, hydrationChange: 5,
        },
        resourceCost: { hunger: 3, hydration: 0 },
      },
      {
        id: 'encourage_pack',
        label: '鼓舞族群士氣',
        description: '用吼聲和陪伴安撫焦慮的族群成員',
        primaryStat: 'cha',
        dc: 10,
        successResult: {
          narrative: '你的存在讓族群成員安心了許多，大家重新振作起來。',
          hpChange: 5, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '族群太過恐慌，你的安撫收效甚微。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
  },
  {
    id: 'adu_ash',
    narratives: [
      '大地在持續震動，遠方的火山口冒出了滾滾黑煙，細碎的火山灰開始飄落。',
      '天空被灰色的火山灰遮蔽，陽光變得昏暗。植物上覆蓋了一層灰白色的粉末。',
      '火山灰讓空氣變得刺鼻，呼吸都變得困難起來。',
    ],
    stages: ['adult'],
    mainActions: [
      {
        id: 'shelter_cave',
        label: '尋找洞穴避難',
        description: '找一個能遮蔽火山灰的洞穴（末日時或許用得上）',
        primaryStat: 'int',
        dc: 13,
        successResult: {
          setFlags: ['knows_cave'],
          narrative: '你找到了一個寬敞的深邃洞穴，安全地躲過了火山灰的侵襲。洞穴裡還有地下水源——你牢牢記住了這個地方。',
          hpChange: 5, hungerChange: 5, hydrationChange: 20,
        },
        failureResult: {
          narrative: '洞穴又小又淺，你只能半露在外面承受火山灰的折磨。',
          hpChange: -10, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 8, hydration: 8 },
      },
      {
        id: 'ash_migration',
        label: '穿越灰幕遷徙',
        description: '頂著火山灰向安全區域遷移',
        primaryStat: 'agi',
        dc: 14,
        successResult: {
          narrative: '你穿越了火山灰覆蓋區，找到了一片未受影響的綠洲。',
          hpChange: -5, hungerChange: 20, hydrationChange: 20,
        },
        failureResult: {
          narrative: '火山灰讓你迷失了方向，吸入了太多有害氣體，感到頭暈虛弱。',
          hpChange: -20, hungerChange: -15, hydrationChange: -10,
        },
        resourceCost: { hunger: 15, hydration: 12 },
      },
      {
        id: 'ash_forage',
        label: '在灰燼中覓食',
        description: '翻開火山灰層，尋找被掩埋的食物',
        primaryStat: 'str',
        dc: 12,
        successResult: {
          narrative: '你在厚厚的灰燼下發現了大量被悶熟的植物根莖和昆蟲，意外地收穫豐富。',
          hpChange: 0, hungerChange: 35, hydrationChange: 5,
        },
        failureResult: {
          narrative: '灰燼下什麼都沒有，你只是白白吸入了更多火山灰。',
          hpChange: -10, hungerChange: -5, hydrationChange: -5,
        },
        resourceCost: { hunger: 10, hydration: 8 },
      },
    ],
    subActions: [
      {
        id: 'filter_breathing',
        label: '用濕泥覆蓋口鼻',
        description: '用濕潤的泥土遮住口鼻過濾空氣',
        primaryStat: 'int',
        dc: 9,
        successResult: {
          narrative: '濕泥有效地過濾了空氣中的灰塵，呼吸順暢多了。',
          hpChange: 10, hungerChange: 0, hydrationChange: -3,
        },
        failureResult: {
          narrative: '泥土太乾了，沒什麼過濾效果。',
          hpChange: 0, hungerChange: 0, hydrationChange: -2,
        },
        resourceCost: { hunger: 2, hydration: 5 },
      },
      {
        id: 'dig_buried_water',
        label: '挖掘被掩埋的水源',
        description: '在火山灰下尋找被覆蓋的溪流',
        primaryStat: 'str',
        dc: 11,
        successResult: {
          narrative: '你挖穿了灰層，下面的溪水還在流動！',
          hpChange: 0, hungerChange: 0, hydrationChange: 25,
        },
        failureResult: {
          narrative: '水源已經被灰燼污染了，不能飲用。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 3 },
      },
    ],
  },
  {
    id: 'adu_challenge',
    condition: s => s.packSize >= 3,
    weight: 0.8,
    narratives: [
      '你的族群中，一隻體型碩大的成員開始公然挑戰你的領導地位，牠露出獠牙低聲咆哮。',
      '最近食物分配的不公引發了族群內部的不滿，幾隻強壯的成員聚在一起竊竊私語。',
    ],
    stages: ['adult'],
    mainActions: [
      {
        id: 'accept_challenge',
        enemy: 'rival',
        label: '正面迎戰挑戰者',
        description: '用實力證明自己的領導地位',
        primaryStat: 'str',
        dc: 14,
        isCombat: true,
        threatDC: 14,
        successResult: {
          narrative: '你以壓倒性的力量擊敗了挑戰者，族群的忠誠度達到了前所未有的高度。',
          hpChange: -10, hungerChange: 10, hydrationChange: 5,
          packChange: 1,
          statChanges: { str: 1 },
        },
        failureResult: {
          narrative: '挑戰者比你想像的更強，你雖然保住了地位但付出了慘痛代價。',
          hpChange: -25, hungerChange: -5, hydrationChange: -5,
          packChange: -1,
          statChanges: { str: -1 },
        },
        resourceCost: { hunger: 12, hydration: 10 },
      },
      {
        id: 'outsmart_rival',
        label: '智取對手',
        description: '用策略而非蠻力化解挑戰',
        primaryStat: 'int',
        dc: 13,
        successResult: {
          narrative: '你巧妙地在覓食時展示了只有你知道的食物來源，讓所有成員意識到你的不可替代性。',
          hpChange: 0, hungerChange: 20, hydrationChange: 10,
          statChanges: { int: 1 },
        },
        failureResult: {
          narrative: '你的計謀被對手識破了，族群開始動搖。',
          hpChange: -5, hungerChange: -5, hydrationChange: -5,
          packChange: -1,
        },
        resourceCost: { hunger: 8, hydration: 5 },
      },
      {
        id: 'share_leadership',
        label: '分享領導權',
        description: '邀請挑戰者成為你的副手，共同管理族群',
        primaryStat: 'cha',
        dc: 14,
        successResult: {
          narrative: '你的胸襟打動了挑戰者，牠成為了你最忠實的副手。族群比以前更強大了。',
          hpChange: 0, hungerChange: 10, hydrationChange: 10,
          packChange: 2,
          statChanges: { cha: 1 },
        },
        failureResult: {
          narrative: '挑戰者把你的善意當作軟弱的表現，帶走了一部分成員離去。',
          hpChange: 0, hungerChange: -5, hydrationChange: -5,
          packChange: -2,
        },
        resourceCost: { hunger: 10, hydration: 8 },
      },
    ],
    subActions: [
      {
        id: 'rally_supporters',
        label: '拉攏支持者',
        description: '在決鬥前先確保有足夠的盟友',
        primaryStat: 'cha',
        dc: 11,
        successResult: {
          narrative: '你的忠實夥伴們站到了你身邊，氣勢大增。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        failureResult: {
          narrative: '大部分成員選擇觀望，不願表態。',
          hpChange: 0, hungerChange: 0, hydrationChange: 0,
        },
        resourceCost: { hunger: 5, hydration: 5 },
      },
      {
        id: 'eat_to_recover',
        label: '大量進食恢復狀態',
        description: '在衝突前盡可能補充體力',
        primaryStat: 'int',
        dc: 9,
        successResult: {
          narrative: '你找到了足夠的食物，體力完全恢復。',
          hpChange: 10, hungerChange: 20, hydrationChange: 10,
        },
        failureResult: {
          narrative: '附近的食物早被搶光了，只找到一點殘渣。',
          hpChange: 0, hungerChange: 5, hydrationChange: 0,
        },
        resourceCost: { hunger: 3, hydration: 3 },
      },
    ],
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ALL_EVENTS: EventTemplate[] = [
  ...JUVENILE_EVENTS,
  ...ADOLESCENT_EVENTS,
  ...ADULT_EVENTS,
  ...EXTRA_EVENTS,
];

const RARITY_WEIGHT = { common: 1, rare: 0.5, legendary: 0.2, chain: 3 };

function usableActions(t: EventTemplate, state: GameState) {
  return {
    main: t.mainActions.filter(a => meetsRequirement(a.requires, state)),
    sub: t.subActions.filter(a => meetsRequirement(a.requires, state)),
  };
}

function templateWeight(t: EventTemplate): number {
  return t.weight ?? RARITY_WEIGHT[t.rarity ?? 'common'];
}

export function getEligibleTemplates(state: GameState): EventTemplate[] {
  const stage = getAgeStage(state.year);
  return ALL_EVENTS.filter(t =>
    t.stages.includes(stage) &&
    (!t.condition || t.condition(state)) &&
    usableActions(t, state).main.length >= 2
  );
}

function adjustForDiet(action: GameAction, state: GameState): GameAction {
  const a = { ...action };
  if (!state.species) return a;
  if (state.species.diet === 'omnivore') a.dc = Math.min(20, a.dc + 1);
  if (state.species.diet === 'herbivore' && a.primaryStat === 'int') a.dc = Math.max(3, a.dc - 1);
  if (state.species.diet === 'carnivore' && a.isCombat) {
    a.dc = Math.max(3, a.dc - 1);
    if (a.threatDC) a.threatDC = Math.max(3, a.threatDC - 1);
  }
  return a;
}

export function generateEvent(state: GameState): GameEvent {
  const year = state.year;
  const eligible = getEligibleTemplates(state);
  // 避免近期重複
  const fresh = eligible.filter(t => !state.recentEvents.includes(t.id));
  const pool = fresh.length > 0 ? fresh : eligible;

  const total = pool.reduce((sum, t) => sum + templateWeight(t), 0);
  let r = Math.random() * total;
  let template = pool[0];
  for (const t of pool) {
    r -= templateWeight(t);
    if (r <= 0) { template = t; break; }
  }

  const { main, sub } = usableActions(template, state);

  return {
    id: `event_y${year}_${Date.now()}`,
    templateId: template.id,
    narrative: pickRandom(template.narratives),
    year,
    rarity: template.rarity ?? 'common',
    fact: template.fact,
    tags: template.tags,
    mainActions: main.map(a => adjustForDiet(a, state)),
    subActions: sub.map(a => ({ ...a })),
  };
}
