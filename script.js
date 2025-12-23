// script.js - v55.4 (Visual Guides: Solid & Dashed Lines)
// 修正重點：
// 1. 在結算時記錄目標配方的座標 (tx, ty)。
// 2. 地圖繪製時新增：原點->玩家(實線)、原點->目標(虛線)。
// 3. 視覺輔助：實線為深灰，虛線為金色，幫助玩家判斷角度與距離差異。

// --- 0. 評語資料庫 ---
const CommentsDB = {
    U: ["傳說中的境界，神乎其技！", "此物一出，萬藥臣服。", "已臻化境，丹神降臨！"],
    S: ["奪天地造化之功！", "完美無瑕，神品！", "此丹只應天上有。", "妙手回春，絕妙！"],
    A: ["藥氣瑩潤，甚好。", "火候得當，上品。", "成色極佳，善哉。", "頗具靈氣，不錯。"],
    B: ["雖未極致，亦可用。", "中規中矩，尚可。", "藥性尚存，無礙。", "不過不失，良品。"],
    C: ["火候稍欠，勉強。", "雜質略多，慎用。", "形似神散，凡品。", "藥力微弱，惜哉。"],
    D: ["此物...甚是微妙。", "這...能吃嗎？", "下次記得看火...", "充滿了未知的味道。"],
    SLAG: ["炸爐了，快跑！", "一坨廢土，哀哉。", "空氣中充滿尷尬。", "煉丹...還是煉炭？"]
};

// --- 1. 全局變數 ---
let currentStep = 0;
let potMaterials = [];
let selectedMatID = null;
let currentWeight = 0.0;
let ritualStepIndex = 0;
const RitualSteps = ["磨碎", "生火", "輔料", "封口", "等待", "查看結果"];

let earthMode = "NEUTRAL"; // 當前遊戲模式: NEUTRAL, EXTEND, BIAS
let historyStorage = {
    NEUTRAL: [],
    EXTEND: [],
    BIAS: []
};
let currentHistoryTab = "NEUTRAL"; // 當前歷史面板顯示的頁籤
let historyCounter = 1;

// 研磨與生火變數
let grindInterval = null;
let grindProgress = 0;
let grindCoefficient = 0.0;
let fireTimer = null;
let fireProgress = 0;
const FIRE_MAX = 10.0;
let isFireComplete = false;
const FIRE_DECAY_PER_SEC = 0.2;
let auxiliaryProgress = 0;
const AUXILIARY_MAX = 3;
// ★★★ 修改建議：將常數改為可調整的變數 ★★★
// 原本是 const BASE_DISTANCE_COEF = 0.5;
// 改成下面這樣：

let BASE_RATIO = 0.5;   // 基礎佔比 (原本的 0.5)
let GRIND_RATIO = 0.5;  // 研磨佔比 (原本是 1 - 0.5 算出來的)

// 地圖控制 (保留原樣)
let mapHitZones = [];
let mapZoom = 3.0;
let mapPanX = 0;
let mapPanY = 0;
let isMapDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
// ★ 新增：用於記錄地圖滑鼠位置 (解決呼吸燈導致 Tooltip 消失的問題)
let mapMouseX = null;
let mapMouseY = null;

// --- 結算動畫變數 ---
let settlementAnimPos = null; // 動畫當前的座標 {x, y}
let isAnimatingSettlement = false; // 是否正在播放結算動畫

// ★★★ [修正] 新增 Data 變數來儲存完整的 UI 資訊 (評語、建議等) ★★★
let lastPlayerResult = null;         // 僅存座標 (給地圖用)
let previousPlayerResult = null;     // 僅存座標 (給地圖用)

let lastResultData = null;           // ★ 新增：存完整 UI 資料 (給右欄顯示用)
let previousResultData = null;       // ★ 新增：存完整 UI 資料 (給右欄顯示用)

let isShowingPreviousResult = false; // 切換開關

// ... (其餘常數保持不變) ...
// Icon 縮放調整參數
const ICON_BASE_RADIUS = 10;
const ICON_ZOOM_SCALE = 2;

// ★★★ 物理常數定義 (1:1 Scale) ★★★
const BASE_DISTANCE_COEF = 0.5; // 基礎佔 50%
const SLAG_FALLBACK_DISTANCE = 0.8; // 救援距離
const SLAG_DISTANCE_THRESHOLD = 1.5; // 爐渣門檻

// 背包系統變數
let inventoryStorage = [];

// script.js - 新增全域變數

// --- 呼吸燈動畫控制變數 ---
let highlightTargetId = null; // 當前要強調的配方 ID
let highlightAnimFrame = null; // 動畫 Frame ID
let highlightPulse = 0; // 呼吸燈的相位 (0~Math.PI*2)
// ★ 新增：控制是否在地圖上顯示未探索的配方
let showMapHints = true;
// ★ 新增：控制是否顯示煉製過程中的即時預覽箭頭 (預設開啟)
let showPreviewGuide = true;

// ★ 新增：當前病患資料
let currentPatientData = null;

// ★ 新增：暫存選擇的藥品 ID
let selectedDeliveryIds = [];
// ★ 請在此填入同事的問診系統網址 (若同資料夾可填相對路徑，如 "diagnosis.html")
const CLINIC_URL = "https://lindaagilebyte.github.io/Prototype_03/"; // 範例

// script.js - 全域變數區新增

// --- 通訊設定 ---
let transmissionMode = 'BROADCAST'; // 預設模式: 'BROADCAST' or 'MQTT'
const broadcastChannel = new BroadcastChannel('alchemy_clinic_channel');
// script.js - 修改 MQTT 初始化區塊

// ==========================================
// 1. 設定基礎常數
// ==========================================
const MQTT_BASE_TOPIC = 'thirza/alchemy/v1'; // 基礎頻道
let currentMqttTopic = MQTT_BASE_TOPIC;      // 最終使用的頻道 (預設為公開)
let mqttClient = null;

// ==========================================
// 2. 解析 URL 房間號 (Room ID)
// ==========================================
function getRoomIdFromUrl() {
    // 讀取網址 ? 後面的參數
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room_id'); // 抓取 key 為 room_id 的值

    // 簡單驗證：必須是 4 碼數字
    if (roomId && /^\d{4}$/.test(roomId)) {
        return roomId;
    }
    return null; // 沒抓到或格式不對
}

// ==========================================
// 3. 啟動 MQTT 連線
// ==========================================
function initMqttConnection() {
    // A. 決定 Topic
    const roomId = getRoomIdFromUrl();
    
    if (roomId) {
        // 如果有房間號，頻道變成專屬頻道
        currentMqttTopic = `${MQTT_BASE_TOPIC}/${roomId}`;
        console.log(`🔒 [系統] 已加入專屬房間，ID: ${roomId}`);
        
        // (選用) 可以在 UI 上顯示房間號，讓使用者知道自己在哪
        // document.getElementById('room-display').innerText = `Room: ${roomId}`;
    } else {
        // 沒房間號，使用公開頻道
        currentMqttTopic = MQTT_BASE_TOPIC;
        console.log(`🌍 [系統] 無房間號，加入公共頻道`);
    }

    // B. 開始連線 (建議用 EMQX)
    try {
        console.log(`[MQTT] 正在連線至頻道: ${currentMqttTopic}`);
        
        // 使用 EMQX Broker
        mqttClient = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
            clientId: 'Alchemy_' + Math.random().toString(16).substr(2, 8),
            keepalive: 60
        });

        // C. 連線成功後的訂閱
        mqttClient.on('connect', () => {
            console.log("%c[MQTT] ✅ 連線成功！", "color: #00ff00; font-weight: bold;");
            updateMqttStatusUI(true); // 讓燈號變綠

            // ★ 關鍵：訂閱剛剛決定好的 Topic
            mqttClient.subscribe(currentMqttTopic, (err) => {
                if (!err) {
                    console.log(`[MQTT] 已訂閱: ${currentMqttTopic}`);
                    
                    // 如果是用戶透過 Link 進來的，可以給個提示
                    if (roomId) {
                        // 這裡可以用你的 showToast 或 alert
                        console.log(`✨ 已連線至診間 #${roomId}`);
                    }
                }
            });
        });

        // ... (原本的 error, offline 監聽邏輯保持不變) ...
        
        // D. 訊息接收 (這裡也要改判斷 topic)
        mqttClient.on('message', (topic, message) => {
            // 確保訊息來自我們訂閱的那個頻道
            if (topic === currentMqttTopic) {
                try {
                    const payload = JSON.parse(message.toString());
                    
                    // 過濾自己發出的
                    if (payload.source === 'AlchemySystem') return;

                    // 處理邏輯 (原本的內容)
                    if (payload.test === true || (payload.message && !payload.diagnosis)) {
                         console.log("🧪 [系統] 收到測試訊號");
                         alert(`💬 來自醫館的訊息：\n\n${payload.message}`);
                         return;
                    }
                    
                    const patientData = payload.patientData || payload.data || payload;
                    handleIncomingPatientData(patientData, 'MQTT');

                } catch (e) {
                    console.warn("[MQTT] 解析失敗:", e);
                }
            }
        });

    } catch (e) {
        console.error("MQTT 初始化失敗:", e);
    }
}

// ==========================================
// 4. 執行初始化
// ==========================================
// 在 script.js 載入時直接執行，或放在 window.onload 裡
initMqttConnection();

// (檢查 script.js 裡是否有這段，應該不用改，只要確認 ID 對應正確即可)
function updateMqttStatusUI(isOnline) {
    const dot = document.getElementById('mqtt-status-dot');
    if (dot) {
        dot.className = isOnline ? "status-dot green" : "status-dot red";
        dot.title = isOnline ? "雲端已連線" : "雲端斷線中";
    }
}
// script.js - 更新後的切換傳輸模式 UI
function setTransmissionMode(mode) {
    transmissionMode = mode;

    // 1. 移除所有按鈕的 active 樣式
    document.getElementById('mode-btn-broadcast').classList.remove('active');
    document.getElementById('mode-btn-mqtt').classList.remove('active');

    // 2. 根據模式點亮對應按鈕
    if (mode === 'BROADCAST') {
        document.getElementById('mode-btn-broadcast').classList.add('active');
        console.log(`[系統] 切換傳輸模式: 📡 本地廣播`);
    } else {
        document.getElementById('mode-btn-mqtt').classList.add('active');
        console.log(`[系統] 切換傳輸模式: ☁️ 雲端 MQTT`);

        // 切換過來時，如果 MQTT 沒連線，可以嘗試重連或提示
        if (!mqttClient || !mqttClient.connected) {
            console.log("[系統] 雲端尚未連線...");
        }
    }
}
// script.js - 修改 window.onload

window.onload = function () {
    log("系統啟動中...");
    if (typeof MaterialDB === 'undefined' || typeof RecipeDB === 'undefined' || typeof TextDB === 'undefined') {
        log("❌ 嚴重錯誤：找不到 data.js 或 TextDB，請檢查檔案引用！");
        return;
    }
    // 確保 ElementColors 和 MasterAdviceDB 存在
    if (typeof ElementColors === 'undefined' || typeof MasterAdviceDB === 'undefined') {
        log("❌ 錯誤：data.js 中缺少 ElementColors 或 MasterAdviceDB 定義！");
        return;
    }
    log("系統啟動完成 (v13.0 Inventory Added)");

    // 1. 載入資料
    checkPatientData();
    loadHistoryFromStorage();
    loadInventoryFromStorage();

    // ★★★ 新增：初始化配方快取 (優化效能) ★★★
    refreshDiscoveredCache();

    // 2. 介面初始化
    showInstructionModal();
    setupMapInteractions();
    updateZoomUI();
    syncMapHintUI();
};
// script.js - 新增函式

// 顯示煉丹須知
function showInstructionModal() {
    const modal = document.getElementById('instruction-modal');
    const bodyText = document.getElementById('instruction-body');

    if (modal && bodyText) {
        // 從 TextDB 讀取 ID 65 的內容
        const content = TextDB[65] || "暫無說明內容";
        bodyText.innerHTML = content;

        modal.classList.remove('hidden');
    }
}

// 關閉煉丹須知
function closeInstructionModal() {
    const modal = document.getElementById('instruction-modal');
    if (modal) {
        modal.classList.add('hidden');

        // ★ 邏輯串接：關閉說明後，自動開啟流派選擇 (原本是 onload 直接開，現在移到這裡)
        // 這樣流程比較順：看說明 -> 選流派 -> 開始遊戲
        showGameModeSelection();
    }
}
window.toggleHistoryModal = function () {
    const modal = document.getElementById('history-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');

        // ★★★ [修正] 打開時，將頁籤切換到當前流派 (或上次停留的頁籤) ★★★
        // 這樣按鈕的 Active 樣式才會正確初始化
        if (!currentHistoryTab) currentHistoryTab = earthMode;
        switchHistoryTab(currentHistoryTab);
    } else {
        modal.classList.add('hidden');
    }
};


function switchHistoryTab(tab) {
    currentHistoryTab = tab;

    // ★★★ [修正] Selector 改為 .history-tab-btn 以匹配 HTML 與 CSS ★★★
    document.querySelectorAll('.history-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const map = {
        NEUTRAL: 0,
        EXTEND: 1,
        BIAS: 2
    };
    // ★★★ [修正] Selector 改為 .history-tab-btn ★★★
    const btns = document.querySelectorAll('.history-tab-btn');
    if (btns[map[tab]]) btns[map[tab]].classList.add('active');

    renderHistory();
}

// ★★★ [補回] 單筆刪除功能 ★★★
window.deleteHistoryItem = function (index, event) {
    if (event) event.stopPropagation();

    if (confirm("確定要刪除這筆紀錄嗎？")) {
        // 從當前選中的頁籤陣列中移除
        historyStorage[currentHistoryTab].splice(index, 1);
        localStorage.setItem('alchemy_history_storage', JSON.stringify(historyStorage));

        // 如果剛好刪到最後一筆，要更新地圖顯示變數以免出錯
        if (historyStorage[earthMode].length === 0) {
            lastPlayerResult = null;
            previousPlayerResult = null;
        }

        renderHistory();
    }
};
window.clearHistoryWithConfirm = function () {
    clearCurrentTabHistory();
};

function log(msg) {
    const consoleDiv = document.getElementById('console-output');
    if (!consoleDiv) return;
    const p = document.createElement('div');
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    p.textContent = `[${time}] ${msg}`;
    p.style.borderBottom = "1px solid #444";
    consoleDiv.prepend(p);
}

function switchPanel(panelID) {
    document.querySelectorAll('.panel-view').forEach(el => el.classList.add('hidden'));
    const panel = document.getElementById(panelID);
    if (panel) panel.classList.remove('hidden');
}

// script.js - 修改 showGameModeSelection (加入預覽開關)

// script.js - 修改 showGameModeSelection (開關移至下方)

