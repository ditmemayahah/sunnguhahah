// server.js
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const ThuatToan = require('./thuatoan.js');

// ##################################################################
// ############## ADAPTER FOR THE SERVER LOGIC ###################
// ##################################################################

class MasterPredictor {
    constructor() {
        this.scoreHistory = [];
        this.resultHistory = [];
        this.thuatToan = new ThuatToan();
    }

    /**
     * Updates the predictor with the latest game result.
     * @param {{score: number, result: string}} newEntry - The score and result of the last game.
     */
    async updateData({ score, result }) {
        this.scoreHistory.push(score);
        this.resultHistory.push({ result, timestamp: Date.now() });
        
        // To prevent memory leaks, keep the history to a reasonable size.
        if (this.scoreHistory.length > 500) {
            this.scoreHistory.shift();
            this.resultHistory.shift();
        }
    }

    /**
     * Generates a new prediction based on the entire history.
     * @returns {Promise<{prediction: string, confidence: number}>}
     */
    async predict() {
        if (this.resultHistory.length < 1) {
            return { prediction: "?", confidence: 0 };
        }

        try {
            // Sử dụng thuật toán từ thuatoan.js
            const prediction = this.thuatToan.predict(this.resultHistory);
            const confidence = this.thuatToan.calculateConfidence();
            
            return {
                prediction: prediction,
                confidence: confidence
            };
        } catch (error) {
            console.error("[❌] Error during prediction:", error);
            return { prediction: "?", confidence: 0 };
        }
    }
}

// ###############################################################
// ############## END: INTEGRATED ALGORITHM CODE ##################
// ################################################################

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

let apiResponseData = {
    id: "@gvt",
    phien: null,
    xuc_xac_1: null,
    xuc_xac_2: null,
    xuc_xac_3: null,
    tong: null,
    ket_qua: "",
    du_doan: "?",
    do_tin_cay: "0%",
    tong_dung: 0,
    tong_sai: 0,
    ty_le_thang_lich_su: "0%",
    pattern: "",
    tong_phien_da_phan_tich: 0
};

const MAX_HISTORY_SIZE = 1000;
let currentSessionId = null;
let lastPrediction = null; 
const fullHistory = []; 

// Instantiate the new integrated predictor
const predictor = new MasterPredictor();

const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;

