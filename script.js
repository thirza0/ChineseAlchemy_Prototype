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
let showMapHints = false;

// --- 2. 初始化與主要流程 ---
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

    loadHistoryFromStorage();
    loadInventoryFromStorage();

    // ★★★ 修改處：先顯示說明視窗，關閉後才選流派 ★★★
    // 呼叫顯示說明視窗函式
    showInstructionModal();

    setupMapInteractions();
    updateZoomUI();
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

// script.js - 修改 showGameModeSelection (啟用遮罩)

function showGameModeSelection() {
    const title = document.getElementById('step-title');
    const instruct = document.getElementById('instruction-text');
    const grid = document.getElementById('material-grid');

    // 隱藏流派說明按鈕
    const infoBtn = document.getElementById('mode-info-btn');
    if (infoBtn) infoBtn.classList.add('hidden');

    // ★ 新增：顯示地圖遮罩 (移除 hidden class)
    const mapOverlay = document.getElementById('map-overlay');
    if (mapOverlay) mapOverlay.classList.remove('hidden');

    clearGameState();

    title.textContent = "煉丹流派選擇";
    instruct.textContent = "請選擇本局「土屬性」的物理特性：";

    switchPanel('material-grid');

    grid.className = "mode-selection-container";
    grid.innerHTML = "";

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
            log(`玩家選擇流派：【${name}】`);
            startGame();
        };
        return btn;
    };

    grid.appendChild(createModeBtn("🛡️ 中和流", "土屬性座標為 0<br>用於稀釋藥性", "#4a69bd", "NEUTRAL"));
    grid.appendChild(createModeBtn("🚀 延伸流", "土屬性模仿他者<br>大幅增強藥效", "#e58e26", "EXTEND"));
    grid.appendChild(createModeBtn("☯️ 偏性流派", "土屬性補足缺失<br>填補另一軸向", "#8e44ad", "BIAS"));
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

function calculateCoordinate(mat1, weight1, mat2, weight2, grindRate) {
    let m1, m2, w1, w2;
    if (weight1 >= weight2) { m1 = mat1; w1 = weight1; m2 = mat2; w2 = weight2; }
    else { m1 = mat2; w1 = weight2; m2 = mat1; w2 = weight1; }

    let totalW = w1 + w2;
    if (totalW === 0) return { x: 0, y: 0 };

    if (grindRate === undefined) grindRate = 0;

    let effectiveRate = BASE_DISTANCE_COEF + ((1 - BASE_DISTANCE_COEF) * grindRate);

    let rawMag1 = m1.max * effectiveRate * (w1 / totalW);
    let rawMag2 = m2.max * effectiveRate * (w2 / totalW);

    let v1 = resolveDirection(m1.element, m2.element);
    let v2 = resolveDirection(m2.element, m1.element);

    let vecX = (v1.x * rawMag1) + (v2.x * rawMag2);
    let vecY = (v1.y * rawMag1) + (v2.y * rawMag2);

    let finalX = Math.round(vecX * 100) / 100;
    let finalY = Math.round(vecY * 100) / 100;

    return { x: finalX, y: finalY };
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
        // ── 拖曳地圖 ──
        if (isMapDragging) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;

            mapPanX += dx;
            mapPanY += dy;

            checkMapBoundaries(canvas.width, canvas.height);
            drawRecipeMap();
            return;
        }

        // ── ⭐ Hover tooltip（關鍵補回來的部分） ──
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        drawRecipeMap(mouseX, mouseY);
    });

    window.addEventListener('mouseup', () => {
        isMapDragging = false;
        canvas.classList.remove('grabbing');
    });

    // ===== 滑鼠離開畫布時清除 hover =====
    canvas.addEventListener('mouseleave', () => {
        if (!isMapDragging) {
            drawRecipeMap(); // hoverX = null → tooltip 消失
        }
    });
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