function showGameModeSelection() {
    const title = document.getElementById('step-title');
    const instruct = document.getElementById('instruction-text');
    const grid = document.getElementById('material-grid');

    // 隱藏流派說明按鈕 (選完才出現)
    const infoBtn = document.getElementById('mode-info-btn');
    if (infoBtn) infoBtn.classList.add('hidden');

    // 顯示地圖遮罩
    const mapOverlay = document.getElementById('map-overlay');
    if (mapOverlay) mapOverlay.classList.remove('hidden');

    clearGameState();

    title.textContent = "煉丹流派選擇";
    instruct.textContent = "請選擇本局「土屬性」的物理特性：";

    switchPanel('material-grid');

    // 1. 設定容器樣式 (使用 Wrapper 進行垂直排版)
    grid.className = "mode-selection-wrapper";
    grid.innerHTML = "";

    // --- A. 建立流派按鈕區 (Container) ---
    const btnContainer = document.createElement('div');
    btnContainer.className = "mode-selection-container"; // 橫向排列

    const createModeBtn = (name, desc, color, modeKey) => {
        const btn = document.createElement('div');
        btn.className = "mat-btn mode-btn";
        btn.style.backgroundColor = color;
        btn.innerHTML = `
            <div class="mode-name">${name}</div>
            <div class="mode-desc">${desc}</div>
        `;

        btn.onclick = () => {
            earthMode = modeKey;
            currentHistoryTab = modeKey;
            log(`玩家選擇流派：【${name}】 (預覽: ${showPreviewGuide ? 'ON' : 'OFF'})`);
            startGame();
        };
        return btn;
    };

    btnContainer.appendChild(createModeBtn("🛡️ 中和流", "土屬性座標為 0<br>用於稀釋藥性", "#4a69bd", "NEUTRAL"));
    btnContainer.appendChild(createModeBtn("🚀 延伸流", "土屬性模仿他者<br>大幅增強藥效", "#e58e26", "EXTEND"));
    btnContainer.appendChild(createModeBtn("☯️ 偏性流派", "土屬性補足缺失<br>填補另一軸向", "#8e44ad", "BIAS"));

    // --- B. 建立預覽開關區 (Toggle) ---
    const toggleDiv = document.createElement('div');
    toggleDiv.className = "preview-toggle-box";
    toggleDiv.innerHTML = `
        <input type="checkbox" id="preview-mode-switch" class="preview-toggle-input" ${showPreviewGuide ? 'checked' : ''}>
        <label for="preview-mode-switch" class="preview-toggle-label">開啟羅盤指引 (路徑預覽)</label>
    `;

    // 綁定事件
    toggleDiv.querySelector('input').addEventListener('change', (e) => {
        showPreviewGuide = e.target.checked;
        // 如果想更即時反饋，可以在這裡加個 log
        // console.log(`預覽模式: ${showPreviewGuide}`);
    });

    // --- C. 依序加入畫面 (決定上下順序) ---
    grid.appendChild(btnContainer); // 1. 按鈕在上面
    grid.appendChild(toggleDiv);    // 2. 開關在下面
}

// script.js - 修改 startGame (解除遮罩)

function startGame() {
    console.log("[系統] 遊戲開始，初始化...");
    const grid = document.getElementById('material-grid');
    if (grid) {
        grid.className = "";
        grid.style = "";
    }

    // 顯示流派說明按鈕
    const infoBtn = document.getElementById('mode-info-btn');
    if (infoBtn) infoBtn.classList.remove('hidden');

    // ★ 新增：隱藏地圖遮罩 (加入 hidden class)
    const mapOverlay = document.getElementById('map-overlay');
    if (mapOverlay) mapOverlay.classList.add('hidden');

    // 停止地圖導航動畫 (若有)
    if (typeof stopMapHighlight === 'function') {
        stopMapHighlight();
    }

    refreshGameStateFromHistory();
    clearGameState();

    initMaterialGrid();
    calculateAllRecipeCoordinates();

    // 確保地圖重繪一次以正確顯示
    drawRecipeMap();

    setStep(0);
}

function setStep(step) {
    currentStep = step;
    const title = document.getElementById('step-title');
    const instruct = document.getElementById('instruction-text');
    const contentPanel = document.getElementById('content-panel');
    const matGrid = document.getElementById('material-grid');
    const weighPanel = document.getElementById('weighing-panel');

    // 清除舊的佈局 class
    contentPanel.classList.remove('split-layout');
    if (matGrid) matGrid.classList.remove('disabled-grid');

    if (step === 0) {
        title.textContent = "步驟 1/2：選擇主要材料";
        instruct.textContent = "請選擇投入量較多的材料。";
        switchPanel('material-grid'); // 顯示材料列表

    } else if (step === 1) {
        title.textContent = "步驟 1/2：秤重";
        prepareWeighingPanel();

        // ★★★ 修改：切換至秤重面板 (因為 initMaterialGrid 修好了，這裡會自動隱藏材料列表) ★★★
        switchPanel('weighing-panel');

    } else if (step === 2) {
        title.textContent = "步驟 2/2：選擇次要材料";
        instruct.textContent = "請選擇投入量較少的材料。";
        switchPanel('material-grid');
        // 清除選取狀態
        document.querySelectorAll('.mat-btn').forEach(b => b.classList.remove('selected-mat'));

    } else if (step === 3) {
        title.textContent = "步驟 2/2：秤重";
        prepareWeighingPanel();

        // ★★★ 修改：切換至秤重面板 ★★★
        switchPanel('weighing-panel');

    } else if (step === 4) {
        title.textContent = "煉製儀式";
        instruct.textContent = "研磨程度將影響藥性發揮程度，請根據需求研磨";
        updatePotList();
        ritualStepIndex = 0;
        resetRitualStates();
        updateRitualBtn();
        switchPanel('ritual-panel');

    } else if (step === 5) {
        title.textContent = "結算中";
        switchPanel('result-panel');
        const lingeringBtn = document.getElementById('grind-next-btn');
        if (lingeringBtn) lingeringBtn.remove();
        runResultSequence();
    }
}

// --- 3. 核心計算邏輯 ---
function getBaseDirection(element) {
    switch (element) {
        case Elements.METAL: return { x: -1, y: 0 };
        case Elements.WOOD: return { x: 1, y: 0 };
        case Elements.WATER: return { x: 0, y: 1 };
        case Elements.FIRE: return { x: 0, y: -1 };
        default: return { x: 0, y: -1 };
    }
}

function resolveDirection(myElement, otherElement) {
    if (myElement === Elements.EARTH) {
        if (earthMode === "NEUTRAL") {
            return { x: 0, y: 0 };
        }
        else if (earthMode === "BIAS") {
            if (otherElement !== Elements.EARTH) {
                const otherDir = getBaseDirection(otherElement);
                if (otherDir.y === 0) return { x: 0, y: 1 };
                else return { x: 1, y: 0 };
            }
            return { x: 0, y: 0 };
        }
        else {
            if (otherElement !== Elements.EARTH) {
                return getBaseDirection(otherElement);
            } else {
                return { x: 0, y: -1 };
            }
        }
    }
    return getBaseDirection(myElement);
}

// script.js - 修改 calculateCoordinate (加入同屬性共鳴機制)

function calculateCoordinate(mat1, weight1, mat2, weight2, grindRate) {
    let m1, m2, w1, w2;
    // 排序：確保 m1 是權重較大的那個 (雖然數學上加法沒差，但為了邏輯一致性)
    if (weight1 >= weight2) { m1 = mat1; w1 = weight1; m2 = mat2; w2 = weight2; }
    else { m1 = mat2; w1 = weight2; m2 = mat1; w2 = weight1; }

    let totalW = w1 + w2;
    if (totalW === 0) return { x: 0, y: 0 };

    if (grindRate === undefined) grindRate = 0;

    // 研磨影響係數 (從全域變數讀取配置)
    let effectiveRate = BASE_RATIO + (GRIND_RATIO * grindRate);

    // 1. 計算原始強度 (這是加權平均，結果不會超過 Max)
    let rawMag1 = m1.max * effectiveRate * (w1 / totalW);
    let rawMag2 = m2.max * effectiveRate * (w2 / totalW);

    // ★★★ 新增：同屬性共鳴加成 (Resonance Bonus) ★★★
    let resonanceBonus = 1.0;

    // 修改判斷條件：
    // 1. 屬性相同
    // 2. 不是全屬性
    // 3. ★ 新增：次要材料重量必須大於 0 (避免單一材料預覽時誤觸發)
    if (m1.element === m2.element && m1.element !== Elements.ALL && w2 > 0) {
        resonanceBonus = 1.0 + (totalW * 0.1);
    }

    // 3. 取得向量方向
    let v1 = resolveDirection(m1.element, m2.element);
    let v2 = resolveDirection(m2.element, m1.element);

    // 4. ★ 將 Bonus 乘入最終向量計算
    // (向量1強度 + 向量2強度) * 共鳴倍率
    let vecX = ((v1.x * rawMag1) + (v2.x * rawMag2)) * resonanceBonus;
    let vecY = ((v1.y * rawMag1) + (v2.y * rawMag2)) * resonanceBonus;

    // 5. 四捨五入到小數點第二位
    let finalX = Math.round(vecX * 100) / 100;
    let finalY = Math.round(vecY * 100) / 100;

    return { x: finalX, y: finalY };
}

// script.js - 新增函式

// script.js - 修改 calculateCurrentPreviewData

function calculateCurrentPreviewData() {
    // 1. 如果已經結算，不顯示
    if (currentStep === 5) return null;

    // ★★★ 2. 新增檢查：如果預覽模式被關閉，直接不回傳資料 ★★★
    if (!showPreviewGuide) return null;

    let m1 = null, w1 = 0;
    let m2 = null, w2 = 0;

    // ★★★ 修改：預設研磨係數改為 0.0 ★★★
    // 公式：Effective = 0.5 + (0.5 * grind)
    // Grind=0 -> Effective=0.5 (實線佔一半，虛線延伸另一半)
    let previewGrind = 0.0;


    if (currentStep <= 1 && selectedMatID) {
        m1 = MaterialDB[selectedMatID];
        w1 = currentWeight > 0 ? currentWeight : 0.1;
        m2 = null; w2 = 0;
    }
    else if (currentStep >= 2 && currentStep <= 3 && potMaterials.length > 0 && selectedMatID) {
        let pm = potMaterials[0];
        m1 = MaterialDB[pm.id]; w1 = pm.weight;
        m2 = MaterialDB[selectedMatID]; w2 = currentWeight;
    }
    else if (currentStep === 4 && potMaterials.length >= 2) {
        let pm1 = potMaterials[0]; let pm2 = potMaterials[1];
        m1 = MaterialDB[pm1.id]; w1 = pm1.weight;
        m2 = MaterialDB[pm2.id]; w2 = pm2.weight;
        if (ritualStepIndex === 0) previewGrind = grindProgress / 100;
        else previewGrind = grindCoefficient > 0 ? grindCoefficient : 0.0;
    }
    else { return null; }

    if (!m1) return null;
    if (!m2) { m2 = m1; w2 = 0; }

    let maxRes = calculateCoordinate(m1, w1, m2, w2, 1.0);
    let curRes = calculateCoordinate(m1, w1, m2, w2, previewGrind);

    return { max: maxRes, cur: curRes };
}

function calculateAllRecipeCoordinates() {
    RecipeDB.forEach(r => {
        let mat1 = MaterialDB[r.targets[0]];
        let mat2 = MaterialDB[r.targets[1]];
        let result = calculateCoordinate(mat1, r.ratio[0], mat2, r.ratio[1], r.grindTarget);
        r.targetX = result.x;
        r.targetY = result.y;
    });

    log("--- 📋 本局配方目標座標一覽 (1:1 Scale) ---");
    RecipeDB.forEach(r => {
        const rName = TextDB[r.nameId] || "未命名配方";
        log(`【${rName}】 X: ${r.targetX.toFixed(2)}, Y: ${r.targetY.toFixed(2)}`);
    });
    log("--------------------------------");

    drawRecipeMap();
}

// script.js - 修改 setupMapInteractions

function setupMapInteractions() {
    const canvas = document.getElementById('recipe-map');
    if (!canvas) return;

    // ===== 滾輪縮放 =====
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) mapZoomIn();
        else mapZoomOut();
    }, { passive: false });

    // ===== 拖曳平移 =====
    canvas.addEventListener('mousedown', (e) => {
        if (mapZoom <= 1.0) return;
        isMapDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.classList.add('grabbing');
    });

    window.addEventListener('mousemove', (e) => {
        // 1. 拖曳邏輯 (保持不變)
        if (isMapDragging) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;

            mapPanX += dx;
            mapPanY += dy;

            checkMapBoundaries(canvas.width, canvas.height);
            
            // ★ 改用節流請求
            requestMapRedraw(); 
            return;
        }

        // 2. Hover Tooltip 邏輯
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 更新全域滑鼠位置 (讓 drawRecipeMap 讀取)
        mapMouseX = mouseX;
        mapMouseY = mouseY;

        // ★ 改用節流請求，而不是直接 drawRecipeMap()
        requestMapRedraw();
    });

    window.addEventListener('mouseup', () => {
        isMapDragging = false;
        canvas.classList.remove('grabbing');
    });

    // ===== 滑鼠離開畫布時清除 hover =====
    canvas.addEventListener('mouseleave', () => {
        mapMouseX = null;
        mapMouseY = null;
        if (!isMapDragging) {
            requestMapRedraw();
        }
    });
}

// ★★★ 新增：地圖重繪請求器 (節流閥) ★★★
function requestMapRedraw() {
    if (!isMapRedrawPending) {
        isMapRedrawPending = true;
        requestAnimationFrame(() => {
            drawRecipeMap(); // 真正執行繪圖
            isMapRedrawPending = false; // 解鎖，允許下一次請求
        });
    }
}


function checkMapBoundaries(w, h) {
    const maxOffset = (w / 2) * (mapZoom - 1);

    if (mapPanX > maxOffset) mapPanX = maxOffset;
    if (mapPanX < -maxOffset) mapPanX = -maxOffset;
    if (mapPanY > maxOffset) mapPanY = maxOffset;
    if (mapPanY < -maxOffset) mapPanY = -maxOffset;
}

window.mapZoomIn = function () {
    if (mapZoom < 10.0) {
        mapZoom = Math.min(10.0, mapZoom + 0.5);
        updateZoomUI();
        drawRecipeMap();
    }
};

window.mapZoomOut = function () {
    if (mapZoom > 1.0) {
        mapZoom = Math.max(1.0, mapZoom - 0.5);
        if (mapZoom === 1.0) {
            mapPanX = 0;
            mapPanY = 0;
        } else {
            const canvas = document.getElementById('recipe-map');
            if (canvas) checkMapBoundaries(canvas.width, canvas.height);
        }
        updateZoomUI();
        drawRecipeMap();
    }
};

window.mapResetView = function () {
    mapZoom = 3.0; // Reset to 3.0
    mapPanX = 0;
    mapPanY = 0;
    updateZoomUI();
    drawRecipeMap();
};

function updateZoomUI() {
    const ind = document.getElementById('zoom-indicator');
    const canvas = document.getElementById('recipe-map');
    if (ind) ind.textContent = Math.round(mapZoom * 100) + "%";

    if (canvas) {
        if (mapZoom > 1.0) canvas.classList.add('grabbable');
        else {
            canvas.classList.remove('grabbable');
            canvas.classList.remove('grabbing');
        }
    }
}

// script.js - 修改 drawRecipeMap

