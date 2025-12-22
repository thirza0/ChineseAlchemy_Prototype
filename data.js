// data.js - v4.0 (Sarcastic Master Edition)

// --- 1. 五行基礎定義 ---
const Elements = {
    METAL: "金",
    WOOD: "木",
    WATER: "水",
    FIRE: "火",
    EARTH: "土",
    ALL: "全" // ✨ 新增這行
};

const ElementColors = {
    "金": "#E0E0E0",
    "木": "#4CAF50",
    "水": "#29B6F6",
    "火": "#FF5252",
    "土": "#FFC107",
    "全": "#b700ffff"  // ✨ 新增這行，全屬性用白色或彩虹色代表
};

// data.js - 請新增此區塊

const ModeRuleDB = {
    NEUTRAL: `
        <h3>🛡️ 中和流 (Neutral)</h3>
        <p>在此流派中，<strong>土屬性</strong>的物理特性表現為<strong>惰性</strong>。</p>
        <ul style="text-align: left; margin-top: 10px; list-style-type: disc; padding-left: 20px;">
            <li><strong>座標影響：</strong>土屬性材料的向量座標固定為 <code>(0, 0)</code>。</li>
            <li><strong>策略用途：</strong>主要用於增加總重量而不改變向量方向，可用來「稀釋」過強的藥性，或在不移動座標的情況下滿足重量需求。</li>
        </ul>
    `,
    EXTEND: `
        <h3>🚀 延伸流 (Extend)</h3>
        <p>在此流派中，<strong>土屬性</strong>具有<strong>模仿與增幅</strong>的特性。</p>
        <ul style="text-align: left; margin-top: 10px; list-style-type: disc; padding-left: 20px;">
            <li><strong>座標影響：</strong>土屬性會複製另一種投入材料的方向。</li>
            <li><strong>範例：</strong>若搭配<strong>火 (Y軸)</strong>，土屬性也會產生 <strong>Y軸</strong> 的推力。</li>
            <li><strong>策略用途：</strong>用於大幅增強單一方向的藥效，適合追求極端座標的配方。</li>
        </ul>
    `,
    BIAS: `
        <h3>☯️ 偏性流 (Bias)</h3>
        <p>在此流派中，<strong>土屬性</strong>具有<strong>互補與平衡</strong>的特性。</p>
        <ul style="text-align: left; margin-top: 10px; list-style-type: disc; padding-left: 20px;">
            <li><strong>座標影響：</strong>土屬性會自動補足另一種材料「缺失」的軸向。</li>
            <li><strong>範例：</strong>若另一材料為<strong>火 (垂直向)</strong>，土屬性會轉為 <strong>水平向</strong> 推力。</li>
            <li><strong>策略用途：</strong>用於填補向量空缺，適合需要斜向座標或複雜平衡的配方。</li>
        </ul>
    `
};