// script.js - 更新 drawRecipeMap (支援半透明提示)

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

    // X Grid
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
    // Y Grid
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

    // --- 5. 繪製配方點 ---
    ctx.font = `bold ${10 + (mapZoom - 1) * 2}px 'Microsoft JhengHei'`;
    mapHitZones = []; 

    let hoveredRecipe = null;
    let currentIconRadius = ICON_BASE_RADIUS + (mapZoom - 1) * ICON_ZOOM_SCALE;

    RecipeDB.forEach(r => {
        const drawX = cx + (r.targetX * pixelsPerUnit);
        const drawY = cy - (r.targetY * pixelsPerUnit);
        const rName = TextDB[r.nameId] || "?";

        if (drawX < -50 || drawX > w + 50 || drawY < -50 || drawY > h + 50) return;

        const isDiscovered = (typeof isRecipeDiscovered === 'function') ? isRecipeDiscovered(r.nameId) : false;
        
        // ★★★ 關鍵修改：顯示條件放寬 ★★★
        // 原本: !isDiscovered && highlightTargetId !== r.nameId -> return
        // 現在: 如果 showMapHints 為 true，就不 return，而是繼續往下畫
        if (!isDiscovered && highlightTargetId !== r.nameId && !showMapHints) {
            return; 
        }

        // 記錄感應區
        mapHitZones.push({ x: drawX, y: drawY, r: currentIconRadius * 1.5, name: rName, tx: r.targetX, ty: r.targetY });

        // --- 呼吸燈邏輯 ---
        if (highlightTargetId === r.nameId) {
            const pulseRadius = currentIconRadius * 1.5 + Math.sin(highlightPulse) * 5;
            const alpha = 0.5 + Math.sin(highlightPulse) * 0.3;
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, pulseRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(drawX, drawY, pulseRadius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // --- 繪製本體 ---
        
        // ★★★ 關鍵修改：如果是提示點 (未發現 且 非導航目標)，設定半透明 ★★★
        const isHint = (!isDiscovered && highlightTargetId !== r.nameId);
        if (isHint) {
            ctx.save(); // 保存當前狀態
            ctx.globalAlpha = 0.6; // 設定半透明
        }

        // 懸停判斷
        let isHover = false;
        if (hoverX !== null && hoverY !== null) {
            let dx = hoverX - drawX;
            let dy = hoverY - drawY;
            if (dx * dx + dy * dy <= Math.pow(currentIconRadius * 1.8, 2)) {
                hoveredRecipe = { 
                    name: rName, x: drawX, y: drawY, tx: r.targetX, ty: r.targetY, isDiscovered: isDiscovered 
                };
                isHover = true;
            }
        }

        // 決定顏色 (未發現的一律用深灰鎖頭色)
        let baseColor = isDiscovered ? "#d4af37" : "#555555";
        let borderColor = isDiscovered ? "#777777" : "#d4af37";
        const isTargetHover = (hoveredRecipe && hoveredRecipe.name === rName);
        
        ctx.fillStyle = isTargetHover ? "#fff" : baseColor;
        ctx.beginPath();
        ctx.arc(drawX, drawY, currentIconRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isTargetHover ? 2 : 1.5;
        ctx.stroke();

        // 繪製文字或鎖頭
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        
        if (isDiscovered) {
            const char = rName.length > 1 ? rName[1] : rName[0];
            ctx.fillStyle = isTargetHover ? "#000" : "#fff"; 
            if (highlightTargetId === r.nameId) ctx.font = `bold ${12 + (mapZoom - 1) * 2}px 'Microsoft JhengHei'`;
            else ctx.font = `bold ${10 + (mapZoom - 1) * 2}px 'Microsoft JhengHei'`;
            ctx.fillText(char, drawX, drawY + (mapZoom > 2 ? 1 : 1));
        } else {
            ctx.fillStyle = "#fff";
            ctx.font = `${8 + (mapZoom - 1) * 2}px Arial`; 
            ctx.fillText("🔒", drawX, drawY + (mapZoom > 2 ? 1 : 1));
        }

        // ★★★ 關鍵修改：如果是提示點，恢復透明度 ★★★
        if (isHint) {
            ctx.restore(); // 恢復 globalAlpha = 1
        }
    });

    // --- 6. 玩家結果連線 (保持不變) ---
    const resultToShow = isShowingPreviousResult ? previousPlayerResult : lastPlayerResult;

    if (resultToShow) {
        const pDrawX = cx + (resultToShow.x * pixelsPerUnit);
        const pDrawY = cy - (resultToShow.y * pixelsPerUnit);

        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pDrawX, pDrawY);
        ctx.strokeStyle = isShowingPreviousResult ? "rgba(50, 50, 50, 0.4)" : "rgba(50, 50, 50, 0.8)";
        ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();

        if (resultToShow.tx !== null && resultToShow.ty !== null) {
            const tDrawX = cx + (resultToShow.tx * pixelsPerUnit);
            const tDrawY = cy - (resultToShow.ty * pixelsPerUnit);
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tDrawX, tDrawY);
            ctx.strokeStyle = isShowingPreviousResult ? "rgba(212, 175, 55, 0.4)" : "rgba(212, 175, 55, 0.8)";
            ctx.lineWidth = 2; ctx.setLineDash([10, 5]); ctx.stroke(); ctx.setLineDash([]);
        }

        if (pDrawX >= -50 && pDrawX <= w + 50 && pDrawY >= -50 && pDrawY <= h + 50) {
            if (hoverX === null) {
                mapHitZones.push({x: pDrawX, y: pDrawY, r: currentIconRadius * 1.5, name: resultToShow.name, tx: resultToShow.x, ty: resultToShow.y});
            }
            if (hoverX !== null && hoverY !== null) {
                let dx = hoverX - pDrawX; let dy = hoverY - pDrawY;
                if (dx * dx + dy * dy <= Math.pow(currentIconRadius * 1.5, 2)) {
                    hoveredRecipe = {
                        name: resultToShow.name, x: pDrawX, y: pDrawY, tx: resultToShow.x, ty: resultToShow.y, isDiscovered: true 
                    };
                }
            }
            ctx.fillStyle = isShowingPreviousResult ? "#dddddd" : "#ffffff";
            ctx.beginPath(); ctx.arc(pDrawX, pDrawY, currentIconRadius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = "#000000"; ctx.textBaseline = "middle"; ctx.textAlign = "center";
            ctx.font = `bold ${10 + (mapZoom - 1) * 2}px 'Microsoft JhengHei'`;
            const iconText = isShowingPreviousResult ? "舊" : "丹";
            ctx.fillText(iconText, pDrawX, pDrawY + (mapZoom > 2 ? 1 : 1));
        }
    }

    // --- 7. Tooltip ---
    if (hoveredRecipe) {
        const prefix = hoveredRecipe.isDiscovered === false ? "🔒 " : "";
        const text = `${prefix}${hoveredRecipe.name} [${hoveredRecipe.tx.toFixed(2)}, ${hoveredRecipe.ty.toFixed(2)}]`;
        drawTooltip(ctx, text, hoveredRecipe.x, hoveredRecipe.y, w, h);
    }
}
// 輔助：判斷配方是否已發現 (檢查歷史紀錄與背包)
function isRecipeDiscovered(nameId) {
    // 1. 檢查背包
    const inInventory = inventoryStorage.some(item => 
        TextDB[item.nameId] === TextDB[nameId] // 比對名稱，或直接比對 item.id === nameId (視資料結構而定)
    );
    if (inInventory) return true;

    // 2. 檢查歷史紀錄 (三種流派都要查)
    for (const key in historyStorage) {
        const list = historyStorage[key];
        const inHistory = list.some(item => {
             // 歷史紀錄的 name 是字串，RecipeDB 的 nameId 是數字，需透過 TextDB 轉換比對
             return item.name === TextDB[nameId];
        });
        if (inHistory) return true;
    }
    
    return false;
}
// script.js - 請新增此函式

// 用於切換療效列表的展開/收合
window.toggleEffectItem = function(headerElement) {
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

function adjustWeight(amount) {
    currentWeight += amount;
    if (currentWeight < 0) currentWeight = 0;
    currentWeight = Math.round(currentWeight * 10) / 10;
    updateWeightUI();
}

function updateWeightUI() {
    document.getElementById('weight-display').textContent = currentWeight.toFixed(1) + " g";
    const slider = document.getElementById('weight-slider');
    if (slider) slider.value = currentWeight * 10;
}

const slider = document.getElementById('weight-slider');
if (slider) {
    slider.addEventListener('input', (e) => {
        currentWeight = e.target.value / 10;
        document.getElementById('weight-display').textContent = currentWeight.toFixed(1) + " g";
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

async function runResultSequence() {
    const processText = document.getElementById('process-text');
    const finalContainer = document.getElementById('final-result-container');
    const restartBtn = document.getElementById('restart-btn');

    if (finalContainer) finalContainer.classList.add('hidden');
    if (restartBtn) restartBtn.classList.add('hidden');

    if (processText) {
        processText.classList.remove('hidden');
        processText.className = "";
        const messages = ["小心翼翼熄滅火苗...", "用夾子打開丹爐蓋子...", "丹爐中飄出奇特的味道..."];
        for (let msg of messages) {
            processText.textContent = msg;
            await new Promise(r => setTimeout(r, 1500));
        }
        processText.classList.add('hidden');
    }
    calculateFinalResult();
}

function calculateFinalResult() {
    console.log("[系統] 開始結算...");
    document.getElementById('final-result-container').classList.remove('hidden');
    document.getElementById('restart-btn').classList.remove('hidden');

    const resultID = Math.floor(Math.random() * 9000) + 1000;
    if (potMaterials.length < 2) { log("錯誤：材料不足"); return; }

    // 備份資料
    if (lastResultData) {
        previousResultData = lastResultData;
        previousPlayerResult = lastPlayerResult;
    }

    isShowingPreviousResult = false;
    const toggleBtn = document.getElementById('toggle-result-btn');
    if (toggleBtn) toggleBtn.textContent = "👀 查看上一次結果";

    // --- 1. 物理運算與排序 ---
    let sortedMats = [...potMaterials].sort((a, b) => b.weight - a.weight);
    let pMat1 = sortedMats[0];
    let pMat2 = sortedMats[1];
    let dbMat1 = MaterialDB[pMat1.id];
    let dbMat2 = MaterialDB[pMat2.id];
    let playerRes = calculateCoordinate(dbMat1, pMat1.weight, dbMat2, pMat2.weight, grindCoefficient);

    let bestRecipe = null;
    let isSlag = false;
    let slagReason = "";
    let errorType = "NONE";

    // --- 2. 配方篩選 (門票檢查) ---
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

        // --- 3. 品項與救援判定 ---
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
            if (dist > SLAG_FALLBACK_DISTANCE) { isSlag = true; slagReason = "副材料不合且比例相差過大/"; bestRecipe = null; }
        }
    }

    // --- 4. 兜底邏輯 ---
    if (!bestRecipe) {
        let minDist = 9999;
        RecipeDB.forEach(r => {
            let d = Math.sqrt(Math.pow(playerRes.x - r.targetX, 2) + Math.pow(playerRes.y - r.targetY, 2));
            if (d < minDist) { minDist = d; bestRecipe = r; }
        });
        isSlag = true;
        if (!slagReason) slagReason = "未找到合適配方(例外情況)";
    }

    // --- 5. 計算評級分數 ---
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

    // script.js - 修改 calculateFinalResult 的評級區塊

    // --- 6. 決定品質評級 ---
    let quality = "D";
    let qualityPool = CommentsDB.SLAG;

    if (isSlag) {
        quality = "D";
    } else {
        // ★★★ 修改處：移除強制鎖定 B 級的邏輯 ★★★
        // 原本這裡有 if (errorType === "MATERIAL") { quality = "B"; ... }
        // 現在我們直接讓數學決定命運！

        // 嚴格的數學判定標準
        // 注意：即使拿到 A，如果 errorType 是 MATERIAL，最後的 Advice 還是會罵玩家用錯材料 (這是我們要的效果)

        let isPerfect = (matchRate >= 0.99) && (Math.abs(grindCoefficient - bestRecipe.grindTarget) < 0.01) && (bestDist < 0.01);

        if (isPerfect) {
            quality = "U"; qualityPool = CommentsDB.U;
        } else if (bestDist <= 0.05 && matchRate >= 0.95) {
            quality = "S"; qualityPool = CommentsDB.S;
        } else if (bestDist <= 0.4 && matchRate >= 0.70) {
            quality = "A"; qualityPool = CommentsDB.A;
        } else if (bestDist <= 1.0 && matchRate >= 0.50) {
            quality = "B"; qualityPool = CommentsDB.B;
        } else {
            quality = "C"; qualityPool = CommentsDB.C;
        }
    }

    // 後面的 Advice 邏輯不用動，它會繼續運作
    // 如果是 A 級替代品，玩家會看到：
    // 評級：A 級 (數值漂亮)
    // 建議：呵，這材料嘛…… (大師依然能嘗出材料不對)
    // 這非常有「雖然好用但不是正統」的味道！

    let randomComment = qualityPool[Math.floor(Math.random() * qualityPool.length)];
    let finalComment = isSlag ? slagReason + " " + randomComment : randomComment;

    let advice = "";
    if (errorType === "MATERIAL") advice = MasterAdviceDB.WRONG_MATERIAL;
    else if (errorType === "ELEMENT") advice = MasterAdviceDB.WRONG_ELEMENT;
    else advice = MasterAdviceDB.WRONG_RATIO;

    // --- 7. 準備詳細資訊 ---
    let symptomText = "無";
    let reactionText = "無";

    if (!isSlag && bestRecipe) {
        if (bestRecipe.symptoms && bestRecipe.symptoms.length > 0) {
            symptomText = bestRecipe.symptoms.map(sId => {
                const sObj = SymptomsDB[sId];
                return sObj ? TextDB[sObj.descId] : "未知";
            }).join("、");
        }
        if (bestRecipe.effectId) {
            reactionText = TextDB[bestRecipe.effectId] || "無特殊反應";
        }
    } else {
        reactionText = "你該不會想吃吃看吧？";
    }

    // --- 8. 毒素計算 ---
    let toxinValX = 0, toxinValY = 0;
    let v1 = resolveDirection(dbMat1.element, dbMat2.element);
    let v2 = resolveDirection(dbMat2.element, dbMat1.element);

    if (v1.x !== 0) toxinValX = dbMat1.toxin; else if (v2.x !== 0) toxinValX = dbMat2.toxin;
    if (v1.y !== 0) toxinValY = dbMat1.toxin; else if (v2.y !== 0) toxinValY = dbMat2.toxin;

    let finalToxin = (Math.abs(playerRes.x) * toxinValX) + (Math.abs(playerRes.y) * toxinValY);
    if (finalToxin === 0) finalToxin += 0.1;
    if (finalToxin >= 60) finalToxin = 60;
    let displayToxin = finalToxin.toFixed(2);

    // --- 9. 渣滓處理 ---
    let finalName = isSlag ? "渣滓" : TextDB[bestRecipe.nameId];
    let finalElement = isSlag ? "無" : bestRecipe.element;
    // --- 陰陽計算 ---
    let finalYinYang = "無";

    if (!isSlag && bestRecipe && typeof bestRecipe.yinYang === "number") {
        // yinYang 範圍假設是 -3 ~ +3，轉成 1~7
        const yyIndex = bestRecipe.yinYang + 4; // -3 → 1, 0 → 4, +3 → 7
        finalYinYang = TextDB[yyIndex] || "未知";
    }

    let finalDesc = isSlag ? "一坨黑乎乎的東西，散發著難以言喻的味道。" : TextDB[bestRecipe.descId];
    let displayDeviation = isSlag ? "---" : bestDist.toFixed(2);
    let displayMatch = isSlag ? "---" : matchRatePct;

    lastPlayerResult = {
        x: playerRes.x, y: playerRes.y, name: finalName,
        tx: isSlag ? null : bestRecipe.targetX, ty: isSlag ? null : bestRecipe.targetY
    };

    const resultData = {
        id: resultID,
        name: finalName,
        quality: quality,
        element: finalElement,
        yinYang: finalYinYang, // ★ 新增
        qualityText: quality === "D" ? "渣滓" : quality + "級",
        deviation: displayDeviation,
        matchRate: displayMatch,
        comment: finalComment,
        desc: finalDesc,
        mainMat: `${TextDB[dbMat1.nameId]} (${dbMat1.element})`,
        subMat: `${TextDB[dbMat2.nameId]} (${dbMat2.element})`,
        grind: (grindCoefficient * 100).toFixed(0) + "%",
        advice: advice,
        symptoms: symptomText,
        reaction: reactionText,
        toxin: displayToxin,
        playerRes: lastPlayerResult
    };

    lastResultData = resultData;
    updateResultUI(resultData);
    saveToHistory(resultData);

    // ★★★ [新增] 成功煉製則存入背包 ★★★
    if (!isSlag) {
        saveToInventory(resultData);
        log(`[背包] 已自動收藏：${finalName}`);
    } else {
        log(`[背包] 渣滓不予收藏`);
    }

    drawRecipeMap();
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
    if (data.quality === 'U' || data.quality === 'S') qColor = "#FFD700";
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
// (此函式若與您目前一致可不需修改，僅供檢查)
function saveToHistory(data) {
    let item = { ...data, time: new Date().toLocaleTimeString() };

    // 確保結構存在
    if (!historyStorage[earthMode]) historyStorage[earthMode] = [];

    // 加到陣列最前面
    historyStorage[earthMode].unshift(item);

    // 寫入 LocalStorage
    localStorage.setItem('alchemy_history_storage', JSON.stringify(historyStorage));
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


function renderHistory() {
    const container = document.getElementById('history-list-container');
    container.innerHTML = "";

    // ★★★ [關鍵修正] 讀取 currentHistoryTab (選中的頁籤)，而不是 earthMode (當前遊戲) ★★★
    const list = historyStorage[currentHistoryTab] || [];

    if (list.length === 0) {
        // 顯示流派名稱，讓玩家知道現在看的是哪一個
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
// ★★★ [新增] 共用的狀態清除函式 ★★★
function clearGameState() {
    console.log("[系統] 執行狀態清除...");

    // 清空材料與權重
    potMaterials = [];
    selectedMatID = null;
    currentWeight = 0.0;

    // 重置儀式變數
    resetRitualStates();

    // ★★★ [修正] 徹底清除上一次的結果紀錄與地圖點 ★★★
    lastPlayerResult = null;
    previousPlayerResult = null;
    lastResultData = null;
    previousResultData = null;
    isShowingPreviousResult = false;

    // 隱藏相關 UI
    const finalResult = document.getElementById('final-result-container');
    if (finalResult) finalResult.classList.add('hidden');

    const processText = document.getElementById('process-text');
    if (processText) processText.classList.add('hidden');

    // ★★★ [關鍵] 清除地圖畫面 (畫布重繪為空白/僅背景) ★★★
    // 這裡我們將 mapHitZones 清空並呼叫繪圖
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
                if (dx*dx + dy*dy <= zone.r * zone.r) {
                    // 如果點擊了，可以在這裡實作更多功能
                    console.log("點擊了配方:", zone.name);
                    break;
                }
            }
        }
    });
}
// script.js - 新增功能函式

// 切換地圖提示顯示狀態
function toggleMapHints() {
    const checkbox = document.getElementById('map-hint-check');
    if (checkbox) {
        showMapHints = checkbox.checked;
        drawRecipeMap(); // 狀態改變後立即重繪
    }
}
// 修改：使用共用的清除邏輯
function resetGame() {
    console.log("[系統] 重置遊戲 (重新煉製)...");

    // 呼叫清除函式
    clearGameState();

    // 回到流派選擇 (或您原本的邏輯是回到步驟0，這裡假設是回到流派選擇)
    showGameModeSelection();
}