function drawRecipeMap(hoverX = mapMouseX, hoverY = mapMouseY) {
    const canvas = document.getElementById('recipe-map');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const w = canvas.width;
    const h = canvas.height;

    // 1. 清空畫布
    ctx.clearRect(0, 0, w, h);

    const cx = (w / 2) + mapPanX;
    const cy = (h / 2) + mapPanY;

    // --- 設定比例尺 ---
    const viewRadiusUnits = 10.0 / mapZoom;
    const canvasRadiusPx = w / 2;
    const pixelsPerUnit = canvasRadiusPx / viewRadiusUnits;
    let currentIconRadius = ICON_BASE_RADIUS + (mapZoom - 1) * ICON_ZOOM_SCALE;

    // --- 2. 背景與象限色 (保持不變) ---
    const far = w * 5;
    ctx.fillStyle = "#E0F7FA"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - far, cy - far); ctx.lineTo(cx + far, cy - far); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#F1F8E9"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + far, cy - far); ctx.lineTo(cx + far, cy + far); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#FBE9E7"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + far, cy + far); ctx.lineTo(cx - far, cy + far); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ECEFF1"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - far, cy + far); ctx.lineTo(cx - far, cy - far); ctx.closePath(); ctx.fill();

    // --- 3. 浮水印 (保持不變) ---
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const fontSize = 50 + (60 / mapZoom);
    ctx.font = `bold ${fontSize}px 'Microsoft JhengHei'`;
    const distPx = 50 + (100 / mapZoom);
    ctx.fillStyle = "rgba(0, 191, 255, 0.15)"; ctx.fillText("水", cx, cy - distPx);
    ctx.fillStyle = "rgba(50, 205, 50, 0.15)"; ctx.fillText("木", cx + distPx, cy);
    ctx.fillStyle = "rgba(255, 69, 0, 0.15)"; ctx.fillText("火", cx, cy + distPx);
    ctx.fillStyle = "rgba(112, 128, 144, 0.15)"; ctx.fillText("金", cx - distPx, cy);

    // --- 4. 格線與軸線 (保持不變) ---
    const subGridStepUnits = 0.2;
    const subGridStepPx = subGridStepUnits * pixelsPerUnit;
    const labelFontSize = 10 + (mapZoom - 1) * 2;
    ctx.font = `bold ${labelFontSize}px Consolas`;
    ctx.lineWidth = 1;

    // X/Y Grid
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const startX = Math.floor((0 - cx) / subGridStepPx);
    const endX = Math.ceil((w - cx) / subGridStepPx);
    for (let i = startX; i <= endX; i++) {
        let val = i * subGridStepUnits; if (Math.abs(val) < 0.001) continue;
        let x = cx + val * pixelsPerUnit;
        const isMajor = Math.abs(val - Math.round(val)) < 0.001;
        ctx.strokeStyle = isMajor ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)";
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        if (isMajor) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillText(Math.round(val).toString(), x, cy + 4); }
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    const startY = Math.floor((0 - cy) / subGridStepPx);
    const endY = Math.ceil((h - cy) / subGridStepPx);
    for (let i = startY; i <= endY; i++) {
        let val = i * subGridStepUnits; if (Math.abs(val) < 0.001) continue;
        let y = cy + val * pixelsPerUnit;
        const isMajor = Math.abs(val - Math.round(val)) < 0.001;
        ctx.strokeStyle = isMajor ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)";
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        if (isMajor) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillText((-Math.round(val)).toString(), cx - 4, y); }
    }

    // 十字軸
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00BFFF"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, 0); ctx.stroke();
    ctx.strokeStyle = "#339933"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.strokeStyle = "#FF4500"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, h); ctx.stroke();
    ctx.strokeStyle = "#607D8B"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(0, cy); ctx.stroke();

    // --- 5. 繪製配方點 (保持不變) ---
    ctx.font = `bold ${10 + (mapZoom - 1) * 2}px 'Microsoft JhengHei'`;
    mapHitZones = [];
    let hoveredRecipe = null;

    RecipeDB.forEach(r => {
        const drawX = cx + (r.targetX * pixelsPerUnit);
        const drawY = cy - (r.targetY * pixelsPerUnit);
        const rName = TextDB[r.nameId] || "?";

        if (drawX < -50 || drawX > w + 50 || drawY < -50 || drawY > h + 50) return;

        const isDiscovered = (typeof isRecipeDiscovered === 'function') ? isRecipeDiscovered(r.nameId) : false;

        if (!isDiscovered && highlightTargetId !== r.nameId && !showMapHints) return;

        mapHitZones.push({ x: drawX, y: drawY, r: currentIconRadius * 1.5, name: rName, tx: r.targetX, ty: r.targetY });

        // 呼吸燈
        if (highlightTargetId === r.nameId) {
            const pulseRadius = currentIconRadius * 1.5 + Math.sin(highlightPulse) * 5;
            const alpha = 0.5 + Math.sin(highlightPulse) * 0.3;
            ctx.save();
            ctx.beginPath(); ctx.arc(drawX, drawY, pulseRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(127, 17, 224,  ${alpha})`; ctx.fill();
            ctx.beginPath(); ctx.arc(drawX, drawY, pulseRadius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(127, 17, 224,  ${alpha * 0.5})`; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        }

        // 懸停判定
        let isHover = false;
        if (hoverX !== null && hoverY !== null) {
            let dx = hoverX - drawX; let dy = hoverY - drawY;
            if (dx * dx + dy * dy <= Math.pow(currentIconRadius * 1.8, 2)) {
                hoveredRecipe = { name: rName, x: drawX, y: drawY, tx: r.targetX, ty: r.targetY, isDiscovered: isDiscovered };
                isHover = true;
            }
        }

        // 配方點繪製
        const isHint = (!isDiscovered && highlightTargetId !== r.nameId);
        if (isHint) { ctx.save(); ctx.globalAlpha = 0.6; }

        let baseColor = isDiscovered ? "#d4af37" : "#555555";
        let borderColor = isDiscovered ? "#777777" : "#d4af37";
        const isTargetHover = (hoveredRecipe && hoveredRecipe.name === rName);

        ctx.fillStyle = isTargetHover ? "#fff" : baseColor;
        ctx.beginPath(); ctx.arc(drawX, drawY, currentIconRadius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = borderColor; ctx.lineWidth = isTargetHover ? 2 : 1.5; ctx.stroke();

        ctx.textBaseline = "middle"; ctx.textAlign = "center";
        if (isDiscovered) {
            const char = rName.length > 1 ? rName[1] : rName[0];
            ctx.fillStyle = isTargetHover ? "#000" : "#fff";
            ctx.font = `bold ${highlightTargetId === r.nameId ? 12 + (mapZoom - 1) * 2 : 10 + (mapZoom - 1) * 2}px 'Microsoft JhengHei'`;
            ctx.fillText(char, drawX, drawY + (mapZoom > 2 ? 1 : 1));
        } else {
            ctx.fillStyle = "#fff"; ctx.font = `${8 + (mapZoom - 1) * 2}px Arial`;
            ctx.fillText("🔒", drawX, drawY + (mapZoom > 2 ? 1 : 1));
        }
        if (isHint) { ctx.restore(); }
    });

    // --- 6. 玩家結果連線與 Icon ---
    const resultToShow = isShowingPreviousResult ? previousPlayerResult : lastPlayerResult;

    if (resultToShow) {
        const pDrawX = cx + (resultToShow.x * pixelsPerUnit);
        const pDrawY = cy - (resultToShow.y * pixelsPerUnit);

        // 畫實線 (原點 -> 結果)
        // ★ 如果正在動畫中，線條也畫出來，讓 Icon 沿著線跑，效果比較好
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pDrawX, pDrawY);
        ctx.strokeStyle = isShowingPreviousResult ? "rgba(50, 50, 50, 0.4)" : "rgba(50, 50, 50, 0.8)";
        ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();

        // 畫虛線 (目標引導)
        if (resultToShow.tx !== null && resultToShow.ty !== null) {
            const tDrawX = cx + (resultToShow.tx * pixelsPerUnit);
            const tDrawY = cy - (resultToShow.ty * pixelsPerUnit);
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tDrawX, tDrawY);
            ctx.strokeStyle = isShowingPreviousResult ? "rgba(212, 175, 55, 0.4)" : "rgba(212, 175, 55, 0.8)";
            ctx.lineWidth = 2; ctx.setLineDash([10, 5]); ctx.stroke(); ctx.setLineDash([]);
        }

        // ★★★ 修改：根據動畫狀態決定 Icon 位置 ★★★
        let iconX, iconY;

        if (isAnimatingSettlement && settlementAnimPos && !isShowingPreviousResult) {
            // 動畫模式：Icon 在移動中
            iconX = cx + (settlementAnimPos.x * pixelsPerUnit);
            iconY = cy - (settlementAnimPos.y * pixelsPerUnit);
        } else {
            // 靜態模式：Icon 在終點
            iconX = pDrawX;
            iconY = pDrawY;
        }

        // 檢查邊界與懸停
        if (iconX >= -50 && iconX <= w + 50 && iconY >= -50 && iconY <= h + 50) {
            if (hoverX === null) {
                mapHitZones.push({ x: iconX, y: iconY, r: currentIconRadius * 1.5, name: resultToShow.name, tx: resultToShow.x, ty: resultToShow.y });
            }
            if (hoverX !== null && hoverY !== null) {
                let dx = hoverX - iconX; let dy = hoverY - iconY;
                if (dx * dx + dy * dy <= Math.pow(currentIconRadius * 1.5, 2)) {
                    hoveredRecipe = {
                        name: resultToShow.name, x: iconX, y: iconY, tx: resultToShow.x, ty: resultToShow.y, isDiscovered: true
                    };
                }
            }

            // 使用共用函式畫 Icon
            // 舊結果用灰色，新結果(含動畫中)用金色
            const isGold = !isShowingPreviousResult;
            const iconText = isShowingPreviousResult ? "舊" : "丹";
            drawDanIcon(ctx, iconX, iconY, currentIconRadius, iconText, isGold);
        }
    }

    // --- 7. 即時預覽箭頭 (製作過程中) ---
    // ★★★ 修改：Icon 移到原點，畫出箭頭 ★★★
    const preview = calculateCurrentPreviewData();
    if (preview) {
        const maxDrawX = cx + (preview.max.x * pixelsPerUnit);
        const maxDrawY = cy - (preview.max.y * pixelsPerUnit);
        const curDrawX = cx + (preview.cur.x * pixelsPerUnit);
        const curDrawY = cy - (preview.cur.y * pixelsPerUnit);

        // 1. 畫虛線箭頭 (最大潛力)
        drawArrow(ctx, cx, cy, maxDrawX, maxDrawY, "rgba(212, 175, 55, 0.6)", true);

        // 2. 畫實線箭頭 (當前有效)
        drawArrow(ctx, cx, cy, curDrawX, curDrawY, "#888", false);

        // 3. 畫 Icon (在原點！)
        // 樣式改為統一的「丹」字風格
        drawDanIcon(ctx, cx, cy, currentIconRadius, "丹", true); // 半徑小一點點區分，但風格一致
        //drawDanIcon(ctx, iconX, iconY, currentIconRadius, iconText, isGold)
    }

    // --- 8. Tooltip ---
    if (hoveredRecipe) {
        const prefix = hoveredRecipe.isDiscovered === false ? "🔒 " : "";
        const text = `${prefix}${hoveredRecipe.name} [${hoveredRecipe.tx.toFixed(2)}, ${hoveredRecipe.ty.toFixed(2)}]`;
        drawTooltip(ctx, text, hoveredRecipe.x, hoveredRecipe.y, w, h);
    }
}

// script.js - 新增輔助繪圖函式

// 畫箭頭
function drawArrow(ctx, fromX, fromY, toX, toY, color, isDashed) {
    const headlen = 8; // 箭頭大小
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 如果距離太短，就不畫，避免圖形混亂
    if (dist < 2) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    if (isDashed) ctx.setLineDash([5, 5]);
    else ctx.setLineDash([]);

    // 畫線
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // 畫箭頭 (箭頭永遠是實心)
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(toX, toY);
    ctx.fill();

    ctx.restore();
}

// 畫統一風格的丹藥 Icon
function drawDanIcon(ctx, x, y, radius, text, isGold = true) {
    ctx.save();

    // 底色
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 邊框
    ctx.strokeStyle = isGold ? "#d4af37" : "#888";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 文字
    ctx.fillStyle = isGold ? "#d4af37" : "#888";
    // 根據半徑動態調整字體大小
    const fontSize = Math.max(10, Math.floor(radius * 1.2));
    ctx.font = `bold ${fontSize}px 'Microsoft JhengHei'`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + (fontSize * 0.1)); // 微調垂直位置

    ctx.restore();
}
// script.js - 修改 isRecipeDiscovered

function isRecipeDiscovered(nameId) {
    // ★★★ 優化後：直接查表，不再跑迴圈 ★★★
    // 複雜度從 O(N) 降為 O(1)
    return discoveredRecipeCache.has(nameId);
}
// script.js - 請新增此函式

// 用於切換療效列表的展開/收合
window.toggleEffectItem = function (headerElement) {
    // headerElement 是被點擊的 .effect-summary
    // 它的下一個兄弟元素就是 .effect-details (內容區)
    const details = headerElement.nextElementSibling;
    const arrow = headerElement.querySelector('.arrow');

    if (details.style.display === 'none' || details.style.display === '') {
        // 展開
        details.style.display = 'block';
        if (arrow) arrow.textContent = '▼';
        headerElement.style.backgroundColor = '#333340'; // 保持選取顏色
    } else {
        // 收合
        details.style.display = 'none';
        if (arrow) arrow.textContent = '▶';
        headerElement.style.backgroundColor = ''; // 恢復原色
    }
};
function drawTooltip(ctx, text, x, y, cw, ch) {
    ctx.font = "14px 'Microsoft JhengHei'";
    const padding = 6;
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = 24;

    const offset = ICON_BASE_RADIUS + (mapZoom - 1) * ICON_ZOOM_SCALE + 15;
    let tx = x - boxWidth / 2;
    let ty = y - offset - 10;

    if (tx < 0) tx = 0;
    if (tx + boxWidth > cw) tx = cw - boxWidth;
    if (ty < 0) ty = y + offset + 10;

    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.beginPath();
    ctx.roundRect(tx, ty, boxWidth, boxHeight, 4);
    ctx.fill();
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, tx + boxWidth / 2, ty + boxHeight / 2);
}

// --- 4. 材料與秤重 ---
function initMaterialGrid() {
    const grid = document.getElementById('material-grid');
    if (!grid) return;

    grid.innerHTML = "";
    grid.style.display = '';

    // 確保 class 正確，以便 CSS 切換佈局
    grid.className = "panel-view";

    for (let key in MaterialDB) {
        const mat = MaterialDB[key];
        const btn = document.createElement('div');
        btn.className = "mat-btn";
        btn.id = `mat-btn-${key}`;

        const matName = TextDB[mat.nameId] || key;

        // ★ 取得對應屬性的顏色 (從 data.js 的 ElementColors 拿)
        // 注意：hover 時背景會變金黃色，所以這裡文字顏色可能需要一點陰影或調整
        // 但為了簡單，我們讓五行文字在 hover 後顯示為深色粗體即可

        // ★★★ 修改處：建構支援滑動特效的 HTML ★★★
        btn.innerHTML = `
            <div class="mat-name-label">${matName}</div>
            <div class="mat-info-slide">
                <div>五行：<strong>${mat.element}</strong></div>
                <div>強度：<strong>${mat.max}</strong></div>
            </div>
        `;

        // 移除原本的 title 屬性，因為現在資訊已經直接顯示在 UI 上了，不需要瀏覽器的原生提示框來干擾
        // btn.title = ... (已移除)

        btn.onclick = () => selectMaterial(key);
        grid.appendChild(btn);
    }
}

// script.js - selectMaterial

function selectMaterial(id) {
    selectedMatID = id;
    currentWeight = 0.0;

    document.querySelectorAll('.mat-btn').forEach(btn => {
        btn.classList.remove('selected-mat');
    });
    const targetBtn = document.getElementById(`mat-btn-${id}`);
    if (targetBtn) targetBtn.classList.add('selected-mat');

    if (currentStep === 0) setStep(1);
    else if (currentStep === 2) setStep(3);

    // ★ 新增：選擇材料後，立即更新地圖預覽
    drawRecipeMap();
}

function prepareWeighingPanel() {
    const mat = MaterialDB[selectedMatID];

    const matName = TextDB[mat.nameId] || selectedMatID;
    const matDesc = TextDB[mat.descId] || "無描述";
    const matElement = mat.element; // 五行本體

    document.getElementById('weigh-mat-name').textContent = matName;

    // ★ 重點：在這裡補上五行顯示
    document.getElementById('weigh-mat-desc').innerHTML = `
        <div style="margin-bottom:6px;">${matDesc}</div>
        <div style="color:#d4af37; font-weight:bold;">
            五行屬性：${matElement}
        </div>
    `;

    updateWeightUI();
}

// script.js - adjustWeight

function adjustWeight(amount) {
    currentWeight += amount;
    if (currentWeight < 0) currentWeight = 0;
    currentWeight = Math.round(currentWeight * 10) / 10;
    updateWeightUI();

    // ★ 新增：重量改變，更新地圖箭頭
    drawRecipeMap();
}

function updateWeightUI() {
    document.getElementById('weight-display').textContent = currentWeight.toFixed(1) + " g";
    const slider = document.getElementById('weight-slider');
    if (slider) slider.value = currentWeight * 10;
}

// script.js - Slider Event Listener

const slider = document.getElementById('weight-slider');
if (slider) {
    slider.addEventListener('input', (e) => {
        currentWeight = e.target.value / 10;
        document.getElementById('weight-display').textContent = currentWeight.toFixed(1) + " g";

        // ★ 新增：滑動時即時重繪地圖 (實現絲滑的動態箭頭)
        drawRecipeMap();
    });
}

function confirmAddMaterial() {
    if (currentWeight <= 0) {
        log("錯誤：請輸入有效的重量。");
        return;
    }
    const mat = MaterialDB[selectedMatID];
    const matName = TextDB[mat.nameId] || selectedMatID;
    potMaterials.push({ id: selectedMatID, weight: currentWeight, name: matName, element: mat.element });
    log(`已加入：${matName} ${currentWeight}g`);

    if (currentStep === 1) setStep(2);
    else if (currentStep === 3) setStep(4);
}