// Dữ liệu initialMessages đã được cập nhật
const initialMessages = [
    [1,"MiniGame","GM_dcmshiffsdf","12123p",{"info":"{\"ipAddress\":\"2405:4802:18ce:a780:8c30:666c:5bfd:36b1\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJkY3VtYXJlZmUiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbxzZSwidmVyaWZpZWRCYW5rQWNjb3VudCI6ZmFsc2UsInBsYXlFdmVudExvYmJ5IjpmYWxzZSwiY3VzdG9tZXJJZCI6MzEzMzUxNzUxLCJhZmZJZCI6IkdFTVdJTlwiLCJiYW5uZWQiOmZhbHNlLCJicmFuZCI6ImdlbSIsInRpbWVzdGFtcCI6MTc1NTY4MTY0OTQ3MywibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOmZhbHNlLCJpcEFkZHJlc3MiOiIyNDA1OjQ4MDI6MThjZTphNzgwOjhjMzA6NjY2Yzo1YmZkOjM2YjEiLCJtdXRlIjpmYWxzZSwiYXZhdGFyIjoiaHR0cHM6Ly9pbWFnZXMuc3dpbnNob3AubmV0L2ltYWdlcy9hdmF0YXIvYXZhdGFyXzAxLnBuZyIsInBsYXRmb3JtSWQiOjQsInVzZXJJZCI6IjU5ZjNkMDVjLWM0ZmMtNDE5MS04MjU5LTg4ZTY4ZTJhOGYwZiIsInJlZ1RpbWUiOjE3NTU2NzQ3MDM4MDgsInBob25lIjoiIiwiZGVwb3NpdCI6ZmFsc2UsInVzZXJuYW1lIjoiR01fZGNtc2hpZmZzZGYifQ.vDdq-SLgdXjRwijNY5PEMUEETEP4dQRklZnWcTtJML8\",\"locale\":\"vi\",\"userId\":\"59f3d05c-c4fc-4191-8259-88e68e2a8f0f\",\"username\":\"GM_dcmshiffsdf\",\"timestamp\":1755681649473,\"refreshToken\":\"5448e4e7f31241a6bda367b3ac520167.dce5a5690af745c9b01a73d531a1901b\"}","signature":"05F08CF241C76DA35BB0C4F951181A807E2423EDB9FF99F9A24ABF6929E668889BB84BC1EE0DFE61F0114CE262D61DEBFFFA8E9DF09CA1E1985B326CAE963138027D37B13D7671545DCDD357079FFC7B18E2E33FC85D68E43571BC8D2CC28BC502D0D8FEE4544D680817F607309C415A6C496C287E44C98E91D04577DCA9CCFB"}],
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

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;

            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) {
                currentSessionId = sid;
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;

                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";
                
                let correctnessStatus = null;
                if (lastPrediction && lastPrediction !== "?") {
                    if (lastPrediction === result) {
                        apiResponseData.tong_dung++;
                        correctnessStatus = "ĐÚNG";
                    } else {
                        apiResponseData.tong_sai++;
                        correctnessStatus = "SAI";
                    }
                }

                const totalGames = apiResponseData.tong_dung + apiResponseData.tong_sai;
                apiResponseData.ty_le_thang_lich_su = totalGames === 0 ? "0%" : `${((apiResponseData.tong_dung / totalGames) * 100).toFixed(0)}%`;

                const historyEntry = { 
                    session: currentSessionId, d1, d2, d3, 
                    totalScore: total, result, 
                    prediction: lastPrediction,
                    correctness: correctnessStatus 
                };
                fullHistory.push(historyEntry);
                if (fullHistory.length > MAX_HISTORY_SIZE) fullHistory.shift();
                
                // 1. Update the algorithm with the new result (total score and text result)
                await predictor.updateData({ score: total, result: result });
                
                // 2. Get the next prediction from the algorithm
                const predictionResult = await predictor.predict();
                
                let finalPrediction = predictionResult.prediction;
                let predictionConfidence = `${(predictionResult.confidence * 100).toFixed(0)}%`;

                // Update the main response object
                apiResponseData.phien = currentSessionId;
                apiResponseData.xuc_xac_1 = d1;
                apiResponseData.xuc_xac_2 = d2;
                apiResponseData.xuc_xac_3 = d3;
                apiResponseData.tong = total;
                apiResponseData.ket_qua = result;
                apiResponseData.du_doan = finalPrediction;
                apiResponseData.do_tin_cay = predictionConfidence;
                apiResponseData.pattern = fullHistory.map(h => h.result === 'Tài' ? 'T' : 'X').join('');
                apiResponseData.tong_phien_da_phan_tich = fullHistory.length;

                // Set the new prediction for the next round's evaluation
                lastPrediction = finalPrediction;
                currentSessionId = null;
                
                console.log(`Phiên #${apiResponseData.phien}: ${apiResponseData.tong} (${result}) | Dự đoán mới: ${finalPrediction} | Tin cậy: ${apiResponseData.do_tin_cay} | Tỷ lệ thắng: ${apiResponseData.ty_le_thang_lich_su}`);
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
            const resultClass = h.result === 'Tài' ? 'tai' : 'xiu';
            let statusHtml = '';
            if (h.correctness === "ĐÚNG") {
                statusHtml = ` <span class="dung">✅ ĐÚNG</span>`;
            } else if (h.correctness === "SAI") {
                statusHtml = ` <span class="sai">❌ SAI</span>`;
            }

            const predictionHtml = h.prediction && h.prediction !== "?"
                ? `- Dự đoán: <b>${h.prediction}</b>${statusHtml}<br/>`
                : '';

            html += `<div class="entry">
                        - Phiên: <b>${h.session}</b><br/>
                        ${predictionHtml}
                        - Kết quả: <span class="${resultClass}">${h.result}</span><br/>
                        - Xúc xắc: [${h.d1}]-[${h.d2}]-[${h.d3}] (Tổng: ${h.totalScore})
                     </div>`;
        });
    }
    res.send(html);
});

app.get('/', (req, res) => {
    res.send(`<h2>🎯 API Phân Tích Sunwin Tài Xỉu</h2><p>Xem kết quả JSON: <a href="/sunlon">/sunlon</a></p><p>Xem lịch sử 1000 phiên gần nhất: <a href="/history">/history</a></p>`);
});

app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
