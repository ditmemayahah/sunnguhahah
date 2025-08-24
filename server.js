// server.js
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

// ##################################################################
// ############## START: GỌI THUẬT TOÁN TỪ FILE BÊN NGOÀI ##########
// ##################################################################
const { PredictionSystem } = require('./thuatoan.js');
const predictor = new PredictionSystem();
predictor.correctPredictions = 0;
predictor.totalPredictions = 0;
// ################################################################
// ############## END: GỌI THUẬT TOÁN TỪ FILE BÊN NGOÀI ############
// ################################################################

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

let apiResponseData = {
    phien: null,
    ket_qua: "",
    du_doan: "?",
    do_tin_cay: "0%",
    ty_le_thang_lich_su: "0%",
};

let lastPrediction = null; 
const fullHistory = []; 

const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;

const initialMessages = [
    [1,"MiniGame","GM_dcmshiffsdf","12123p",{info:"fake"}],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

function connectWebSocket() {
    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected.');
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
            }, i * 600);
        });
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.ping();
        }, PING_INTERVAL);
    });

    ws.on('pong', () => console.log('[📶] Ping OK.'));

    ws.on('message', (message) => { 
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;

            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) {
                apiResponseData.phien = sid;
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;

                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";
                const resultCode = result === "Tài" ? "T" : "X";
                
                // Cập nhật tỷ lệ thắng lịch sử
                let correctnessStatus = null;
                if (lastPrediction && lastPrediction !== "?") {
                    if (lastPrediction === result) {
                        predictor.correctPredictions++;
                        correctnessStatus = "ĐÚNG";
                    } else {
                        correctnessStatus = "SAI";
                    }
                    predictor.totalPredictions++;
                }

                const winRate = predictor.totalPredictions === 0 ? "0%" : `${((predictor.correctPredictions / predictor.totalPredictions) * 100).toFixed(0)}%`;
                apiResponseData.ty_le_thang_lich_su = winRate;
                
                // Cập nhật thuật toán với dữ liệu mới
                predictor.addResult(resultCode);
                
                // Lấy dự đoán mới
                const predictionResult = predictor.predict();
                
                apiResponseData.ket_qua = result;
                apiResponseData.du_doan = predictionResult.prediction === 'T' ? "Tài" : (predictionResult.prediction === 'X' ? "Xỉu" : "?");
                apiResponseData.do_tin_cay = `${(predictionResult.confidence * 100).toFixed(0)}%`;
                
                lastPrediction = apiResponseData.du_doan;
                
                console.log(`Phiên #${apiResponseData.phien}: ${total} (${result}) | Dự đoán mới: ${apiResponseData.du_doan} | Tin cậy: ${apiResponseData.do_tin_cay} | Tỷ lệ thắng: ${apiResponseData.ty_le_thang_lich_su}`);

                // Thêm vào lịch sử đầy đủ
                fullHistory.push({
                    phien: apiResponseData.phien,
                    xuc_xac_1: d1,
                    xuc_xac_2: d2,
                    xuc_xac_3: d3,
                    tong: total,
                    ket_qua: result,
                    du_doan: apiResponseData.du_doan,
                    do_tin_cay: apiResponseData.do_tin_cay,
                    trang_thai: correctnessStatus
                });
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[🔌] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}. Reconnecting...`);
        clearInterval(pingInterval);
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => {
        console.error('[❌] WebSocket error:', err.message);
        ws.close();
    });
}

app.get('/sunlon', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(apiResponseData, null, 4));
});

app.get('/history', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let html = `<style>
                    body{font-family:monospace;background-color:#121212;color:#e0e0e0;}
                    h2{color:#4e8af4;}
                    .entry{border-bottom:1px solid #444;padding:8px; margin-bottom: 5px; background-color:#1e1e1e; border-radius: 4px;}
                    .tai, .dung{color:#28a745; font-weight:bold;}
                    .xiu, .sai{color:#dc3545; font-weight:bold;}
                </style>
                <h2>Lịch sử ${fullHistory.length} phiên gần nhất</h2>`;

    if (fullHistory.length === 0) {
        html += '<p>Chưa có dữ liệu lịch sử.</p>';
    } else {
        [...fullHistory].reverse().forEach(h => {
            const resultClass = h.ket_qua === 'Tài' ? 'tai' : 'xiu';
            let statusHtml = '';
            if (h.trang_thai === "ĐÚNG") {
                statusHtml = ` <span class="dung">✅ ĐÚNG</span>`;
            } else if (h.trang_thai === "SAI") {
                statusHtml = ` <span class="sai">❌ SAI</span>`;
            }

            const predictionHtml = h.du_doan && h.du_doan !== "?"
                ? `- Dự đoán: <b>${h.du_doan}</b>${statusHtml}<br/>`
                : '';

            html += `<div class="entry">
                        - Phiên: <b>${h.phien}</b><br/>
                        ${predictionHtml}
                        - Kết quả: <span class="${resultClass}">${h.ket_qua}</span><br/>
                        - Xúc xắc: [${h.xuc_xac_1}]-[${h.xuc_xac_2}]-[${h.xuc_xac_3}] (Tổng: ${h.tong})
                     </div>`;
        });
    }
    res.send(html);
});

app.get('/', (req, res) => {
    res.send(`<h2>🎯 API Phân Tích Sunwin Tài Xỉu</h2><p>Xem kết quả JSON: <a href="/sunlon">/sunlon</a></p><p>Xem lịch sử các phiên: <a href="/history">/history</a></p>`);
});

app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