function cancelSelection() {
    document.querySelectorAll('.mat-btn').forEach(btn => {
        btn.classList.remove('selected-mat');
    });
    if (currentStep === 1) setStep(0);
    else if (currentStep === 3) setStep(2);
}

// --- 5. 儀式邏輯 ---
function resetRitualStates() {
    if (fireTimer) {
        clearInterval(fireTimer);
        fireTimer = null;
    }
    if (grindInterval) {
        clearInterval(grindInterval);
        grindInterval = null;
    }

    grindProgress = 0; grindCoefficient = 0.0;
    fireProgress = 0; isFireComplete = false;
    auxiliaryProgress = 0;

    const grindBar = document.getElementById('grind-progress-fill');
    if (grindBar) grindBar.style.width = "0%";

    const auxCount = document.getElementById('auxiliary-count');
    if (auxCount) auxCount.textContent = "0/3";

    const nextBtn = document.getElementById('grind-next-btn');
    if (nextBtn) nextBtn.remove();

    const hint = document.getElementById('fire-hint');
    if (hint) hint.textContent = "請快速點擊生火！";

    const fireRatio = document.getElementById('fire-ratio-display');
    if (fireRatio) fireRatio.textContent = "0.00%";
}

function updatePotList() {
    const list = document.getElementById('pot-list');
    if (!list) return;
    list.innerHTML = "";
    potMaterials.forEach(m => {
        let li = document.createElement('li');
        li.textContent = `${m.name} (${m.element}) - ${m.weight}g`;
        list.appendChild(li);
    });
}

function updateRitualBtn() {
    const btn = document.getElementById('ritual-btn');
    const grindContainer = document.getElementById('grind-container');
    const fireContainerWrapper = document.getElementById('fire-container');
    const auxContainer = document.getElementById('auxiliary-container');
    const waitContainer = document.getElementById('wait-container');

    const stepName = RitualSteps[ritualStepIndex];

    const existingNextBtn = document.getElementById('grind-next-btn');
    if (existingNextBtn && stepName !== "磨碎") {
        existingNextBtn.remove();
    }

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.disabled = false;
    newBtn.textContent = `執行：${stepName}`;

    [grindContainer, fireContainerWrapper, auxContainer, waitContainer].forEach(el => {
        if (el) el.classList.add('hidden');
    });

    if (stepName === "磨碎") {
        if (grindContainer) grindContainer.classList.remove('hidden');
        newBtn.textContent = "研磨 (按住)";

        setupGrindEvents(newBtn);

        let actionArea = document.querySelector('.ritual-action');
        let nextBtn = document.getElementById('grind-next-btn');
        if (!nextBtn && actionArea) {
            nextBtn = document.createElement('button');
            nextBtn.id = 'grind-next-btn';
            nextBtn.className = "action-btn";
            nextBtn.style.marginLeft = "10px";
            nextBtn.style.backgroundColor = "#555";
            nextBtn.textContent = "完成研磨";
            actionArea.appendChild(nextBtn);
        }

        if (nextBtn) {
            nextBtn.onclick = () => {
                if (grindInterval) {
                    clearInterval(grindInterval);
                    grindInterval = null;
                    document.getElementById('ritual-btn').classList.remove('active-grind');
                }

                grindCoefficient = grindProgress / 100;
                log(`研磨完成，係數: ${grindCoefficient.toFixed(2)}`);

                advanceRitualStep();
            };
        }
        return;
    }

    if (stepName === "生火") {
        if (fireContainerWrapper) fireContainerWrapper.classList.remove('hidden');
        const uiContainer = document.getElementById('fire-progress-container');
        if (uiContainer) {
            uiContainer.innerHTML = "";
            for (let i = 0; i < 20; i++) {
                let seg = document.createElement('div');
                seg.className = "fire-segment";
                uiContainer.appendChild(seg);
            }
        }
        newBtn.textContent = "點擊生火";
        setupFireEvents(newBtn);
        return;
    }

    if (stepName === "輔料") {
        if (auxContainer) auxContainer.classList.remove('hidden');
        newBtn.textContent = "加入輔料";
        newBtn.onclick = () => handleAddAuxiliary(newBtn);
        return;
    }

    if (stepName === "等待") {
        if (waitContainer) waitContainer.classList.remove('hidden');
        newBtn.textContent = "靜置中...";
        newBtn.disabled = true;
        handleWaitStep(newBtn);
        return;
    }

    newBtn.onclick = advanceRitualStep;
}

function handleWaitStep(btn) {
    let count = 0;
    const timerEl = document.getElementById('wait-timer');
    const texts = ["丹氣融合...", "靜置中...", "藥性穩定..."];
    const waitInterval = setInterval(() => {
        count++;
        if (timerEl) timerEl.textContent = texts[count % texts.length];
        if (count >= 3) {
            clearInterval(waitInterval);
            advanceRitualStep();
        }
    }, 1000);
}

// script.js - setupGrindEvents

function setupGrindEvents(btn) {
    const progressBar = document.getElementById('grind-progress-fill');

    const startGrind = (e) => {
        e.preventDefault();
        if (grindInterval) return;
        btn.classList.add('active-grind');
        grindInterval = setInterval(() => {

            if (grindProgress < 100) {
                grindProgress += 2;
                if (grindProgress > 100) grindProgress = 100;
                if (progressBar) progressBar.style.width = grindProgress + "%";

                // ★ 新增：研磨進度改變，重繪地圖 (實線箭頭會變長)
                drawRecipeMap();
            }
        }, 100);
    };

    const stopGrind = () => {
        btn.classList.remove('active-grind');
        clearInterval(grindInterval);
        grindInterval = null;
        log("目前研磨進度:" + grindProgress);
    };

    btn.onmousedown = startGrind;
    btn.onmouseup = stopGrind;
    btn.onmouseleave = stopGrind;
    btn.ontouchstart = startGrind;
    btn.ontouchend = stopGrind;
}

function setupFireEvents(btn) {
    if (!fireTimer) {
        fireTimer = setInterval(() => {
            if (fireProgress > 0) {
                fireProgress -= 0.02; // ★ 修改：0.2% = 0.02 (Max=10.0)
                if (fireProgress < 0) fireProgress = 0;
                updateFireUI();
            }
        }, 100);
    }
    btn.onclick = () => {
        if (isFireComplete) return;
        fireProgress += 1.0;
        if (fireProgress >= FIRE_MAX) {
            fireProgress = FIRE_MAX;
            finishFire(btn);
        }
        updateFireUI();
    };
}

function updateFireUI() {
    const container = document.getElementById('fire-progress-container');
    if (!container) return;
    const segments = container.querySelectorAll('.fire-segment');
    if (segments.length === 0) return;

    // ★ 更新文字顯示
    const textEl = document.getElementById('fire-ratio-display');
    if (textEl) {
        let pct = (fireProgress / FIRE_MAX) * 100;
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        textEl.textContent = pct.toFixed(2) + "%";
    }

    let activeCount = Math.ceil((fireProgress / FIRE_MAX) * 20);
    if (fireProgress > 0 && activeCount === 0) activeCount = 1;

    segments.forEach((seg, index) => {
        if (index < activeCount) {
            seg.classList.add('active');
            let pct = (index + 1) * 5;
            let color = "#333";
            if (pct <= 20) color = "#CC3300";
            else if (pct <= 50) color = "#FFC000";
            else if (pct <= 75) color = "#FF6600";
            else if (pct <= 90) color = "#CC00FF";
            else color = "#3366FF";

            seg.style.backgroundColor = color;
            seg.style.boxShadow = `0 0 ${5 + (index / 2)}px ${color}`;
        } else {
            seg.classList.remove('active');
            seg.style.backgroundColor = "#333";
            seg.style.boxShadow = "none";
        }
    });
}

function finishFire(btn) {
    isFireComplete = true;
    clearInterval(fireTimer);
    fireTimer = null;
    updateFireUI();
    document.getElementById('fire-hint').textContent = "火候已足！";
    btn.textContent = "完成生火 (下一步)";
    btn.onclick = advanceRitualStep;
}

function handleAddAuxiliary(btn) {
    auxiliaryProgress++;
    const countEl = document.getElementById('auxiliary-count');
    if (countEl) countEl.textContent = `${auxiliaryProgress}/${AUXILIARY_MAX}`;
    if (auxiliaryProgress >= AUXILIARY_MAX) {
        btn.disabled = true;
        setTimeout(advanceRitualStep, 500);
    }
}

function advanceRitualStep() {
    ritualStepIndex++;
    if (ritualStepIndex >= RitualSteps.length) { setStep(5); }
    else { updateRitualBtn(); }
}

// script.js - 修改 runResultSequence (協調動畫與文字同步)

async function runResultSequence() {
    const processText = document.getElementById('process-text');
    const finalContainer = document.getElementById('final-result-container');
    const restartBtn = document.getElementById('restart-btn');

    // 1. 初始化 UI 狀態
    if (finalContainer) finalContainer.classList.add('hidden');
    if (restartBtn) restartBtn.classList.add('hidden'); // 先隱藏重新按鈕

    // 2. ★ 關鍵：先執行計算，取得終點座標 (但不顯示 UI)
    const resultData = await calculateFinalResult();

    if (!resultData) {
        console.error("結算失敗");
        return;
    }

    // 3. 設定文字序列
    const messages = ["小心翼翼熄滅火苗...", "用夾子打開丹爐蓋子...", "丹爐中飄出奇特的味道..."];
    const stepDuration = 1500; // 每段文字顯示 1.5 秒
    const totalDuration = messages.length * stepDuration; // 總時間 4.5 秒

    // 4. ★ 關鍵：同時啟動「地圖動畫」與「文字輪播」
    // 我們使用 Promise.all 讓它們並行執行

    if (processText) {
        processText.classList.remove('hidden');
        processText.className = "";
    }

    const animationTask = animateSettlement(resultData.playerRes.x, resultData.playerRes.y, totalDuration);

    const textTask = (async () => {
        for (let msg of messages) {
            if (processText) processText.textContent = msg;
            await new Promise(r => setTimeout(r, stepDuration));
        }
    })();

    // 等待兩者都完成 (理論上時間是一樣的)
    await Promise.all([animationTask, textTask]);

    // 5. 動畫結束，顯示結果介面
    if (processText) processText.classList.add('hidden');

    if (finalContainer) {
        finalContainer.classList.remove('hidden');
        // 淡入效果
        finalContainer.style.opacity = 0;
        finalContainer.style.transition = "opacity 0.5s";
        requestAnimationFrame(() => finalContainer.style.opacity = 1);
    }

    if (restartBtn) restartBtn.classList.remove('hidden');

    // 6. 最後定格 (確保地圖狀態正確)
    drawRecipeMap();
}

// script.js - 修改 calculateFinalResult (純計算與存檔，不負責動畫與顯示)

async function calculateFinalResult() {
    console.log("[系統] 執行數值結算...");

    // 1. 確保預覽箭頭消失 (currentStep=5 時 calculateCurrentPreviewData 回傳 null)
    // 但此時尚未顯示結果面板
    // ✅ 修改後：使用防撞號生成器
    const resultID = generateUniqueBatchID();

    if (potMaterials.length < 2) { log("錯誤：材料不足"); return null; }
    // 備份資料
    if (lastResultData) {
        previousResultData = lastResultData;
        previousPlayerResult = lastPlayerResult;
    }

    isShowingPreviousResult = false;
    const toggleBtn = document.getElementById('toggle-result-btn');
    if (toggleBtn) toggleBtn.textContent = "👀 查看上一次結果";

    // --- 1. 物理運算 ---
    let sortedMats = [...potMaterials].sort((a, b) => b.weight - a.weight);
    let pMat1 = sortedMats[0];
    let pMat2 = sortedMats[1];
    let dbMat1 = MaterialDB[pMat1.id];
    let dbMat2 = MaterialDB[pMat2.id];

    let playerRes = calculateCoordinate(dbMat1, pMat1.weight, dbMat2, pMat2.weight, grindCoefficient);

    // --- 2. 配方篩選 ---
    let bestRecipe = null;
    let isSlag = false;
    let slagReason = "";
    let errorType = "NONE";

    let primaryCandidates = RecipeDB.filter(r => MaterialDB[r.targets[0]].element === dbMat1.element);

    if (primaryCandidates.length === 0) {
        isSlag = true; slagReason = "主材料五行不符"; errorType = "ELEMENT";
    } else {
        let secondaryMatches = primaryCandidates.filter(r => MaterialDB[r.targets[1]].element === dbMat2.element);
        let targetPool = (secondaryMatches.length > 0) ? secondaryMatches : primaryCandidates;
        let success = (secondaryMatches.length > 0) ? 1 : 0;

        if (success === 0) errorType = "ELEMENT";

        let bestRatioDiff = 999;
        let playerRatio1 = pMat1.weight / (pMat1.weight + pMat2.weight);

        targetPool.forEach(r => {
            let rRatio1 = r.ratio[0] / (r.ratio[0] + r.ratio[1]);
            let diff = Math.abs(playerRatio1 - rRatio1);
            if (diff < bestRatioDiff) { bestRatioDiff = diff; bestRecipe = r; }
        });

        if (bestRecipe) {
            let pMat1NameID = MaterialDB[pMat1.id].nameId;
            let pMat2NameID = MaterialDB[pMat2.id].nameId;
            if (pMat1NameID !== MaterialDB[bestRecipe.targets[0]].nameId || pMat2NameID !== MaterialDB[bestRecipe.targets[1]].nameId) {
                errorType = "MATERIAL";
            } else if (success === 0) {
                errorType = "ELEMENT";
            } else {
                errorType = "RATIO";
            }
        }

        if (success === 0 && bestRecipe) {
            let dist = Math.sqrt(Math.pow(playerRes.x - bestRecipe.targetX, 2) + Math.pow(playerRes.y - bestRecipe.targetY, 2));
            if (dist > SLAG_FALLBACK_DISTANCE) {
                isSlag = true;
                slagReason = "副材料不合且比例相差過大/";
                bestRecipe = null;
            }
        }
    }

    // --- 3. 兜底邏輯 ---
    if (!bestRecipe) {
        let minDist = 9999;
        RecipeDB.forEach(r => {
            let d = Math.sqrt(Math.pow(playerRes.x - r.targetX, 2) + Math.pow(playerRes.y - r.targetY, 2));
            if (d < minDist) { minDist = d; bestRecipe = r; }
        });
        isSlag = true;
        if (!slagReason) slagReason = "未找到合適配方(例外情況)";
    }

    // --- 4. 計算評級 ---
    let bestDist = Math.sqrt(Math.pow(playerRes.x - bestRecipe.targetX, 2) + Math.pow(playerRes.y - bestRecipe.targetY, 2));
    let pRatio = pMat1.weight / (pMat1.weight + pMat2.weight);
    let rTotal = bestRecipe.ratio[0] + bestRecipe.ratio[1];
    let matchRate = 1 - Math.abs(pRatio - (bestRecipe.ratio[0] / rTotal));

    let penalty = 1.0;
    if (bestRecipe) {
        let m1 = (pMat1.id === bestRecipe.targets[0]);
        let m2 = (pMat2.id === bestRecipe.targets[1]);
        if (!m1 && !m2) penalty = 0.64; else if (!m1 || !m2) penalty = 0.8;
    }
    matchRate *= penalty;
    let matchRatePct = Math.max(0, Math.min(100, matchRate * 100)).toFixed(1);

    // --- 5. 品質判定 ---
    let quality = "D";
    let qualityPool = CommentsDB.SLAG;

    if (isSlag) {
        quality = "D";
    } else {
        let isPerfect = (matchRate >= 0.99) && (Math.abs(grindCoefficient - bestRecipe.grindTarget) < 0.01) && (bestDist < 0.01);
        if (isPerfect) { quality = "U"; qualityPool = CommentsDB.U; }
        else if (bestDist <= 0.05 && matchRate >= 0.95) { quality = "S"; qualityPool = CommentsDB.S; }
        else if (bestDist <= 0.4 && matchRate >= 0.70) { quality = "A"; qualityPool = CommentsDB.A; }
        else if (bestDist <= 1.0 && matchRate >= 0.50) { quality = "B"; qualityPool = CommentsDB.B; }
        else { quality = "C"; qualityPool = CommentsDB.C; }
    }

    let randomComment = qualityPool[Math.floor(Math.random() * qualityPool.length)];
    let finalComment = isSlag ? slagReason + " " + randomComment : randomComment;

    let advice = "";
    if (errorType === "MATERIAL") advice = MasterAdviceDB.WRONG_MATERIAL;
    else if (errorType === "ELEMENT") advice = MasterAdviceDB.WRONG_ELEMENT;
    else advice = MasterAdviceDB.WRONG_RATIO;

    // --- 6. 詳細資訊 ---
    let symptomText = "無";
    let reactionText = "無";
    if (!isSlag && bestRecipe) {
        if (bestRecipe.symptoms && bestRecipe.symptoms.length > 0) {
            symptomText = bestRecipe.symptoms.map(sId => {
                const sObj = SymptomsDB[sId];
                return sObj ? TextDB[sObj.descId] : "未知";
            }).join("、");
        }
        if (bestRecipe.effectId) reactionText = TextDB[bestRecipe.effectId] || "無特殊反應";
    } else {
        reactionText = "你該不會想吃吃看吧？";
    }

    // --- 7. 毒素 ---
    let toxinValX = 0, toxinValY = 0;
    let v1 = resolveDirection(dbMat1.element, dbMat2.element);
    let v2 = resolveDirection(dbMat2.element, dbMat1.element);
    if (v1.x !== 0) toxinValX = dbMat1.toxin; else if (v2.x !== 0) toxinValX = dbMat2.toxin;
    if (v1.y !== 0) toxinValY = dbMat1.toxin; else if (v2.y !== 0) toxinValY = dbMat2.toxin;

    let finalToxin = (Math.abs(playerRes.x) * toxinValX) + (Math.abs(playerRes.y) * toxinValY);
    if (finalToxin === 0) finalToxin += 0.1;
    if (finalToxin >= 60) finalToxin = 60;
    let displayToxin = finalToxin.toFixed(2);

    // --- 8. 建立資料物件 ---
    let finalName = isSlag ? "渣滓" : TextDB[bestRecipe.nameId];
    let finalElement = isSlag ? "無" : bestRecipe.element;

    let finalYinYang = "無";
    if (!isSlag && bestRecipe && typeof bestRecipe.yinYang === "number") {
        const yyIndex = bestRecipe.yinYang + 4;
        finalYinYang = TextDB[yyIndex] || "未知";
    }

    let finalDesc = isSlag ? "一坨黑乎乎的東西，散發著難以言喻的味道。" : TextDB[bestRecipe.descId];
    let displayDeviation = isSlag ? "---" : bestDist.toFixed(2);
    let displayMatch = isSlag ? "---" : matchRatePct;

    // ★ 更新全域座標 (這一步很重要，讓動畫知道終點在哪)
    lastPlayerResult = {
        x: playerRes.x, y: playerRes.y, name: finalName,
        tx: isSlag ? null : bestRecipe.targetX, ty: isSlag ? null : bestRecipe.targetY
    };

    const resultData = {
        id: resultID,
        name: finalName,
        quality: quality,
        element: finalElement,
        yinYang: finalYinYang,
        qualityText: quality === "D" ? "渣滓" : quality + "級",
        deviation: displayDeviation,
        matchRate: displayMatch,
        comment: finalComment,
        desc: finalDesc,
        mainMat: `${TextDB[dbMat1.nameId]} (${dbMat1.element})`,
        subMat: `${TextDB[dbMat2.nameId]} (${dbMat2.element})`,
        grind: (grindCoefficient * 100).toFixed(0) + "%",
        advice: advice,

        symptoms: symptomText,        // 這是給人類看的中文 (例如 "安神")
        symptomIds: (!isSlag && bestRecipe) ? bestRecipe.symptoms : [], // ★ 新增這行：保留原始 ID 陣列 (例如 [1, 5])

        reaction: reactionText,
        toxin: displayToxin,
        playerRes: lastPlayerResult
    };

    lastResultData = resultData;

    lastResultData = resultData;

    // 更新隱藏的 DOM (準備顯示)
    updateResultUI(resultData);

    // 存檔
    saveToHistory(resultData);
    if (!isSlag) {
        saveToInventory(resultData);
        log(`[背包] 已自動收藏：${finalName}`);
    } else {
        log(`[背包] 渣滓不予收藏`);
    }

    // ★ 回傳資料給動畫流程使用
    return resultData;
}

