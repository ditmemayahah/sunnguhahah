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
    [1,"MiniGame","GM_dcmshiffsdf","12123p",{"info":"{\"ipAddress\":\"2405:4802:18ce:a780:8c30:666c:5bfd:36b1\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJkY3VtYXJlZmUiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbxzZSwidmVyaWZpZWRCYW5rQWNjb3VudCI6ZmFsc2UsInBsYXlFdmVudExvYmJ5IjpmFsc2UsImN1c3RvbWVySWQiOjMxMzM1MTc1MSwiYWZmSWQiOiJHRU1XSU5cIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTU2ODE2NDk0NzMsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwNTo0ODAyOjE4Y2U6YTc4MDo4YzMwOjY2NmM6NWJmZDozNmIxIiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8wMS5wbmciLCJwbGF0Zm9ybUlkIjo0LCJ1c2VySWQiOiI1OWYzZDA1Yy1jNGZjLTQxOTEtODI1OS04OGU2OGUyYThmMGYiLCJyZWdUaW1lIjoxNzU1Njc0NzAzODA4LCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IkdNX2RjbXNoaWZmc2RmIn0.vDdq-SLgdXjRwijNY5PEMUEETEP4dQRklZnWcTtJML8\",\"locale\":\"vi\",\"userId\":\"59f3d05c-c4fc-4191-8259-88e68e2a8f0f\",\"username\":\"GM_dcmshiffsdf\",\"timestamp\":1755681649473,\"refreshToken\":\"5448e4e7f31241a6bda367b3ac520167.dce5a5690af745c9b01a73d531a1901b\"}","signature":"05F08CF241C76DA35BB0C4F951181A807E2423EDB9FF99F9A24ABF6929E668889BB84BC1EE0DFE61F0114CE262D61DEBFFFA8E9DF09CA1E1985B326CAE963138027D37B13D7671545DCDD357079FFC7B18E2E33FC85D68E43571BC8D2CC28BC502D0D8FEE4544D680817F607309C415A6C496C287E44C98E91D04577DCA9CCFB"}],
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
    
    let html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lịch sử Tài Xỉu Sunwin</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
                color: #fff;
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: rgba(0, 0, 0, 0.7);
                border-radius: 15px;
                padding: 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
            }
            
            header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid rgba(255, 255, 255, 0.2);
            }
            
            h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                color: #fdbb2d;
                text-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
            }
            
            .stats {
                display: flex;
                justify-content: space-around;
                flex-wrap: wrap;
                margin-bottom: 30px;
                gap: 15px;
            }
            
            .stat-card {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 15px;
                text-align: center;
                flex: 1;
                min-width: 200px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }
            
            .stat-card h3 {
                font-size: 1.2rem;
                margin-bottom: 10px;
                color: #fdbb2d;
            }
            
            .stat-card p {
                font-size: 1.8rem;
                font-weight: bold;
            }
            
            .dung {
                color: #28a745;
            }
            
            .sai {
                color: #dc3545;
            }
            
            .history-container {
                max-height: 600px;
                overflow-y: auto;
                padding-right: 10px;
            }
            
            .history-container::-webkit-scrollbar {
                width: 8px;
            }
            
            .history-container::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
            }
            
            .history-container::-webkit-scrollbar-thumb {
                background: #fdbb2d;
                border-radius: 10px;
            }
            
            .entry {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 15px;
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                align-items: center;
                transition: transform 0.3s, background 0.3s;
            }
            
            .entry:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: translateY(-3px);
            }
            
            .session {
                font-weight: bold;
                font-size: 1.2rem;
                color: #fdbb2d;
                min-width: 120px;
            }
            
            .prediction {
                padding: 5px 10px;
                border-radius: 20px;
                font-weight: bold;
                background: rgba(0, 0, 0, 0.3);
            }
            
            .tai {
                color: #28a745;
            }
            
            .xiu {
                color: #dc3545;
            }
            
            .dice {
                display: flex;
                gap: 10px;
            }
            
            .dice span {
                display: inline-block;
                width: 35px;
                height: 35px;
                line-height: 35px;
                text-align: center;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                font-weight: bold;
            }
            
            .result {
                margin-left: auto;
                padding: 5px 15px;
                border-radius: 20px;
                font-weight: bold;
            }
            
            .correct {
                background: rgba(40, 167, 69, 0.3);
                color: #28a745;
            }
            
            .incorrect {
                background: rgba(220, 53, 69, 0.3);
                color: #dc3545;
            }
            
            .unknown {
                background: rgba(108, 117, 125, 0.3);
                color: #6c757d;
            }
            
            .pattern {
                margin-top: 30px;
                text-align: center;
                padding: 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                overflow-x: auto;
            }
            
            .pattern span {
                display: inline-block;
                width: 25px;
                height: 25px;
                line-height: 25px;
                text-align: center;
                margin: 0 2px;
                border-radius: 50%;
                font-weight: bold;
            }
            
            .pattern-T {
                background: rgba(40, 167, 69, 0.3);
                color: #28a745;
            }
            
            .pattern-X {
                background: rgba(220, 53, 69, 0.3);
                color: #dc3545;
            }
            
            @media (max-width: 768px) {
                .entry {
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .result {
                    margin-left: 0;
                }
                
                .stats {
                    flex-direction: column;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>Lịch Sử Tài Xỉu Sunwin</h1>
                <p>Theo dõi kết quả và dự đoán các phiên gần nhất</p>
            </header>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>Tổng số phiên</h3>
                    <p>${fullHistory.length}</p>
                </div>
                <div class="stat-card">
                    <h3>Dự đoán đúng</h3>
                    <p class="dung">${apiResponseData.tong_dung}</p>
                </div>
                <div class="stat-card">
                    <h3>Dự đoán sai</h3>
                    <p class="sai">${apiResponseData.tong_sai}</p>
                </div>
                <div class="stat-card">
                    <h3>Tỷ lệ thắng</h3>
                    <p>${apiResponseData.ty_le_thang_lich_su}</p>
                </div>
            </div>
            
            <h2>Lịch sử ${fullHistory.length} phiên gần nhất</h2>
            
            <div class="history-container">`;

    if (fullHistory.length === 0) {
        html += '<div class="entry"><p>Chưa có dữ liệu lịch sử.</p></div>';
    } else {
        [...fullHistory].reverse().forEach(h => {
            const resultClass = h.result === 'Tài' ? 'tai' : 'xiu';
            let statusClass = 'unknown';
            let statusText = '';
            
            if (h.correctness === "ĐÚNG") {
                statusClass = 'correct';
                statusText = '✅ ĐÚNG';
            } else if (h.correctness === "SAI") {
                statusClass = 'incorrect';
                statusText = '❌ SAI';
            }

            const predictionHtml = h.prediction && h.prediction !== "?"
                ? `<div class="prediction ${h.prediction === 'Tài' ? 'tai' : 'xiu'}">Dự đoán: ${h.prediction}</div>
                   <div class="result ${statusClass}">${statusText}</div>`
                : '<div class="result unknown">CHƯA DỰ ĐOÁN</div>';

            html += `
                <div class="entry">
                    <div class="session">Phiên: ${h.session}</div>
                    ${predictionHtml}
                    <div class="dice">
                        <span>${h.d1}</span>
                        <span>${h.d2}</span>
                        <span>${h.d3}</span>
                    </div>
                    <div class="prediction ${resultClass}">Kết quả: ${h.result} (${h.totalScore})</div>
                </div>`;
        });
    }
    
    html += `
            </div>
            
            <div class="pattern">
                <h3>Biểu đồ chuỗi kết quả</h3>
                <div>`;
    
    if (fullHistory.length > 0) {
        fullHistory.slice(-50).forEach(h => {
            const patternClass = h.result === 'Tài' ? 'pattern-T' : 'pattern-X';
            html += `<span class="${patternClass}">${h.result === 'Tài' ? 'T' : 'X'}</span>`;
        });
    } else {
        html += '<p>Chưa có dữ liệu để hiển thị biểu đồ</p>';
    }
    
    html += `
                </div>
            </div>
        </div>
    </body>
    </html>`;
    
    res.send(html);
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Phân Tích Sunwin Tài Xỉu</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
                color: white;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                text-align: center;
                background: rgba(0, 0, 0, 0.7);
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
            }
            h1 {
                margin-bottom: 20px;
                color: #fdbb2d;
            }
            .links {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin-top: 30px;
            }
            a {
                display: inline-block;
                padding: 12px 25px;
                background: rgba(253, 187, 45, 0.2);
                color: white;
                text-decoration: none;
                border-radius: 30px;
                transition: all 0.3s;
                border: 1px solid #fdbb2d;
            }
            a:hover {
                background: rgba(253, 187, 45, 0.4);
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎯 API Phân Tích Sunwin Tài Xỉu</h1>
            <div class="links">
                <a href="/sunlon">Xem kết quả JSON</a>
                <a href="/history">Xem lịch sử 1000 phiên gần nhất</a>
            </div>
        </div>
    </body>
    </html>`);
});

app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