// --- 2. 文案資料庫 (TextDB) ---
// 來源：TextID / TextContent 對照表（最終版）
const TextDB = {
    // --- 陰陽程度 ---
    1: "純陽",
    2: "陽性",
    3: "偏陽",
    4: "平衡",
    5: "偏陰",
    6: "陰性",
    7: "純陰",

    // --- 配方外觀描述 ---
    8: "紫紅色堅硬晶體，光芒耀眼",
    9: "灰白色或淡粉色細粉末",
    10: "五色斑斕的結晶，紅青色為主",
    11: "橘紅色至鮮紅色的細粉或藥丸",
    12: "流動的金色液體/紫色霜狀物",
    13: "紫色的霜狀結晶",
    14: "蓬鬆紅色粉末，夾雜汞珠",
    15: "紅黃相間的粉末或塊狀物",
    16: "紅/綠色支狀結晶(像珊瑚)",
    17: "五色分明，像打碎的彩色琉璃",

    // --- 服藥反應 ---
    18: "腹痛如絞、血便、全屬性暫時暴增後衰竭",
    19: "全身燥熱難耐、皮膚極度敏感、精神亢奮",
    20: "嘔吐藍綠色液體、腹痛、神智抽離",
    21: "手指震顫、患處腐肉脫落",
    22: "失去重力感、劇烈嘔吐、昏迷",
    23: "體溫驟降、神智清醒、鎮靜",
    24: "七竅流血、脫水、極度興奮後面色潮紅",
    25: "產生幻覺(無畏感)、焦慮消失",
    26: "消化道劇烈燒灼、吐血、夜間視力異常",
    27: "強烈視聽幻覺(見神靈)、精神解離",

    // --- 配方名稱 ---
    28: "九轉金丹",
    29: "五石散",
    30: "太一神精丹",
    31: "小還丹",
    32: "太清金液",
    33: "紫雪丹",
    34: "赤雪流珠丹",
    35: "三五神丹",
    36: "琅玕華丹",
    37: "五靈丹",

    // --- 材料外觀與性質描述 ---
    38: "地脈真紅，火性暴烈。能焚陰邪、換筋易骨，灼痛之感，乃藥力破舊之徵。",
    39: "洞天石乳，萬年陰凝。性寒而重，可鎮浮火、固根基，腹墜之感，正是氣沉丹田。",
    40: "靈動流珠，至陰至寒。引不朽之性入體，暫生麻痺，乃凡軀適應靈氣之象。",
    41: "不朽金精，百煉不壞。性穩而和，入腹沉重，正是金剛之質漸成於身。",
    42: "寒水玉質，清熱瀉火。能止內焚之亂，胃寒凝滯，僅為清火所需之代價。",
    43: "陽氣外顯，燥烈如焰。專剋蟲邪陰穢，以毒攻毒，火神巡體，百邪自退。",
    44: "太陽之種，陽火純粹。可燃命門真火，燥熱刺鼻，乃竊陽續命之險徑。",
    45: "木精翠魂，性烈而動。催吐陳積、洗滌內穢，吐色青綠，實為邪氣外洩。",
    46: "赤金之骨，質堅性燥。鍛筋煉骨之材，入腹如割，正是藥力鑄體之時。",
    47: "至陰沉鎮，重若玄虎。可壓心魔、定神識，遲鈍之感，乃心止如水之境。",
    48: "鉛中昇陽，烈性如日。能強提陽氣，焚身之險，乃逆轉衰敗的最後一途。",

    // --- 材料名稱 ---
    49: "丹砂",
    50: "鐘乳石",
    51: "水銀",
    52: "黃金",
    53: "石膏",
    54: "雄黃",
    55: "石硫黃",
    56: "曾青",
    57: "銅",
    58: "黑鉛",
    59: "黃丹",

    // --- 症狀分類 ---
    60: "安神/安眠",
    61: "振奮/快感",
    62: "補氣/補腎",
    63: "養顏/回春",
    64: "止痛/遮斷",

    // --- 煉丹須知 ---
    65: `
    <div class="rule-container">
        <ul class="rule-list">
            <li>
                <span class="rule-num">01</span>
                <div class="rule-text">煉丹核心是<span class="highlight">「對症下藥」</span>，請務必先至看診系統確認病患五行與症狀。</div>
            </li>
            <li>
                <span class="rule-num">02</span>
                <div class="rule-text">每個病患對<span class="warn">毒素</span>承受力不同，請謹慎控制劑量與屬性。</div>
            </li>
            <li>
                <span class="rule-num">03</span>
                <div class="rule-text">相剋法則：若丹藥五行<span class="warn">剋制</span>病患，<span class="warn">毒素將加倍</span>。</div>
            </li>
            <li>
                <span class="rule-num">04</span>
                <div class="rule-text">相生法則：若丹藥五行<span class="good">生助</span>病患，<span class="good">療效將加倍</span>。</div>
            </li>
            <li>
                <span class="rule-num">05</span>
                <div class="rule-text">配方奧義：不同的<span class="highlight">「材料組合」</span>與<span class="highlight">「重量比例」</span>將解鎖不同古方。</div>
            </li>
            <li>
                <span class="rule-num">06</span>
                <div class="rule-text">配方地圖：無從下手的時候可以<span class="highlight">「參考配方地圖上配方的座標」</span>，試著結果更接近該座標吧!</div>
            </li>
            <li>
                <span class="rule-num">07</span>
                <div class="rule-text">土屬性：不同流派<span class="highlight">使用土的方式不同</span>，詳情請見右上角按鈕查看。(該按鈕會於選擇流派後出現)</div>
            </li>
        </ul>
        <div class="rule-note">
            ⚠️ 測試版註記：目前版本中，「火侯」、「輔料」、「靜置」暫不影響數值，僅作儀式感體驗。
        </div>
    </div>
    `,

    // --- 材料名稱（續） ---
    66: "空青",
    67: "硝石",
    68: "松脂",
    69: "白玉",
    70: "雲母",
    71: "磁石",
    72: "殞鐵",
    73: "松煙",
    74: "赤石脂",

    // --- 材料詳細敘述 ---
    75: "神目之液，內藏玄漿。服之可啟異視，所見非常，實為靈覺初開之兆。",
    76: "化堅為水，性猛而急。能破積結、消頑疾，穿腸之險，乃破局之必然。",
    77: "琥珀凝精，溫潤黏合。可養臟固魂，腹黏難化，實為精氣不散之象。",
    78: "君子之髓，至純至淨。化漿服之，可洗凡質，煉成玉骨，唯工序極難。",
    79: "雲中之葉，層疊輕浮。服後不飢而輕身，乃闢穀漸成、濁氣漸離。",
    80: "歸元之母，引氣歸源。真氣內聚，身沉體僵，實為固本培元之徵。",
    81: "天外星屑，性異而躁。攝其星威入體，難馴而險，成則近乎天人。",
    82: "木火餘魂，陰質輕散。能吸濁留清，肺黑之象，乃其代人受過。",
    83: "赤龍之膏，性收而凝。止精固脫，便澀之苦，正是精氣內守之驗。",

    // --- 丹藥名稱 ---
    84: "黑鉛丹",
    85: "曾青神丹",
    86: "空青丹",
    87: "硝石丹",
    88: "松脂茯苓丹",
    89: "玉泉丸",
    90: "雄黃丹",
    91: "雲母丹",
    92: "磁石丹",
    93: "玄鐵丹",
    94: "紫石英丹",
    95: "赤石脂丹",
    96: "辟兵丹",
    97: "空青黑鉛丹",

    // --- 丹藥外觀 ---
    98: "漆黑如墨的沉重圓丸，表面泛著詭異的金屬油光。",
    99: "鮮豔的翠綠色晶體層層疊疊，偶爾夾雜著刺目的紅斑。",
    100: "外殼青綠如玉，核心透出隱約的灰黑，似有無名液體流動。",
    101: "半透明的乳白色結晶，狀如冰霜，遇熱氣便似要融化。",
    102: "琥珀色的半透明膠丸，質地溫潤，內裡隱約可見白色雲絮。",
    103: "乳白色的濃稠漿液，封於瓶中，輕搖時如油脂般掛壁。",
    104: "橘紅色與亮黃色交織的粉末，色澤警戒，令人不敢直視。",
    105: "層層剝落的銀白薄片，堆疊如雲，在光下閃爍著細碎珠光。",
    106: "表面粗糙的深黑色藥丸，質地堅硬，竟能吸附細小的鐵屑。",
    107: "泛著冷硬寒光的深黑金屬丸，沉重異常，彷彿握著一塊生鐵。",
    108: "紫黑色的透光晶體，內部有黑色絮狀物，如深夜的星空。",
    109: "暗紅色的膩滑藥丸，質地如凝固的油脂，表面偶有青色斑點。",
    110: "鮮紅與橘黃交錯的丹丸，色澤如火，彷彿隨時會燃燒起來。",
    111: "沉重的鉛灰色圓丸，隱約透出一抹詭異的青綠，死氣沉沉。",

    // --- 專屬服藥反應 ---
    112: "腹部絞痛、牙齦發黑、神經麻痺、貧血虛弱",
    113: "嘔吐藍綠色液體、肝痛、視覺異常",
    114: "聽覺敏銳、耳鳴、肌肉抽搐",
    115: "內臟燒灼、頭痛、缺氧反應",
    116: "消化不良、噁心、精神鎮靜",
    117: "口渴、便秘、身體沉重",
    118: "噁心、腹瀉、皮膚過敏",
    119: "腸胃結石、腹脹、便秘",
    120: "噁心嘔吐、腹瀉、體內有沉重下墜感（因吞食磁鐵礦粉），長期服用導致鐵質沉積。",
    121: "劇烈胃痛、黑便（鐵劑反應）、腐蝕性嘔吐。",
    122: "全身燥熱如火燒、心跳加速、皮膚發紅且對觸摸極度敏感，伴隨咳嗽（碳粉刺激）",
    123: "強烈的便秘（高嶺土吸水）、腹脹，隨後出現嘔吐感（銅離子刺激），讓人感到「氣實不飢」。",
    124: "全身發熱汗出、皮膚起紅疹、幻視（看見兵馬鬼神），精神極度亢奮且具有攻擊性。",
    125: "視力暫時模糊後產生色彩異常敏銳的錯覺、腹痛絞痛、肌肉麻痺。",

    //補白石英、紫石英
    126:"半透明的灰白色塊狀結晶，斷口呈貝殼狀，質地堅脆。",
    127:"紫黑色的透光晶體，內部有黑色絮狀物，如深夜的星空。",
    128:"白石英",
    129:"紫石英"
};