// 修改：結算畫面 UI 更新邏輯 (固定寬度版)
function updateResultUI(data) {
    const container = document.getElementById('final-result-container');

    // 1. 準備顏色
    // ▼ 修改這裡，把 "全": "#FFFFFF" 加進去
    const elColorMap = {
        "金": "#C0C0C0",
        "木": "#4CAF50",
        "水": "#2196F3",
        "火": "#FF5252",
        "土": "#FFC107",
        "全": "#b700ffff" // ✨ 新增
    };
    const elColor = elColorMap[data.element] || "#FFF";

    let qColor = "#777";
    // ★★★ 修改這裡：把 U 和 S 拆開 ★★★
    if (data.quality === 'U') qColor = "#db1212ff";      // <--- 在這裡填入您想要的 U 級顏色 (例如：洋紅/紫)
    else if (data.quality === 'S') qColor = "#FFD700"; // S 級維持金色
    else if (data.quality === 'A') qColor = "#90EE90";
    else if (data.quality === 'B') qColor = "#87CEEB";
    // 2. 注入 HTML (使用 Inline Style 強制排版)
    container.innerHTML = `
        <div style="display: flex; flex-direction: row; width: 100%; height: 100%; overflow: hidden;">
            
            <div style="flex: 0 0 40%; background: linear-gradient(135deg, rgba(40,40,40,0.6), rgba(20,20,20,0.9)); border-right: 1px solid #444; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; box-sizing: border-box;">
                <div style="color: #888; font-family: monospace; font-size: 1.2rem; margin-bottom: 10px;">ID: ${data.id}</div>
                
                <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 20px; text-align: center; line-height: 1.2; color: #fff;">
                    ${data.name}
                </div>
                
                <div style="width: 100px; height: 100px; border: 5px solid ${qColor}; border-radius: 50%; color: ${qColor}; font-size: 4rem; font-weight: bold; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.3); box-shadow: 0 0 20px ${qColor};">
                    ${data.quality}
                </div>
            </div>

            <div style="flex: 1; background-color: #1a1a1a; display: flex; flex-direction: column; position: relative; overflow: hidden;">
                
                <div style="flex: 1; overflow-y: auto; padding: 20px; box-sizing: border-box;">
                    
                    <div style="border: 1px solid #333; background: #252525; margin-bottom: 10px; border-radius: 4px; overflow: hidden;">
                        <button onclick="toggleResAcc(this)" style="width: 100%; background: #2c3e50; border: none; color: #d4af37; padding: 12px 15px; text-align: left; cursor: pointer; font-weight: bold; display: flex; justify-content: space-between;">
                            <span>📜 基本資訊</span> <span>▼</span>
                        </button>
                        <div style="display: block; padding: 15px; background: rgba(0,0,0,0.2);">
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed #444; padding-bottom:4px;">
                                <span style="color:#888;">五行屬性</span> <span style="color:${elColor}; font-weight:bold;">${data.element}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed #444; padding-bottom:4px;">
                                <span style="color:#888;">陰陽屬性</span> <span style="color:${elColor}; font-weight:bold;">${data.yinYang}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed #444; padding-bottom:4px;">
                                <span style="color:#888;">品質判定</span> <span style="font-weight:bold; color:#eee;">${data.qualityText}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed #444; padding-bottom:4px;">
                                <span style="color:#888;">配方偏差</span> <span style="font-weight:bold; color:#eee;">${data.deviation}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed #444; padding-bottom:4px;">
                                <span style="color:#888;">配方吻合度</span> <span style="font-weight:bold; color:#eee;">${data.matchRate}%</span>
                            </div>
                            <div style="margin-top:10px; padding:8px; background:rgba(0,0,0,0.3); border-left:3px solid ${qColor}; color:#ddd; font-style:italic; line-height:1.4;">
                                ${data.comment}
                            </div>
                        </div>
                    </div>

                    <div style="border: 1px solid #333; background: #252525; margin-bottom: 10px; border-radius: 4px; overflow: hidden;">
                        <button onclick="toggleResAcc(this)" style="width: 100%; background: #2c3e50; border: none; color: #d4af37; padding: 12px 15px; text-align: left; cursor: pointer; font-weight: bold; display: flex; justify-content: space-between;">
                            <span>🔍 詳細資訊</span> <span>▶</span>
                        </button>
                        <div style="display: none; padding: 15px; background: rgba(0,0,0,0.2);">
                            
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed #444; padding-bottom:4px;">
                                <span style="color:#888;">☠️ 累積毒素</span> <span style="color:#ff6b6b; font-weight:bold;">${data.toxin}</span>
                            </div>

                            <div style="margin-bottom:10px;">
                                <strong style="color:#d4af37;">🩺 主治症狀：</strong> <span style="color:#bbb;">${data.symptoms}</span>
                            </div>
                            <div style="margin-bottom:10px;">
                                <strong style="color:#ff6b6b;">🤢 服用反應：</strong> <span style="color:#bbb;">${data.reaction}</span>
                            </div>
                            
                            <hr style="border:0; border-top:1px dashed #444; margin:10px 0;">

                            <div style="color:#aaa; font-size:0.9rem; margin-bottom:8px; line-height:1.4;">
                                外觀：${data.desc}
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                <span style="color:#888;">主要物質</span> <span style="color:#eee;">${data.mainMat}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                <span style="color:#888;">次要物質</span> <span style="color:#eee;">${data.subMat}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                <span style="color:#888;">研磨程度</span> <span style="color:#eee;">${data.grind}</span>
                            </div>
                            
                            <div style="margin-top:10px; padding:10px; background:rgba(64,224,208,0.1); border-left:3px solid #40E0D0; color:#40E0D0; line-height:1.4;">
                                <strong>💡 建議：</strong>${data.advice}
                            </div>
                        </div>
                    </div>

                </div>

                <div style="flex: 0 0 auto; padding: 15px 20px; border-top: 1px solid #333; background-color: #151515; text-align: center;">
                    <button id="toggle-result-btn" class="mat-btn" onclick="toggleResultView()" style="background:#607D8B; width:100%; padding: 10px; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        👀 查看上一次結果
                    </button>
                </div>

            </div>
        </div>
    `;
}

// ★★★ 新增：專用的手風琴切換函式 (放在全域) ★★★
window.toggleResAcc = function (btn) {
    // 找到下一個兄弟元素 (也就是 content div)
    const content = btn.nextElementSibling;
    const arrow = btn.querySelector('span:last-child');

    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        arrow.textContent = '▼';
    } else {
        content.style.display = 'none';
        arrow.textContent = '▶';
    }
};

window.toggleAccordionResult = function (contentId, btn) {
    const content = document.getElementById(contentId);
    const arrow = btn.querySelector('.acc-arrow');
    if (content.style.display === "none") {
        content.style.display = "block";
        arrow.textContent = "▼";
    } else {
        content.style.display = "none";
        arrow.textContent = "▶";
    }
};
window.toggleResultView = function () {
    const btn = document.getElementById('toggle-result-btn');

    // 如果現在正在顯示「上一次」，則切換回「這一次」
    if (isShowingPreviousResult) {
        isShowingPreviousResult = false;

        // 更新按鈕文字
        if (btn) btn.textContent = "👀 查看上一次結果";

        // 更新右側文字 UI 為「這一次」的資料
        if (lastResultData) {
            updateResultUI(lastResultData);
        }

        log("顯示：這一次結果");
    }
    // 如果現在正在顯示「這一次」，則切換到「上一次」
    else {
        // 防呆檢查：如果沒有上一筆資料，嘗試從歷史紀錄讀取（針對剛載入頁面的情況）
        if (!previousResultData) {
            if (historyStorage[earthMode] && historyStorage[earthMode].length > 1) {
                previousResultData = historyStorage[earthMode][1];
                previousPlayerResult = previousResultData.playerRes;
            }
        }

        // 如果還是沒有資料，則報錯並中斷
        if (!previousResultData) {
            alert("找不到上一筆資料！\n(可能是紀錄被清空，或這是第一筆紀錄)");
            return;
        }

        // 切換狀態標記
        isShowingPreviousResult = true;

        // 更新按鈕文字
        if (btn) btn.textContent = "🔙 回到這次結果";

        // 更新右側文字 UI 為「上一次」的資料
        updateResultUI(previousResultData);

        log("顯示：上一次結果");
    }

    // ★★★ 關鍵：通知地圖重新繪製，地圖會根據 isShowingPreviousResult 決定畫哪個點 ★★★
    drawRecipeMap();
};
// script.js - 修改 saveToHistory

function saveToHistory(data) {
    let item = { ...data, time: new Date().toLocaleTimeString() };

    // 確保結構存在
    if (!historyStorage[earthMode]) historyStorage[earthMode] = [];

    // 加到陣列最前面
    historyStorage[earthMode].unshift(item);

    // 寫入 LocalStorage
    localStorage.setItem('alchemy_history_storage', JSON.stringify(historyStorage));
    
    // ★★★ 新增：當有新紀錄產生時，更新快取，確保地圖顯示正確 ★★★
    // (如果這是新發現的配方，這裡更新後，地圖上的鎖頭就會打開)
    refreshDiscoveredCache();
}

function loadHistoryFromStorage() {
    console.log("[系統] 開始讀取 LocalStorage...");
    let data = localStorage.getItem('alchemy_history_storage');
    if (data) {
        try {
            historyStorage = JSON.parse(data);
            if (!historyStorage.NEUTRAL) historyStorage = { NEUTRAL: [], EXTEND: [], BIAS: [] };
        } catch (e) {
            historyStorage = { NEUTRAL: [], EXTEND: [], BIAS: [] };
        }
    } else {
        historyStorage = { NEUTRAL: [], EXTEND: [], BIAS: [] };
    }

    // ★★★ [修正] 同時還原 座標(PlayerResult) 與 完整資料(ResultData) ★★★
    const list = historyStorage[earthMode] || [];

    if (list.length > 0) {
        // 1. 還原最新結果
        lastResultData = list[0];
        lastPlayerResult = list[0].playerRes;

        // 2. 還原上一次結果
        if (list.length > 1) {
            previousResultData = list[1];
            previousPlayerResult = list[1].playerRes;
        } else {
            previousResultData = null;
            previousPlayerResult = null;
        }
    } else {
        lastResultData = null;
        lastPlayerResult = null;
        previousResultData = null;
        previousPlayerResult = null;
    }

    // 重置按鈕狀態
    isShowingPreviousResult = false;
    const btn = document.getElementById('toggle-result-btn');
    if (btn) btn.textContent = "👀 查看上一次結果";

    renderHistory();
}

// ★★★ [新增函式] 根據當前流派，從歷史紀錄還原 last/previous 狀態 ★★★
function refreshGameStateFromHistory() {
    console.log(`[系統] 正在切換至流派: ${earthMode}`);
    console.log(`[系統] 目前歷史紀錄庫:`, historyStorage);

    const list = historyStorage[earthMode] || [];
    console.log(`[系統] 該流派紀錄筆數: ${list.length}`);

    if (list.length > 0) {
        // 1. 還原最新結果
        if (list[0].playerRes) {
            lastPlayerResult = list[0].playerRes;
            console.log(`[系統] 還原 LastResult:`, lastPlayerResult);
        } else {
            console.warn(`[警告] 最新一筆紀錄遺失 playerRes 資料！`);
        }

        // 2. 還原上一次結果
        if (list.length > 1 && list[1].playerRes) {
            previousPlayerResult = list[1].playerRes;
            console.log(`[系統] 還原 PreviousResult:`, previousPlayerResult);
        } else {
            previousPlayerResult = null;
            console.log(`[系統] 無上一筆資料 (紀錄不足 2 筆)`);
        }
    } else {
        lastPlayerResult = null;
        previousPlayerResult = null;
        console.log(`[系統] 該流派無紀錄，重置狀態`);
    }
}
function switchHistoryTab(tab) {
    currentHistoryTab = tab;

    document.querySelectorAll('.history-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const map = {
        NEUTRAL: 0,
        EXTEND: 1,
        BIAS: 2
    };
    const btns = document.querySelectorAll('.history-tab-btn');
    if (btns[map[tab]]) btns[map[tab]].classList.add('active');

    renderHistory();
}


