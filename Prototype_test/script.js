// Clinic_Sim/script.js - 新增翻譯對照表

// 症狀代碼對照表
const SYMPTOM_MAP = {
    'A': '安神/安眠 ',
    'B': '振奮/快感 ',
    'C': '補氣/補腎 ',
    'D': '養顏/回春 ',
    'E': '止痛/遮斷 '
};

// 1. 初始化
const alchemyChannel = new BroadcastChannel('alchemy_clinic_channel');
const STORAGE_KEY = 'clinic_received_packages';
let receivedHistory = [];

// 2. 啟動時讀取紀錄
window.onload = function() {
    loadHistory();
    renderHistoryUI();
    console.log("[醫館系統] 就緒，監聽頻道中...");
};

// 3. 監聽廣播
alchemyChannel.onmessage = (event) => {
    console.log("📡 收到訊號:", event.data);
    const payload = event.data;
    
    // 存檔
    savePackage(payload);
    
    // 更新介面
    renderReceivedPackage(payload); // 畫在桌面
    addLogEntry(payload);           // 加到紀錄清單
    
    // 簡單提示
    // alert(`收到來自 ${payload.patientName} 的藥品！`); 
};

// 4. 存檔邏輯
function savePackage(data) {
    // 補上接收時間戳記 (如果來源沒給)
    if (!data.receivedAt) data.receivedAt = new Date().toISOString();
    
    receivedHistory.unshift(data); // 最新在最前
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receivedHistory));
}

function loadHistory() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) {
        try {
            receivedHistory = JSON.parse(json);
        } catch(e) {
            console.error("紀錄讀取失敗", e);
            receivedHistory = [];
        }
    }
}

// 5. 渲染桌面 (只顯示最新的一筆)
function renderReceivedPackage(data) {
    const container = document.getElementById('reception-desk');
    
    if (container.classList.contains('empty-desk')) {
        container.innerHTML = "";
        container.classList.remove('empty-desk');
    }

    // 格式化時間
    const timeStr = new Date(data.timestamp || Date.now()).toLocaleTimeString();

    let medicinesHtml = "";
    data.medicines.forEach(med => {
        // 這裡顯示的 effectCodes 應該要有東西了
        const codesDisplay = (med.effectCodes && med.effectCodes.length > 0) 
            ? med.effectCodes.join(', ') 
            : "無/未知";

        medicinesHtml += `
            <div class="med-item">
                <div>
                    <strong>${med.name}</strong> 
                    <span class="med-tag">${med.quality}級</span>
                    <span class="med-tag" style="color:${getElementColor(med.element)}">${med.element}</span>
                </div>
                <div style="color:#666; font-size:0.9rem;">
                    毒素: ${med.toxin} | 療效碼: [${codesDisplay}]
                </div>
            </div>
        `;
    });

    // 每次收到新包裹，我們把舊的清掉只留最新的，或者 prepend 也可以
    // 這裡示範只留最新的在桌上，歷史紀錄看 Log
    container.innerHTML = `
        <div class="medicine-package">
            <div class="package-header">
                <span>📦 病患：${data.patientName}</span>
                <span style="font-size:0.8rem;">接收時間：${timeStr}</span>
            </div>
            <div class="package-body">
                ${medicinesHtml}
            </div>
        </div>
    `;
}
// Clinic_Sim/script.js - 請確認此函式存在於檔案最外層

function toggleHistoryDetails(header) {
    const body = header.nextElementSibling; // 找到下方的 body
    const arrow = header.querySelector('.arrow-icon');
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        header.classList.add('active');
        if(arrow) arrow.textContent = '▲';
    } else {
        body.style.display = 'none';
        header.classList.remove('active');
        if(arrow) arrow.textContent = '▼';
    }
}
// Clinic_Sim/script.js - 修改 renderHistoryUI (加入中文翻譯)

function renderHistoryUI() {
    const logArea = document.getElementById('log-area');
    const list = document.getElementById('log-list');
    list.innerHTML = "";

    if (receivedHistory.length > 0) {
        logArea.classList.remove('hidden');
        
        receivedHistory.forEach((pkg, index) => {
            const li = document.createElement('li');
            li.className = "history-entry";
            
            const timeStr = new Date(pkg.receivedAt || Date.now()).toLocaleTimeString();
            const medCount = pkg.medicines.length;

            // 1. 標題列
            const headerHtml = `
                <div class="history-header" onclick="toggleHistoryDetails(this)">
                    <div class="header-left">
                        <span class="time-tag">${timeStr}</span>
                        <span class="patient-name">${pkg.patientName}</span>
                    </div>
                    <div class="header-right">
                        <span class="med-count">📦 ${medCount} 顆丹藥</span>
                        <span class="arrow-icon">▼</span>
                    </div>
                </div>
            `;

            // 2. 詳細內容區
            let bodyHtml = `<div class="history-body" style="display:none;">`;
            
            pkg.medicines.forEach(med => {
                // ★★★ 修改重點：將代碼轉為中文標籤 ★★★
                let symptomHtml = "";
                
                if (med.effectCodes && med.effectCodes.length > 0) {
                    // 遍歷每一個代碼 (例如 ['A', 'B'])
                    symptomHtml = med.effectCodes.map(code => {
                        const label = SYMPTOM_MAP[code] || code; // 查表翻譯
                        // 根據代碼給一點簡單的顏色樣式 (選用)
                        return `<span class="sym-tag code-${code}">${code} ${label}</span>`;
                    }).join(" ");
                } else {
                    symptomHtml = `<span style="color:#ccc;">無顯著療效</span>`;
                }

                bodyHtml += `
                    <div class="med-row">
                        <div class="med-main">
                            <span class="quality-badge" data-q="${med.quality}">${med.quality}</span>
                            <span class="med-name">${med.name}</span>
                        </div>
                        <div class="med-info">
                            <div style="margin-bottom:4px;">
                                <span style="color:${getElementColor(med.element)}">【${med.element}】</span> 
                                毒素: <strong>${med.toxin}</strong>
                            </div>
                            <div class="med-symptoms">
                                ${symptomHtml}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            bodyHtml += `</div>`;
            li.innerHTML = headerHtml + bodyHtml;
            list.appendChild(li);
        });
    }
}

// 輔助：單筆加入 Log (不用重繪全部)
function addLogEntry(pkg) {
    const logArea = document.getElementById('log-area');
    const list = document.getElementById('log-list');
    
    logArea.classList.remove('hidden');
    
    const li = document.createElement('li');
    const timeStr = new Date().toLocaleTimeString();
    li.innerHTML = `
        <span style="color:#00796b; font-weight:bold;">[${timeStr}]</span> 
        收到給 <strong>${pkg.patientName}</strong> 的 ${pkg.medicines.length} 顆藥
    `;
    
    // 加到最上面
    list.prepend(li);
}

function getElementColor(el) {
    const map = { '金': '#9E9E9E', '木': '#4CAF50', '水': '#2196F3', '火': '#F44336', '土': '#FFC107' };
    return map[el] || '#333';
}