// ★★★ 新增：症狀資料庫 (SymptomsDB) ★★★
// 對應「症狀對應.csv」
const SymptomsDB = {
    1: { id: 1, element: Elements.WATER, descId: 60 },
    2: { id: 2, element: Elements.FIRE, descId: 61 },
    3: { id: 3, element: Elements.EARTH, descId: 62 },
    4: { id: 4, element: Elements.WOOD, descId: 63 },
    5: { id: 5, element: Elements.METAL, descId: 64 }
};
// --- 3. 材料資料庫 ---
// (完整版本，可直接整段取代)
const MaterialDB = {
    DAN_SHA: {
        nameId: 49, element: Elements.FIRE, yinYang: 2, max: 2,
        color: "#E34234", status: "天然", formula: "HgS",
        toxin: 10, heatToxin: 8.5, descId: 38
    },
    ZHONG_RU_SHI: {
        nameId: 50, element: Elements.METAL, yinYang: -1, max: 3,
        color: "#FBFBE8", status: "天然", formula: "CaCO₃",
        toxin: 0.5, heatToxin: 1, descId: 39
    },
    SHUI_YIN: {
        nameId: 51, element: Elements.METAL, yinYang: -3, max: 5,
        color: "#E5E4E2", status: "天然", formula: "Hg",
        toxin: 20, heatToxin: 5, descId: 40
    },
    HUANG_JIN: {
        nameId: 52, element: Elements.EARTH, yinYang: 1, max: 4,
        color: "#FFD700", status: "天然", formula: "Au",
        toxin: 0.1, heatToxin: 1, descId: 41
    },
    SHI_GAO: {
        nameId: 53, element: Elements.METAL, yinYang: -2, max: 3,
        color: "#FFFFFF", status: "天然", formula: "CaSO₄·2H₂O",
        toxin: 0.1, heatToxin: 1, descId: 42
    },
    XIONG_HUANG: {
        nameId: 54, element: Elements.EARTH, yinYang: 2, max: 2,
        color: "#FFA500", status: "天然", formula: "As₄S₄",
        toxin: 15, heatToxin: 65, descId: 43
    },
    SHI_LIU_HUANG: {
        nameId: 55, element: Elements.EARTH, yinYang: 3, max: 3,
        color: "#FDFD96", status: "天然", formula: "S 或 S8",
        toxin: 5, heatToxin: 1, descId: 44
    },
    ZENG_QING: {
        nameId: 56, element: Elements.WOOD, yinYang: 1, max: 2,
        color: "#40E0D0", status: "天然", formula: "Cu₂(OH)₂CO₃",
        toxin: 35, heatToxin: 1, descId: 45
    },
    TONG: {
        nameId: 57, element: Elements.FIRE, yinYang: 2, max: 2,
        color: "#B87333", status: "提煉", formula: "Cu",
        toxin: 5, heatToxin: 1, descId: 46
    },
    HEI_QIAN: {
        nameId: 58, element: Elements.WATER, yinYang: -3, max: 3,
        color: "#2F353B", status: "天然", formula: "Pb",
        toxin: 25, heatToxin: 1, descId: 47
    },
    HUANG_DAN: {
        nameId: 59, element: Elements.WATER, yinYang: 3, max: 4,
        color: "#FF4500", status: "人造", formula: "Pb₃O₄",
        toxin: 50, heatToxin: 1, descId: 48
    },

    // ===== 新增 ID 11 ~ 19 =====

    KONG_QING: {
        nameId: 66, element: Elements.WOOD, yinYang: -1, max: 3,
        color: "#2FA4A9", status: "天然", formula: "",
        toxin: 35, heatToxin: 1, descId: 75
    },
    XIAO_SHI: {
        nameId: 67, element: Elements.METAL, yinYang: 3, max: 5,
        color: "#EDEFF2", status: "天然", formula: "",
        toxin: 30, heatToxin: 1, descId: 76
    },
    SONG_ZHI: {
        nameId: 68, element: Elements.EARTH, yinYang: 1, max: 1,
        color: "#C9A24D", status: "天然", formula: "",
        toxin: 0.3, heatToxin: 1, descId: 77
    },
    BAI_YU: {
        nameId: 69, element: Elements.METAL, yinYang: -2, max: 1,
        color: "#F5F5F0", status: "天然", formula: "",
        toxin: 0.1, heatToxin: 1, descId: 78
    },
    YUN_MU: {
        nameId: 70, element: Elements.METAL, yinYang: -1, max: 1,
        color: "#E6E8EC", status: "天然", formula: "",
        toxin: 1, heatToxin: 1, descId: 79
    },
    CI_SHI: {
        nameId: 71, element: Elements.WATER, yinYang: 0, max: 2,
        color: "#4A4A4A", status: "天然", formula: "",
        toxin: 2, heatToxin: 1, descId: 80
    },
    XUAN_TIE: {
        nameId: 72, element: Elements.WATER, yinYang: 2, max: 4,
        color: "#1C1C1C", status: "天然", formula: "",
        toxin: 10, heatToxin: 1, descId: 81
    },
    SONG_YAN: {
        nameId: 73, element: Elements.WOOD, yinYang: -2, max: 2,
        color: "#2B2B2B", status: "人造", formula: "",
        toxin: 3, heatToxin: 1, descId: 82
    },
    CHI_SHI_ZHI: {
        nameId: 74, element: Elements.FIRE, yinYang: 0, max: 1,
        color: "#9C3A2B", status: "天然", formula: "",
        toxin: 0.5, heatToxin: 1, descId: 83
    },
    BAI_SHI_YING: {
        nameId: 128,              // 白石英
        element: Elements.METAL,
        yinYang: -2,
        max: 1,
        color: "#F0F8FF",
        status: "天然",
        formula: "",
        toxin: 0.1,
        heatToxin: 1,
        descId: 126
    },
    ZI_SHI_YING: {
        nameId: 129,              // 紫石英
        element: Elements.FIRE,
        yinYang: 2,
        max: 4,
        color: "#800080",
        status: "天然",
        formula: "",
        toxin: 2,
        heatToxin: 1,
        descId: 127
    }


};