// script.js - 修改後的 renderHistory

function renderHistory() {
    const container = document.getElementById('history-list-container');
    container.innerHTML = "";

    // 讀取 currentHistoryTab
    const list = historyStorage[currentHistoryTab] || [];

    if (list.length === 0) {
        let modeName = currentHistoryTab === 'NEUTRAL' ? '中和流' : (currentHistoryTab === 'EXTEND' ? '延伸流' : '偏性流');
        container.innerHTML = `<p style="text-align:center; color:#888; margin-top:20px;">【${modeName}】暫無煉丹紀錄</p>`;
        return;
    }

    const colors = ElementColors;

    list.forEach((item, index) => {
        let div = document.createElement('div');
        div.className = "history-item";

        const sym = item.symptoms || "無";
        const reac = item.reaction || "無";

        // ★★★ 新增邏輯：判斷是否顯示再製按鈕 (非 D 級且非渣滓) ★★★
        let regenerateBtnHtml = '';
        if (item.quality !== 'D' && item.name !== '渣滓') {
            regenerateBtnHtml = `
                <div class="history-action-bar">
                    <button class="btn-regenerate" onclick="regenerateItemFromHistory(${index}, event)">
                        🔄 提取配方 (生成丹藥)
                    </button>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="history-summary" onclick="this.parentElement.classList.toggle('open'); let d=this.nextElementSibling; d.style.display = d.style.display==='none'?'block':'none';">
                <div class="history-header-left">
                    <span class="grade-tag" style="background:${getGradeColor(item.quality)}; color:#000; padding:2px 6px; border-radius:4px; font-weight:bold; margin-right:8px;">${item.quality}</span>
                    <strong>#${item.id} ${item.name}</strong>
                </div>
                
                <div class="history-header-right">
                    <button class="item-delete-btn" title="刪除此紀錄" onclick="deleteHistoryItem(${index}, event)">🗑️</button>
                    <span class="toggle-icon">▼</span>
                </div>
            </div>
            
            <div class="history-details" style="display:none;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <div style="display:flex; justify-content:space-between;">
                        <span>
                            五行：
                            <span style="color:${colors[item.element] || '#ccc'}; font-weight:bold;">
                                ${item.element}
                            </span>
                        </span>
                    </div>
                    <span>偏差：${item.deviation}</span>
                </div>
                <p><strong>陰陽：${item.yinYang || "無"}</p>
                <p><strong>吻合率：</strong>${item.matchRate}%</p>
                <p><strong>評語：</strong>${item.comment}</p>
                
                <hr style="border:0; border-top:1px solid #444; margin:8px 0;">
                
                <p style="margin:5px 0;"><strong>🩺 主要療效：</strong>${sym}</p>
                <p style="margin:5px 0;"><strong>🤢 服藥反應：</strong>${reac}</p>
                <p>
                    <strong>☠️ 累積毒素：</strong>
                    <span style="color:#ff6b6b; font-weight:bold;">
                        ${item.toxin ?? '—'}
                    </span>
                </p>

                <hr style="border:0; border-top:1px dashed #444; margin:8px 0;">

                <p style="color:#aaa; font-size:0.85rem;">${item.desc}</p>
                <p><strong>配方：</strong>${item.mainMat} + ${item.subMat}</p>
                <div style="margin-top:8px; padding:5px; background:rgba(64, 224, 208, 0.1); border-left:2px solid #40E0D0; color:#40E0D0;">
                    <strong>💡 建議：</strong>${item.advice}
                </div>

                ${regenerateBtnHtml}

            </div>
        `;
        container.appendChild(div);
    });
}
// --- 輔助函式：取得評級對應顏色 ---
function getGradeColor(q) {
    if (q === 'U') return "#d4af37"; // 傳說金
    if (q === 'S') return "#FFD700"; // 完美黃
    if (q === 'A') return "#90EE90"; // 上等綠
    if (q === 'B') return "#87CEEB"; // 普通藍
    if (q === 'C') return "#CCCCCC"; // 勉強灰
    if (q === 'D') return "#555555"; // 渣滓黑
    return "#FFFFFF"; // 預設白
}
function clearCurrentTabHistory() {
    let modeLabel = currentHistoryTab === 'NEUTRAL' ? '中和流' : (currentHistoryTab === 'EXTEND' ? '延伸流' : '偏性流');
    if (confirm(`確定要清空【${modeLabel}】的所有紀錄嗎？`)) {
        historyStorage[currentHistoryTab] = [];
        localStorage.setItem('alchemy_history_storage', JSON.stringify(historyStorage));
        renderHistory();
    }
}

window.toggleHistoryItem = function (element) {
    const details = element.nextElementSibling;
    const parent = element.parentElement;
    if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        parent.classList.add('open');
    } else {
        details.classList.add('hidden');
        parent.classList.remove('open');
    }
};
// script.js - 修改 clearGameState

function clearGameState() {
    console.log("[系統] 執行狀態清除...");

    potMaterials = [];
    selectedMatID = null;
    currentWeight = 0.0;

    resetRitualStates();

    lastPlayerResult = null;
    previousPlayerResult = null;
    lastResultData = null;
    previousResultData = null;
    isShowingPreviousResult = false;

    // ★ 新增：重置動畫狀態
    settlementAnimPos = null;
    isAnimatingSettlement = false;

    const finalResult = document.getElementById('final-result-container');
    if (finalResult) {
        finalResult.classList.add('hidden');
        finalResult.style.opacity = 1; // 重置透明度
    }

    const processText = document.getElementById('process-text');
    if (processText) processText.classList.add('hidden');

    mapHitZones = [];
    drawRecipeMap();
}
// ==========================================
// ★★★ 背包系統 (Inventory System) v13.0 ★★★
// ==========================================

// 1. 載入背包
function loadInventoryFromStorage() {
    let data = localStorage.getItem('alchemy_inventory');
    if (data) {
        try {
            inventoryStorage = JSON.parse(data);
        } catch (e) {
            console.error("背包資料損毀，重置背包", e);
            inventoryStorage = [];
        }
    } else {
        inventoryStorage = [];
    }
}

// 2. 存入背包
function saveToInventory(data) {
    // 產生唯一 ID (UUID) 以便刪除
    const uuid = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // 複製資料並加入 UUID
    const item = {
        ...data,
        uuid: uuid,
        time: new Date().toLocaleString()
    };

    inventoryStorage.unshift(item); // 最新在最前
    localStorage.setItem('alchemy_inventory', JSON.stringify(inventoryStorage));
}

// 3. UI: 開關背包視窗
window.toggleInventoryModal = function () {
    const modal = document.getElementById('inventory-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        renderInventory();
    } else {
        modal.classList.add('hidden');
    }
};

// 4. UI: 渲染列表
function renderInventory() {
    const container = document.getElementById('inventory-list-container');
    container.innerHTML = "";

    if (inventoryStorage.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">🎒 背包裡空空如也</p>';
        return;
    }

    inventoryStorage.forEach((item) => {
        let div = document.createElement('div');
        div.className = "inventory-item";
        div.innerHTML = `
            <div class="inv-info">
                <div class="inv-name">
                    <span class="grade-tag" style="background:${getGradeColor(item.quality)}; color:#000; font-size:0.8rem; margin-right:5px;">${item.quality}</span>
                    ${item.name}
                </div>
                <div class="inv-meta">
                    屬性: ${item.element} | 毒素: ${item.toxin} | ID: ${item.id}
                </div>
            </div>
            <div class="inv-actions">
                <button class="btn-destroy-one" onclick="deleteInventoryItem('${item.uuid}')">銷毀</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// 5. 刪除單一物品
window.deleteInventoryItem = function (uuid) {
    if (confirm("確定要銷毀這顆丹藥嗎？")) {
        inventoryStorage = inventoryStorage.filter(item => item.uuid !== uuid);
        localStorage.setItem('alchemy_inventory', JSON.stringify(inventoryStorage));
        renderInventory();
    }
};

// 6. 清空背包
window.clearInventoryWithConfirm = function () {
    if (confirm("⚠️ 警告：確定要銷毀背包內「所有」丹藥嗎？此操作無法復原！")) {
        inventoryStorage = [];
        localStorage.setItem('alchemy_inventory', JSON.stringify(inventoryStorage));
        renderInventory();
    }
};

// 7. 匯出 JSON
window.exportInventoryToJSON = function () {
    if (inventoryStorage.length === 0) { alert("背包是空的，無法匯出！"); return; }

    const dataStr = JSON.stringify(inventoryStorage, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "CurrentDrugs.json";
    a.click();
    URL.revokeObjectURL(url);
};

// 8. 匯出 CSV (Excel 可讀)
window.exportInventoryToCSV = function () {
    if (inventoryStorage.length === 0) { alert("背包是空的，無法匯出！"); return; }

    // 加入 BOM (\uFEFF) 讓 Excel 正確識別 UTF-8 中文
    let csvContent = "\uFEFF";

    // 表頭
    csvContent += "藥ID,藥名,五行屬性,品質,毒素,主治症狀,服藥效果\n";

    // 內容
    inventoryStorage.forEach(item => {
        // 處理可能包含逗號的文字，加上引號
        const symptoms = `"${item.symptoms}"`;
        const reaction = `"${item.reaction}"`;

        const row = [
            item.id,
            item.name,
            item.element,
            item.quality,
            item.toxin,
            symptoms,
            reaction
        ].join(",");

        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "CurrentDrugs.csv";
    a.click();
    URL.revokeObjectURL(url);
};
// ★★★ [新增] 配方療效視窗開關 ★★★
window.toggleEffectModal = function () {
    const modal = document.getElementById('effect-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        renderEffectList(); // 打開時重新渲染
    } else {
        modal.classList.add('hidden');
    }
};
// script.js - 修改 renderEffectList (顯示所有症狀分類)

function renderEffectList() {
    const container = document.getElementById('effect-list-container');
    container.innerHTML = "";

    // 1. 取得核取方塊狀態
    const showAllCheckbox = document.getElementById('show-all-recipes-check');
    const showAll = showAllCheckbox ? showAllCheckbox.checked : false;

    // 2. 遍歷「所有」症狀資料庫 (SymptomsDB)
    // 這樣可以確保「止痛」等尚未發現配方的分類也能顯示
    Object.keys(SymptomsDB).forEach(key => {
        const symId = parseInt(key);

        // 跳過 ID 0 (無症狀) 或無效資料
        if (symId === 0 || !SymptomsDB[symId]) return;

        const symData = SymptomsDB[symId];
        // 取得症狀名稱 (需確認 TextDB 有對應 ID，若無則顯示 fallback)
        const symptomName = TextDB[symData.descId] || `症狀-${symId}`;

        // 3. 在這個症狀下，找出符合條件的配方
        const matchedRecipes = RecipeDB.filter(r =>
            r.nameId &&
            TextDB[r.nameId] !== "渣滓" &&
            r.symptoms && r.symptoms.includes(symId) && // 配方包含此症狀
            (showAll || isRecipeDiscovered(r.nameId))   // 過濾：顯示全部 OR 已發現
        );

        // 4. 生成 HTML 結構
        const div = document.createElement('div');
        div.className = 'effect-item';

        // 4-1. 標題列
        const countText = matchedRecipes.length > 0 ? `(${matchedRecipes.length})` : "";
        const headerHtml = `
            <div class="effect-summary" onclick="toggleEffectItem(this)">
                <div class="effect-title">
                    🩺 ${symptomName} ${countText}
                </div>
                <span class="arrow">▶</span>
            </div>
        `;

        // 4-2. 內容列
        let rowsHtml = `<div class="effect-details" style="display:none;">`;

        if (matchedRecipes.length === 0) {
            // ★ 如果沒有配方，顯示提示文字
            rowsHtml += `
                <div style="padding: 15px; text-align: center; color: #666; font-size: 0.9rem; font-style: italic;">
                    還未探索到相關配方
                </div>
            `;
        } else {
            // 有配方，列出清單
            matchedRecipes.forEach(recipe => {
                const rName = TextDB[recipe.nameId];
                const rElement = recipe.element;

                const colorMap = {
                    "金": "#C0C0C0", "木": "#4CAF50", "水": "#2196F3",
                    "火": "#FF5252", "土": "#FFC107", "全": "#FFFFFF"
                };
                const elColor = colorMap[rElement] || "#888";

                // 判斷探索狀態
                const discovered = isRecipeDiscovered(recipe.nameId);
                const statusIcon = discovered ? "" : "🔒 ";
                const textColor = discovered ? "#ccc" : "#777";

                rowsHtml += `
                    <div class="effect-recipe-row" onclick="highlightRecipeOnMap(${recipe.nameId})" style="color:${textColor}">
                        <span>${statusIcon}${rName}</span>
                        <span style="color:${elColor}; font-weight:bold; font-size:0.85rem; border:1px solid ${elColor}; padding:1px 5px; border-radius:4px;">${rElement}</span>
                    </div>
                `;
            });
        }
        rowsHtml += `</div>`;

        div.innerHTML = headerHtml + rowsHtml;
        container.appendChild(div);
    });
}
// --- 新增：流派說明視窗控制邏輯 ---

window.showModeInfoModal = function () {
    const modal = document.getElementById('mode-info-modal');
    const body = document.getElementById('mode-info-body');

    // 從 ModeRuleDB 取得對應文案，若無則顯示預設文字
    const content = ModeRuleDB[earthMode] || "<p>尚未選擇流派</p>";

    if (body) body.innerHTML = content;
    if (modal) modal.classList.remove('hidden');
};

window.closeModeInfoModal = function () {
    const modal = document.getElementById('mode-info-modal');
    if (modal) modal.classList.add('hidden');
};
// script.js - 新增動畫控制邏輯

// 點擊配方列表後觸發
function highlightRecipeOnMap(recipeId) {
    // 1. 關閉懸浮視窗
    toggleEffectModal();

    // 2. 設定目標 ID
    highlightTargetId = recipeId;
    highlightPulse = 0;

    // 3. 啟動動畫循環
    if (highlightAnimFrame) cancelAnimationFrame(highlightAnimFrame);
    animateMapHighlight();

    console.log(`[地圖] 開始導航至配方 ID: ${recipeId}`);
}

// 動畫循環函式
function animateMapHighlight() {
    // 增加相位 (控制呼吸速度)
    highlightPulse += 0.05;

    // 重繪地圖 (drawRecipeMap 會讀取 highlightPulse 來畫圈)
    drawRecipeMap();

    // 繼續下一幀
    highlightAnimFrame = requestAnimationFrame(animateMapHighlight);
}

// (選用) 停止動畫的函式，可在 startGame 或其他操作時呼叫
function stopMapHighlight() {
    if (highlightAnimFrame) {
        cancelAnimationFrame(highlightAnimFrame);
        highlightAnimFrame = null;
    }
    highlightTargetId = null;
    drawRecipeMap(); // 重繪一次乾淨的地圖
}
// script.js - 請新增或替換此函式

function initMapListeners() {
    const canvas = document.getElementById('recipe-map');
    if (!canvas) return;

    // 滑鼠移動時：更新全域座標變數
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mapMouseX = e.clientX - rect.left;
        mapMouseY = e.clientY - rect.top;

        // 如果目前【沒有】在跑呼吸燈動畫，才需要手動觸發重繪
        // (如果有在跑動畫，動畫迴圈會自動讀取 mapMouseX/Y，不需要這裡呼叫)
        if (!highlightAnimFrame) {
            drawRecipeMap();
        }
    });

    // 滑鼠離開時：清空座標
    canvas.addEventListener('mouseleave', () => {
        mapMouseX = null;
        mapMouseY = null;

        if (!highlightAnimFrame) {
            drawRecipeMap();
        }
    });

    // (選用) 點擊事件保持不變，但建議也使用 mapMouseX/Y
    canvas.addEventListener('click', () => {
        if (mapHitZones && mapMouseX !== null && mapMouseY !== null) {
            // 簡單的點擊判定
            for (let zone of mapHitZones) {
                let dx = mapMouseX - zone.x;
                let dy = mapMouseY - zone.y;
                if (dx * dx + dy * dy <= zone.r * zone.r) {
                    // 如果點擊了，可以在這裡實作更多功能
                    console.log("點擊了配方:", zone.name);
                    break;
                }
            }
        }
    });
}
// script.js - 修改與新增功能函式

// 切換地圖提示顯示狀態 (接收勾選狀態 state)
function toggleMapHints(state) {
    // 1. 如果沒傳參數(例如程式呼叫)，就切換當前狀態
    if (state === undefined) {
        showMapHints = !showMapHints;
    } else {
        showMapHints = state;
    }

    // 2. 同步更新 UI (確保兩個核取方塊狀態一致)
    syncMapHintUI();

    // 3. 重繪地圖
    drawRecipeMap();
}

// script.js - 修改 syncMapHintUI

function syncMapHintUI() {
    const debugCheck = document.getElementById('map-hint-check-debug');
    // const modalCheck = document.getElementById('map-hint-check-modal'); // ← 這一行可以刪掉或註解掉

    if (debugCheck) debugCheck.checked = showMapHints;
    // if (modalCheck) modalCheck.checked = showMapHints; // ← 這一行可以刪掉或註解掉
}
// script.js - 新增結算動畫函式

function animateSettlement(targetX, targetY, duration = 1000) {
    return new Promise(resolve => {
        isAnimatingSettlement = true;
        const startX = 0; // 從原點出發
        const startY = 0;
        const startTime = performance.now();

        function loop(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // 使用 Ease-Out 曲線，讓移動有減速感
            const ease = 1 - Math.pow(1 - progress, 3);

            // 計算當前座標
            const curX = startX + (targetX - startX) * ease;
            const curY = startY + (targetY - startY) * ease;

            settlementAnimPos = { x: curX, y: curY };
            drawRecipeMap(); // 重繪地圖 (Icon 會畫在 settlementAnimPos)

            if (progress < 1) {
                requestAnimationFrame(loop);
            } else {
                isAnimatingSettlement = false;
                settlementAnimPos = null; // 動畫結束，清除位置
                resolve(); // 完成 Promise
            }
        }

        requestAnimationFrame(loop);
    });
}
// script.js - 病患資料處理邏輯

// 1. 檢查資料來源 (URL > LocalStorage)
function checkPatientData() {
    console.group("🔍 [系統診斷] 開始檢查靜態病患資料 (URL/Local)...");

    // 優先檢查 URL 參數 (?data=...)
    const urlParams = new URLSearchParams(window.location.search);
    const urlData = urlParams.get('data');

    if (urlData) {
        try {
            const decodedData = JSON.parse(decodeURIComponent(urlData));
            console.log("[系統] 偵測到 URL 病患資料:", decodedData);
            loadPatientData(decodedData);
            // (選擇性) 清除網址列參數，避免重新整理後一直存在，視需求而定
            // window.history.replaceState({}, document.title, window.location.pathname);
            return;
        } catch (e) {
            console.error("URL 資料解析失敗:", e);
        }
    }

    // 次要檢查 LocalStorage
    const localData = localStorage.getItem('incoming_patient');
    if (localData) {
        try {
            const parsedData = JSON.parse(localData);
            console.log("[系統] 偵測到 LocalStorage 病患資料:", parsedData);
            loadPatientData(parsedData);
            // 讀取後清除，避免重複讀取舊資料
            localStorage.removeItem('incoming_patient');
            return;
        } catch (e) {
            console.error("LocalStorage 資料解析失敗:", e);
        }
    }
    // 如果最後都沒找到
    console.log(">> 靜態檢查結束，等待 MQTT 連線...");
    console.groupEnd();
    // 若都無資料，顯示上傳介面

    renderNoPatientState();
}
// [修正後] script.js - 智慧型資料處理中心
/**
 * 處理新進來的病患資料 (統一入口)
 * @param {Object} newData - 新收到的 JSON 資料
 * @param {String} sourceName - 來源名稱 ('MQTT', 'URL', 'Manual')
 */
// [修正後] script.js - 智慧型資料處理中心 (支援差異比對)

function handleIncomingPatientData(newData, sourceName) {
    console.log(`[系統] 收到來自【${sourceName}】的資料，進行比對...`);

    // 1. 防呆：如果資料無效，直接忽略
    if (!newData || (!newData.element && !newData.diagnosis)) {
        console.warn("[系統] 資料格式錯誤，忽略此請求。");
        return;
    }

    // 2. 判斷當前是否已經有病患資料
    const hasExistingData = currentPatientData !== null;

    // --- 情況 A：目前完全沒資料 -> 直接載入 ---
    if (!hasExistingData) {
        console.log("[系統] 目前無病患，直接載入。");
        loadPatientData(newData);
        if (sourceName === 'MQTT') log(`✨ 已自動同步雲端病患資料`);
        return;
    }

    // --- 情況 B：有資料，進行深度比對 ---
    // 呼叫剛剛寫好的比對函式
    const diffs = getPatientDataDiffs(currentPatientData, newData);

    // 如果差異列表是空的，代表資料完全一致
    if (diffs.length === 0) {
        console.log(`[系統] 資料完全一致，忽略此次更新。`);
        return; 
    }

    // --- 情況 C：資料有變動，需要決定如何處理 ---
    
    // ★ 啟動階段 (3秒內) 強制覆蓋 (避免 URL 舊資料卡住 MQTT 新資料)
    const systemUpTime = performance.now();
    const isStartupPhase = systemUpTime < 3000; 

    if (sourceName === 'MQTT' && isStartupPhase) {
        console.log("[系統] 啟動階段收到 MQTT 資料，自動覆蓋。");
        loadPatientData(newData);
        log(`✨ 已將病患資料更新為雲端最新版本`);
    } else {
        // --- 情況 D：遊戲中途收到變動資料 -> 跳窗列出差異 ---
        
        // 組合提示訊息
        let diffMsg = diffs.join('\n');
        const confirmMsg = `⚠️ 收到病患資料變更！\n(來源：${sourceName})\n\n發現以下差異：\n${diffMsg}\n\n請問要「更新」目前的資料嗎？`;
        
        if (confirm(confirmMsg)) {
            console.log("[系統] 玩家確認更新資料。");
            loadPatientData(newData);
            // 可以加個 Toast 提示更新成功
        } else {
            console.log("[系統] 玩家拒絕更新。");
        }
    }
}
// script.js - 新增：比對病患資料差異的輔助函式

function getPatientDataDiffs(current, rawNewData) {
    const diffs = [];
    
    // 1. 解析新資料 (模擬 loadPatientData 的解析邏輯)
    // 必須先將 rawNewData 轉成跟 current 一樣的格式才能比對
    let newObj = {};
    const diagnosed = rawNewData.diagnosis?.diagnosed;

    if (diagnosed) {
        // 新版完整格式
        newObj.name = diagnosed.customerName || "未知";
        newObj.element = diagnosed.constitution || "未知";
        
        // 毒素處理 (字串或物件轉字串)
        if (typeof diagnosed.toxicity === 'object' && diagnosed.toxicity !== null) {
            newObj.toxin = `${diagnosed.toxicity.current} / ${diagnosed.toxicity.max}`;
        } else {
            newObj.toxin = diagnosed.toxicity || "未知";
        }

        // 症狀處理 (轉成代碼陣列)
        const codeMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };
        newObj.symptoms = [];
        if (Array.isArray(diagnosed.needs)) {
            diagnosed.needs.forEach(n => {
                if (n.code && codeMap[n.code]) newObj.symptoms.push(codeMap[n.code]);
            });
        }
    } else {
        // 舊版簡易格式 (Fallback)
        newObj.name = rawNewData.customerName || "未知"; // 或是 timestamp
        newObj.element = rawNewData.element || "未知";
        newObj.toxin = rawNewData.maxToxin || rawNewData.toxinDisplay || "未知";
        newObj.symptoms = rawNewData.symptoms || [];
    }

    // 2. 開始逐項比對
    // 比對姓名
    if (current.name !== newObj.name) {
        diffs.push(`👤 姓名：${current.name} ➔ ${newObj.name}`);
    }

    // 比對五行
    if (current.element !== newObj.element) {
        diffs.push(`☯️ 五行：${current.element} ➔ ${newObj.element}`);
    }

    // 比對毒素 (current.toxinDisplay 是 UI 顯示的欄位名稱)
    if (current.toxinDisplay !== newObj.toxin) {
        diffs.push(`☠️ 毒素：${current.toxinDisplay} ➔ ${newObj.toxin}`);
    }

    // 比對症狀 (陣列比對)
    // 先排序再轉字串比較，確保順序不同也被視為相同
    const curSymStr = JSON.stringify(current.symptoms.sort());
    const newSymStr = JSON.stringify(newObj.symptoms.sort());
    if (curSymStr !== newSymStr) {
        // 把代碼轉成中文描述比較好讀 (選用)
        diffs.push(`🩺 症狀代碼有變動`);
    }

    return diffs;
}
// script.js - 修改 loadPatientData (改讀取 diagnosed 診斷結果)

function loadPatientData(data) {
    console.log("[系統] 開始載入病患資料...");
    let patient = {};

    // ★ 修改 1：改為檢查並讀取 diagnosis.diagnosed (診斷結果)
    if (data.diagnosis && data.diagnosis.diagnosed) {
        console.log("[系統] 讀取診斷結果資料 (diagnosed)");

        // 取得診斷區塊
        const diagnosed = data.diagnosis.diagnosed;

        // 1. 姓名處理
        if (diagnosed.customerName) {
            patient.name = diagnosed.customerName;
        } else {
            // Fallback: 如果診斷沒寫名字，還是抓 timestamp 暫代
            const timeCode = data.timestamp ? data.timestamp.split('T')[1].split('.')[0].replace(/:/g, '') : "Unknown";
            patient.name = `病患-${timeCode}`;
        }

        // 2. 五行屬性 (讀取診斷的屬性)
        patient.element = diagnosed.constitution;

        // 3. 毒素處理 (★ 關鍵修改)
        // diagnosed 的 toxicity 通常是字串 (如 "微毒")，但也保留對舊格式(物件)的相容性
        if (typeof diagnosed.toxicity === 'object' && diagnosed.toxicity !== null) {
            patient.toxinDisplay = `${diagnosed.toxicity.current} / ${diagnosed.toxicity.max}`;
        } else {
            // 如果是字串，直接顯示文字
            patient.toxinDisplay = diagnosed.toxicity || "未知";
        }

        // 4. 症狀代碼轉換 (A~E -> 1~5)
        // 邏輯不變，但來源改為 diagnosed.needs
        const codeMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };
        patient.symptoms = [];

        if (Array.isArray(diagnosed.needs)) {
            diagnosed.needs.forEach(need => {
                if (need.code && codeMap[need.code]) {
                    patient.symptoms.push(codeMap[need.code]);
                }
            });
        }

        patient.notes = "依據醫師診斷結果顯示";

    } else {
        // ★ 相容舊版簡單格式 (手動測試或舊資料)
        if (!data.element) {
            console.error("載入失敗：缺少必要欄位");
            alert("匯入失敗：病患資料格式不完整");
            renderNoPatientState();
            return;
        }
        console.log("[系統] 識別為簡易測試格式");
        patient = data;
        // 舊版可能只有 maxToxin
        patient.toxinDisplay = data.maxToxin || "未知";
    }

    // 更新全域變數
    currentPatientData = patient;

    // 呼叫渲染 UI
    renderPatientInfo(patient);

    // ★★★ 新增：載入成功後，自動展開面板並亮起按鈕 ★★★
    const panel = document.getElementById('patient-info-panel');
    const btn = document.getElementById('toggle-patient-btn');
    if (panel) panel.classList.remove('hidden');
    if (btn) btn.classList.add('active');
}
// [修正後] script.js - 靜態資料檢查 (URL / LocalStorage)
// 邏輯變更：找到資料後，不再直接 loadPatientData，而是交給 handleIncomingPatientData 統一處理

function checkPatientData() {
    console.group("🔍 [系統診斷] 開始檢查靜態病患資料...");
    console.log("1. 當前完整 URL:", window.location.href);
    console.log("2. 當前 Hash 值:", window.location.hash);

    // ==========================================
    // 1. 優先檢查 Hash Payload (#payload=...)
    // ==========================================
    const hash = window.location.hash.substring(1); // 去掉 #

    let payload = null;
    if (hash.includes('payload=')) {
        // 找到 payload= 的位置，取出後面的所有字串
        const start = hash.indexOf('payload=') + 8;
        payload = hash.substring(start);

        // 如果後面還有其他參數(用 & 分隔)，要切掉
        if (payload.includes('&')) {
            payload = payload.split('&')[0];
        }
    }

    if (payload) {
        try {
            console.log(">> 偵測到 Hash Payload，準備解碼...");

            // A. 格式清洗
            // 1. 把被瀏覽器轉義的 %XX 轉回來
            let base64 = decodeURIComponent(payload);
            // 2. 處理 URL Safe Base64: '-' -> '+', '_' -> '/'
            base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
            // 3. 處理可能的空白
            base64 = base64.replace(/ /g, '+');

            // B. 補足 Padding (=)
            while (base64.length % 4) {
                base64 += '=';
            }

            // C. 解碼 (處理 UTF-8 中文)
            const rawString = atob(base64);
            const jsonString = decodeURIComponent(rawString.split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            // D. 轉成物件
            const decodedData = JSON.parse(jsonString);
            console.log("✅ Hash Payload 解析成功:", decodedData);

            // ★★★ 修改重點：交給統一入口處理，標記來源為 URL ★★★
            handleIncomingPatientData(decodedData, 'URL');

            console.groupEnd();
            return; // 找到就結束，不繼續往下找

        } catch (e) {
            console.error("❌ Hash Payload 解析失敗:", e);
            // 解析失敗不阻擋，繼續往下檢查其他來源
        }
    }

    // ==========================================
    // 2. 次要檢查 URL Query (?data=...)
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const urlData = urlParams.get('data');

    if (urlData) {
        try {
            console.log(">> 偵測到 ?data= 參數");
            const decodedData = JSON.parse(decodeURIComponent(urlData));

            // ★★★ 修改重點：交給統一入口處理，標記來源為 URL ★★★
            handleIncomingPatientData(decodedData, 'URL');

            console.groupEnd();
            return; // 找到就結束
        } catch (e) {
            console.error("URL Query 解析失敗:", e);
        }
    }

    // ==========================================
    // 3. 最後檢查 LocalStorage (例如從別頁跳轉過來)
    // ==========================================
    const localData = localStorage.getItem('incoming_patient');
    if (localData) {
        try {
            console.log(">> 偵測到 LocalStorage 資料");
            const parsedData = JSON.parse(localData);

            // 讀取後清除，避免下次重整又讀到舊的
            localStorage.removeItem('incoming_patient');

            // ★★★ 修改重點：交給統一入口處理，標記來源為 LocalStorage ★★★
            handleIncomingPatientData(parsedData, 'LocalStorage');

            console.groupEnd();
            return;
        } catch (e) {
            console.error("LocalStorage 解析失敗:", e);
        }
    }

    // ==========================================
    // 4. 完全沒資料
    // ==========================================
    console.log(">> 無任何外部靜態資料，顯示上傳介面。");
    renderNoPatientState();
    console.groupEnd();
}
// script.js - 修改 renderPatientInfo

function renderPatientInfo(data) {
    const displayZone = document.getElementById('patient-data-display');
    const uploadZone = document.getElementById('patient-upload-zone');
    const statusDot = document.getElementById('patient-status-indicator');

    if (displayZone) displayZone.classList.remove('hidden');

    // ★ 新增：顯示提交按鈕
    const deliverBtn = document.getElementById('deliver-btn');
    if (deliverBtn) deliverBtn.classList.remove('hidden');
    if (uploadZone) uploadZone.classList.add('hidden');

    if (statusDot) {
        statusDot.className = "status-dot green";
        statusDot.title = "連線中：已載入病患";
    }

    // 1. 填入基本資料
    document.getElementById('p-name').textContent = data.name || "未知";

    const elSpan = document.getElementById('p-element');
    elSpan.textContent = data.element || "未知";

    // 根據五行更換顏色
    if (typeof ElementColors !== 'undefined' && data.element && ElementColors[data.element]) {
        elSpan.style.color = ElementColors[data.element];
    }

    // 2. 顯示毒素 (格式: 目前 / 上限)
    const toxinSpan = document.getElementById('p-max-toxin');
    // 優先使用處理過的 toxinDisplay，如果沒有則回退到 maxToxin
    toxinSpan.textContent = data.toxinDisplay || data.maxToxin || "未知";

    document.getElementById('p-notes').textContent = data.notes || "無備註";

    // 3. 處理症狀列表
    const symList = document.getElementById('p-symptoms-list');
    symList.innerHTML = "";

    if (data.symptoms && Array.isArray(data.symptoms) && data.symptoms.length > 0) {
        data.symptoms.forEach(symId => {
            let symText = `未知症狀 (${symId})`;

            // 嘗試從 SymptomsDB 抓取描述
            if (typeof SymptomsDB !== 'undefined' && SymptomsDB[symId]) {
                const descId = SymptomsDB[symId].descId;
                if (typeof TextDB !== 'undefined' && TextDB[descId]) {
                    symText = TextDB[descId]; // 例如 "安神/安眠"
                }
            }

            const li = document.createElement('li');
            li.textContent = symText;
            symList.appendChild(li);
        });
    } else {
        symList.innerHTML = "<li>無明顯症狀</li>";
    }
}

// script.js - 修正後的 renderNoPatientState

function renderNoPatientState() {
    currentPatientData = null;
    const displayZone = document.getElementById('patient-data-display');
    const uploadZone = document.getElementById('patient-upload-zone');
    const statusDot = document.getElementById('patient-status-indicator');

    // ★ 修正重點：必須這裡宣告 deliverBtn，程式才找得到它
    const deliverBtn = document.getElementById('deliver-btn');

    if (displayZone) displayZone.classList.add('hidden');
    if (uploadZone) uploadZone.classList.remove('hidden');

    // 如果按鈕存在，就隱藏它 (因為沒病人不能送藥)
    if (deliverBtn) deliverBtn.classList.add('hidden');

    if (statusDot) {
        statusDot.className = "status-dot red";
        statusDot.title = "待機中：無病患資料";
    }
}

// 5. 手動上傳處理
function handlePatientFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            loadPatientData(json);
        } catch (err) {
            alert("檔案解析失敗：請確認上傳的是正確的 JSON 格式");
            console.error(err);
        }
        // 清空 input 讓同一個檔案可以再次觸發 change
        input.value = '';
    };
    reader.readAsText(file);
}

// 6. 清除資料
function clearPatientData() {
    if (confirm("確定要移除目前病患資料嗎？")) {
        renderNoPatientState();
    }
}
// script.js - 藥品交付系統核心邏輯 (v2.0 Fix: UUID & SaveInventory)

// ★ 新增：缺少的存檔輔助函式
function saveInventory() {
    localStorage.setItem('alchemy_inventory', JSON.stringify(inventoryStorage));
}

// 1. 開啟選藥視窗
function openDeliveryModal() {
    if (!currentPatientData) return;

    const modal = document.getElementById('delivery-modal');
    modal.classList.remove('hidden');
    document.getElementById('delivery-patient-name').textContent = currentPatientData.name || "未知病患";

    // 重置選擇
    selectedDeliveryIds = [];
    renderDeliveryList();
    updateDeliveryUI();
}

// 2. 關閉視窗
function closeDeliveryModal() {
    document.getElementById('delivery-modal').classList.add('hidden');
    selectedDeliveryIds = [];
}

// 3. 渲染背包列表 (★ 改用 uuid 解決勾選顯示問題)
function renderDeliveryList() {
    const container = document.getElementById('delivery-list-container');
    container.innerHTML = "";

    if (inventoryStorage.length === 0) {
        container.innerHTML = `<div style="padding:30px; text-align:center; color:#666;">背包空空如也，請先煉丹。</div>`;
        return;
    }

    // 依時間新舊反序排列
    const list = [...inventoryStorage].reverse();

    list.forEach(item => {
        const div = document.createElement('div');

        // ★ 關鍵修改：使用 uuid 進行比對 (字串對字串，絕對精準)
        const isSelected = selectedDeliveryIds.includes(item.uuid);
        const isMaxReached = selectedDeliveryIds.length >= 3;

        // 如果沒被選且已達上限，則禁用
        const isDisabled = !isSelected && isMaxReached;

        div.className = `delivery-row ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;

        const codes = convertEffectToCodes(item.symptoms);

        // ★ 關鍵修改：傳遞 uuid
        div.onclick = (e) => {
            if (e.target.type !== 'checkbox') toggleDeliverySelection(item.uuid);
        };

        div.innerHTML = `
            <div style="display:flex; justify-content:center;">
                <input type="checkbox" class="delivery-checkbox" ${isSelected ? 'checked' : ''} 
                    ${isDisabled ? 'disabled' : ''} onchange="toggleDeliverySelection('${item.uuid}')">
            </div>
            <div style="color: #fff;">${item.name}</div>
            <div style="color: ${getGradeColor(item.quality)}; font-weight:bold;">${item.quality}</div>
            <div style="color: ${ElementColors[item.element] || '#ccc'};">${item.element}</div>
            <div style="font-family: monospace; color: #aaa;">${codes}</div>
            <div style="color: ${item.toxin > 50 ? '#ff6b6b' : '#888'};">${item.toxin}</div>
        `;
        container.appendChild(div);
    });
}