// --- 4. 配方資料庫 ---
// (更新依據：配方表_v2.png)
const RecipeDB = [
    {
        nameId: 28, // 九轉金丹
        targets: ["DAN_SHA", "SHUI_YIN"],
        ratio: [0.7, 0.4],
        element: Elements.FIRE,
        yinYang: 3,
        grindTarget: 0.6,
        descId: 8,
        effectId: 18,
        symptoms: [2, 4]
    },
    {
        nameId: 29, // 五石散
        targets: ["ZHONG_RU_SHI", "SHI_LIU_HUANG"],
        ratio: [1.1, 0.5],
        element: Elements.METAL,
        yinYang: 3,
        grindTarget: 0.6,
        descId: 9,
        effectId: 19,
        symptoms: [2, 4]
    },
    {
        nameId: 30, // 太一神精丹
        targets: ["DAN_SHA", "ZENG_QING"],
        ratio: [1.5, 1.4],
        element: Elements.FIRE,
        yinYang: -1,
        grindTarget: 0.6,
        descId: 10,
        effectId: 20,
        symptoms: [1, 5]
    },
    {
        nameId: 31, // 小還丹
        targets: ["SHUI_YIN", "SHI_LIU_HUANG"],
        ratio: [1.3, 0.5],
        element: Elements.METAL,
        yinYang: 0,
        grindTarget: 0.6,
        descId: 11,
        effectId: 21,
        symptoms: [2, 3]
    },
    {
        nameId: 32, // 太清金液
        targets: ["SHUI_YIN", "HUANG_JIN"],
        ratio: [20.0, 10.0],
        element: Elements.METAL,
        yinYang: 2,
        grindTarget: 0.6,
        descId: 12,
        effectId: 22,
        symptoms: [3, 4]
    },
    {
        nameId: 33, // 紫雪丹
        targets: ["SHI_GAO", "DAN_SHA"],
        ratio: [10.0, 0.2],
        element: Elements.METAL,
        yinYang: -2,
        grindTarget: 0.6,
        descId: 13,
        effectId: 23,
        symptoms: [1, 5]
    },
    {
        nameId: 34, // 赤雪流珠丹
        targets: ["DAN_SHA", "XIONG_HUANG"],
        ratio: [2.0, 0.6],
        element: Elements.FIRE,
        yinYang: 2,
        grindTarget: 0.6,
        descId: 14,
        effectId: 24,
        symptoms: [3, 5]
    },
    {
        nameId: 35, // 三五神丹
        targets: ["XIONG_HUANG", "DAN_SHA"],
        ratio: [3.2, 1.5],
        element: Elements.EARTH,
        yinYang: 2,
        grindTarget: 0.6,
        descId: 15,
        effectId: 25,
        symptoms: [1, 3]
    },
    {
        nameId: 36, // 琅玕華丹
        targets: ["SHUI_YIN", "TONG"],
        ratio: [50.0, 30.0],
        element: Elements.METAL,
        yinYang: -1,
        grindTarget: 0.6,
        descId: 16,
        effectId: 26,
        symptoms: [3, 4]
    },
    {
        nameId: 37, // 五靈丹
        targets: ["DAN_SHA", "XIONG_HUANG"],
        ratio: [1.3, 0.8],
        element: Elements.ALL,
        yinYang: 0,
        grindTarget: 0.6,
        descId: 17,
        effectId: 27,
        symptoms: [2, 5]
    },

    // ===== 新增配方 =====

    {
        nameId: 84, // 黑鉛丹
        targets: ["HEI_QIAN", "SHUI_YIN"],
        ratio: [3.0, 1.4],
        element: Elements.WATER,
        yinYang: -3,
        grindTarget: 0.6,
        descId: 98,
        effectId: 112,
        symptoms: [1, 2]
    },
    {
        nameId: 85, // 曾青神丹
        targets: ["ZENG_QING", "DAN_SHA"],
        ratio: [1.5, 0.5],
        element: Elements.WOOD,
        yinYang: 2,
        grindTarget: 0.6,
        descId: 99,
        effectId: 113,
        symptoms: [4, 5]
    },
    {
        nameId: 86, // 空青丹
        targets: ["KONG_QING", "DAN_SHA"],
        ratio: [2.0, 0.5],
        element: Elements.WOOD,
        yinYang: -1,
        grindTarget: 0.6,
        descId: 100,
        effectId: 114,
        symptoms: [4, 5]
    },
    {
        nameId: 87, // 硝石丹
        targets: ["XIAO_SHI", "SHUI_YIN"],
        ratio: [2.0, 1.0],
        element: Elements.METAL,
        yinYang: 3,
        grindTarget: 0.6,
        descId: 101,
        effectId: 115,
        symptoms: [3, 5]
    },
    // {(因為是兩個土屬性，會待在原點，先拿掉)
    //     nameId: 88, // 松脂茯苓丹
    //     targets: ["SONG_ZHI", "XIONG_HUANG"],
    //     ratio: [5.0, 0.5],
    //     element: Elements.EARTH,
    //     yinYang: 1,
    //     grindTarget: 0.6,
    //     descId: 102,
    //     effectId: 116,
    //     symptoms: [3, 4]
    // },
    {
        nameId: 89, // 玉泉丸
        targets: ["BAI_YU", "ZHONG_RU_SHI"],
        ratio: [10.0, 4.0],
        element: Elements.METAL,
        yinYang: -2,
        grindTarget: 0.6,
        descId: 103,
        effectId: 117,
        symptoms: [1, 3]
    },
    {
        nameId: 90, // 雄黃丹
        targets: ["XIONG_HUANG", "SHUI_YIN"],
        ratio: [2.0, 1.0],
        element: Elements.EARTH,
        yinYang: 2,
        grindTarget: 0.6,
        descId: 104,
        effectId: 118,
        symptoms: [1, 5]
    },
    {
        nameId: 91, // 雲母丹
        targets: ["YUN_MU", "BAI_SHI_YING"],
        ratio: [5.5, 2.3],
        element: Elements.METAL,
        yinYang: -1,
        grindTarget: 0.6,
        descId: 105,
        effectId: 119,
        symptoms: [3, 5]
    },
    {
        nameId: 92, // 磁石丹
        targets: ["CI_SHI", "SHUI_YIN"],
        ratio: [4.2, 1.5],
        element: Elements.WATER,
        yinYang: -2,
        grindTarget: 0.6,
        descId: 106,
        effectId: 120,
        symptoms: [3, 1]
    },
    {
        nameId: 93, // 玄鐵丹
        targets: ["XUAN_TIE", "SONG_YAN"],
        ratio: [3.2, 2.0],
        element: Elements.WATER,
        yinYang: 1,
        grindTarget: 0.6,
        descId: 107,
        effectId: 121,
        symptoms: [1, 5]
    },
    {
        nameId: 94, // 紫石英丹
        targets: ["ZI_SHI_YING", "SONG_YAN"],
        ratio: [5.0, 2.5],
        element: Elements.FIRE,
        yinYang: 3,
        grindTarget: 0.6,
        descId: 108,
        effectId: 122,
        symptoms: [3, 1]
    },
    {
        nameId: 95, // 赤石脂丹
        targets: ["CHI_SHI_ZHI", "ZENG_QING"],
        ratio: [8.0, 3.0],
        element: Elements.FIRE,
        yinYang: 1,
        grindTarget: 0.6,
        descId: 109,
        effectId: 123,
        symptoms: [3, 5]
    },
    {
        nameId: 96, // 辟兵丹
        targets: ["DAN_SHA", "XIONG_HUANG"],
        ratio: [3.5, 1.5],
        element: Elements.FIRE,
        yinYang: 2,
        grindTarget: 0.6,
        descId: 110,
        effectId: 124,
        symptoms: [2, 5]
    },
    {
        nameId: 97, // 空青黑鉛丹
        targets: ["KONG_QING", "HEI_QIAN"],
        ratio: [4.0, 2.2],
        element: Elements.WOOD,
        yinYang: -3,
        grindTarget: 0.6,
        descId: 111,
        effectId: 125,
        symptoms: [4, 1]
    }
];



// --- 5. 大師研發建議語錄（修正版） ---
const MasterAdviceDB = {
    WRONG_MATERIAL:
        "呵，這材料嘛……算是『近親遠支』。替代得巧是本事，用得正才是底氣，還是回頭找對那味正主藥材吧。",
    WRONG_ELEMENT:
        "五行運轉倒不甚流暢，屬性之間還在暗中角力。若能再細調五行取向，藥性會乖得多。",
    WRONG_RATIO:
        "分量和研磨程度拿捏得有點放飛自我啊。再精細些，少一點豪氣，多一點算計，品質自然會再上一階。"
};