// 4. 切換選擇狀態 (使用 uuid)
function toggleDeliverySelection(uuid) {
    const index = selectedDeliveryIds.indexOf(uuid);

    if (index > -1) {
        // 取消選取
        selectedDeliveryIds.splice(index, 1);
    } else {
        // 新增選取 (檢查上限)
        if (selectedDeliveryIds.length < 3) {
            selectedDeliveryIds.push(uuid);
        }
    }
    renderDeliveryList(); // 重繪以更新 UI
    updateDeliveryUI();
}

// 5. 更新 UI 狀態 (計數與按鈕)
function updateDeliveryUI() {
    const count = selectedDeliveryIds.length;
    document.getElementById('delivery-count').textContent = `已選：${count} / 3`;

    // 更新外部按鈕文字
    const mainBtn = document.getElementById('deliver-btn');
    if (mainBtn) mainBtn.textContent = `💊 提交丹藥 (${count}/3)`;

    const confirmBtn = document.getElementById('confirm-delivery-btn');
    if (count > 0) {
        confirmBtn.classList.remove('disabled');
        confirmBtn.disabled = false;
    } else {
        confirmBtn.classList.add('disabled');
        confirmBtn.disabled = true;
    }
}

// 6. 輔助：將症狀 ID 轉為 A-E 代碼
function convertEffectToCodes(symptoms) {
    if (!symptoms || !Array.isArray(symptoms)) return "無";
    const map = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };
    let codes = symptoms.map(s => map[s] || '?');
    return codes.join(', ');
}

// script.js - 藥品交付系統 (v3.0 Broadcast Channel 版)

// 0. 定義廣播頻道 (名稱必須跟同事約好一樣)
const clinicChannel = new BroadcastChannel('alchemy_clinic_channel');

// 補上存檔函式 (防止報錯)
function saveInventory() {
    localStorage.setItem('alchemy_inventory', JSON.stringify(inventoryStorage));
}

// script.js - 修正後的提交函式 (雙模版)

function submitMedicinesToClinic() {
    if (selectedDeliveryIds.length === 0) return;

    // 判斷模式文字
    const modeText = transmissionMode === 'BROADCAST' ? '【近距離廣播】' : '【雲端傳送陣】';

    // 再次確認
    if (!confirm(`確定要透過 ${modeText} 提交這 ${selectedDeliveryIds.length} 顆丹藥嗎？`)) return;

    // A. 準備資料
    const medicinesToSend = inventoryStorage
        .filter(item => selectedDeliveryIds.includes(item.uuid))
        .map(item => {
            const rawSymptoms = Array.isArray(item.symptomIds) ? item.symptomIds : [];
            return {
                id: item.id,
                name: item.name,
                element: item.element,
                quality: item.quality,
                toxin: item.toxin,
                effectCodes: rawSymptoms.map(s => {
                    const map = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };
                    return map[s] || null;
                }).filter(c => c !== null)
            };
        });

    // B. 建立 Payload
    const payloadObj = {
        source: "AlchemySystem",
        patientName: currentPatientData ? currentPatientData.name : "未知病患",
        timestamp: new Date().toISOString(),
        medicines: medicinesToSend
    };

    console.log(`[系統] 準備發送 (${transmissionMode}):`, payloadObj);

    // ★★★ C. 核心分流邏輯 ★★★
    if (transmissionMode === 'BROADCAST') {
        // 模式 1: 廣播
        broadcastChannel.postMessage(payloadObj);
        alert("✨ [廣播] 丹藥已送達隔壁分頁！");
    } else {
        // 模式 2: MQTT
        if (mqttClient && mqttClient.connected) {
            // ★ 修改這裡：發送到當前的 currentMqttTopic (含有房間號的)
            mqttClient.publish(currentMqttTopic, JSON.stringify(payloadObj), { retain: false });
            
            // alert("✨ [雲端] 丹藥已飛向遠方伺服器！");
            showToast("✨ [雲端] 丹藥已送達診間！"); // 建議改用 Toast
        } else {
            alert("⚠️ 雲端連線尚未建立，無法傳送！請檢查網路或稍後再試。");
            return; // 中斷，不刪除背包物品
        }
    }

    // D. 刪除本地庫存 & 更新 UI
    inventoryStorage = inventoryStorage.filter(item => !selectedDeliveryIds.includes(item.uuid));
    saveInventory();
    renderInventory();
    closeDeliveryModal();
    if (currentPatientData) renderPatientInfo(currentPatientData);
}
// script.js - 切換病歷面板顯示/隱藏
function togglePatientPanel() {
    const panel = document.getElementById('patient-info-panel');
    const btn = document.getElementById('toggle-patient-btn');

    if (panel) {
        if (panel.classList.contains('hidden')) {
            // 展開
            panel.classList.remove('hidden');
            if (btn) btn.classList.add('active'); // 按鈕亮起
        } else {
            // 收縮
            panel.classList.add('hidden');
            if (btn) btn.classList.remove('active'); // 按鈕變暗
        }
    }
}
// script.js - 初始化玩家紀錄 (雙重確認)
function resetAllSystemData() {
    // 第一次確認
    if (!confirm("⚠️ 警告：您即將進行「系統初始化」。\n\n這將會清除：\n1. 所有煉丹歷史紀錄\n2. 背包內所有丹藥\n3. 已發現的配方狀態\n4. 當前病患資料\n\n確定要繼續嗎？")) {
        return;
    }

    // 第二次確認 (防呆)
    if (!confirm("⛔ 最後警告 ⛔\n\n此操作「無法復原」！\n所有的努力都將化為烏有。\n\n您真的確定要重置所有資料嗎？")) {
        return;
    }

    console.log("[系統] 執行全面初始化...");

    // 1. 清除 LocalStorage
    localStorage.removeItem('alchemy_history_storage'); // 歷史紀錄
    localStorage.removeItem('alchemy_inventory');       // 背包
    localStorage.removeItem('incoming_patient');        // 病患資料

    // 如果還有其他儲存的 key，請在此加入
    // localStorage.clear(); // 或者直接暴力清空所有 (視需求而定)

    // 2. 清空記憶體變數 (雖然 reload 會重置，但為了保險)
    historyStorage = { NEUTRAL: [], EXTEND: [], BIAS: [] };
    inventoryStorage = [];
    currentPatientData = null;

    // 3. UI 顯示重置訊息
    alert("✨ 系統已初始化完畢，網頁將重新載入。");

    // 4. 強制重整頁面以套用變更
    window.location.reload();
}
// script.js - 新增函式

function openClinicWindow() {
    // 1. 設定醫館的路徑
    // 如果您的資料夾名稱不是 'clinic'，請修改這裡
    const clinicPath = 'Prototype_test/index.html';

    // 2. 設定視窗參數
    // width/height: 視窗大小
    // left/top: 視窗出現的位置 (設為 0 盡量靠左上，方便您把主視窗移到右邊)
    const windowFeatures = "width=1000,height=800,left=0,top=0,menubar=no,toolbar=no,location=no,status=no";

    // 3. 開啟新視窗
    // 'ClinicWindow' 是視窗名稱，再次點擊時會聚焦在同一個視窗，不會一直開新的
    window.open(clinicPath, 'ClinicWindow', windowFeatures);
}
// script.js - 新增函式：從歷史紀錄再製丹藥

function regenerateItemFromHistory(index, event) {
    // 阻止事件冒泡，避免觸發手風琴收合
    if (event) event.stopPropagation();

    // 1. 取得當前頁籤的列表
    const list = historyStorage[currentHistoryTab] || [];
    const item = list[index];

    if (!item) {
        console.error("找不到該筆紀錄");
        return;
    }

    // 2. 防呆檢查：渣滓不能再製
    if (item.quality === 'D' || item.name === '渣滓') {
        alert("無法再製渣滓！");
        return;
    }
    
    // 建立新物件
    const newItem = {
        ...item,
        // ✅ 修改後：使用防撞號生成器，確保這個新批號也是全場唯一的
        id: generateUniqueBatchID() 
    };
    // 呼叫存檔 (saveToInventory 會再幫它加 UUID，雙重保險)
    saveToInventory(newItem);

    console.log(`✨ 已再製【${newItem.name}】，新批號 ID: ${newItem.id}`);
    alert(`✨ 已成功再製【${newItem.name}】(ID: ${newItem.id})！`);

    // (選用) 如果想要再製後直接打開背包給玩家看，可以解開下面這行
    toggleInventoryModal();
}
// script.js - 新增：唯一 ID 生成器 (防撞號)

function generateUniqueBatchID() {
    // 1. 收集目前所有已存在的 ID (跨流派檢查)
    const existingIds = new Set();

    // 遍歷所有流派的紀錄
    ['NEUTRAL', 'EXTEND', 'BIAS'].forEach(mode => {
        if (historyStorage[mode]) {
            historyStorage[mode].forEach(item => existingIds.add(item.id));
        }
    });

    let newId;
    let isDuplicate = true;
    let safeGuard = 0; // 安全閥，避免運氣太差無窮迴圈

    // 2. 迴圈檢查
    while (isDuplicate && safeGuard < 1000) {
        newId = Math.floor(Math.random() * 9000) + 1000; // 產生 1000~9999

        if (!existingIds.has(newId)) {
            isDuplicate = false; // 沒重複，通過！
        }
        safeGuard++;
    }

    if (safeGuard >= 1000) {
        console.warn("ID 池已近枯竭或運氣極差，強制回傳非唯一 ID");
    }

    return newId;
}
// script.js - 新增優化用的全域變數與函式

// --- 優化 1: 渲染節流鎖 ---
let isMapRedrawPending = false; 

// --- 優化 2: 已探索配方快取 (Set 結構查詢速度極快) ---
let discoveredRecipeCache = new Set();

// 更新快取的函式 (只在載入或存檔時呼叫)
function refreshDiscoveredCache() {
    discoveredRecipeCache.clear();

    // 1. 掃描背包
    inventoryStorage.forEach(item => {
        // 這裡需要反查 nameId，或者如果 item 裡有 nameId 最好
        // 假設 item 保留了原始資料結構，或是透過 TextDB 比對 name
        // 為了效能，我們這邊用比較寬鬆的 TextDB 比對
        for (const [id, name] of Object.entries(TextDB)) {
            if (name === item.name) discoveredRecipeCache.add(parseInt(id));
        }
    });

    // 2. 掃描歷史紀錄 (所有流派)
    ['NEUTRAL', 'EXTEND', 'BIAS'].forEach(mode => {
        if (historyStorage[mode]) {
            historyStorage[mode].forEach(item => {
                for (const [id, name] of Object.entries(TextDB)) {
                    if (name === item.name) discoveredRecipeCache.add(parseInt(id));
                }
            });
        }
    });

    console.log(`[系統] 配方探索快取已更新，共發現 ${discoveredRecipeCache.size} 種配方`);
}
// 修改：使用共用的清除邏輯
function resetGame() {
    console.log("[系統] 重置遊戲 (重新煉製)...");

    // 呼叫清除函式
    clearGameState();

    // 回到流派選擇 (或您原本的邏輯是回到步驟0，這裡假設是回到流派選擇)
    showGameModeSelection();
}
