// server.js
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

// ##################################################################
// ############## START: GỌI THUẬT TOÁN TỪ FILE BÊN NGOÀI ##########
// ##################################################################
// SỬA LỖI 1: Đổi tên MasterPredictor thành PredictionSystem cho đúng với file thuatoan.js
const { PredictionSystem } = require('./thuatoan.js');
const predictor = new PredictionSystem();
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;

const initialMessages = [
    [1,"MiniGame","GM_dcmshiffsdf","12123p",{"info":"{\"ipAddress\":\"2405:4802:18ce:a780:8c30:666c:5bfd:36b1\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJkY3VtYXJlZmUiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTMzNTE3NTEsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lcnN0YW1wIjoxNzU1NjgwODYyODQzLCJsb2NrR2FtZXMiOltdLCJhbW91bnQiOjAsImxvY2tDaGF0IjpmYWxzZSwicGhvbmVWZXJpZmllZCI6ZmFsc2UsImlwQWRkcmVzcyI6IjI0MDU6NDgwMjoxOGNlOmE3ODA6OGMzMDo2NjZjOjViZmQ6MzZiMSIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZ2VzL2F2YXRhci9hdmF0YXJfMDEucG5nIiwicGxhdGZvcm1JZCI6NCwidXNlcklkIjoiNTlmM2QwNWMtYzRmYy00MTkxLTgyNTktODhlNjhlMmE4ZjBmIiwicmVnVGltZSI6MTc1NTY3NDcwMzgwOCwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJHTV9kY21zaGlmZnNkZiJ9.231r9532D_L3x980F1626fT2G5876H2mU67z3_hL8kI\",\"locale\":\"vi\",\"userId\":\"59f3d05c-c4fc-4191-8259-88e68e2a8f0f\",\"username\":\"GM_dcmshiffdsf\"}","signature":"05F08CF241C76DA35BB0C4F951181A807E2423EDB9FF99F9A24ABF6929E668889BB84BC1EE0DFE61F0114CE262D61DEBFFFA8E9DF09CA1E1985B326CAE963138027D37B13D7671545DCDD357079FFC7B18E2E33FC85D68E43571BC8D2CC28BC502D0D8FEE4544D680817F607309C415A6C496C287E44C98E91D04577DCA9CCFB"}],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;
let correctPredictions = 0;
let totalPredictions = 0;

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
                apiResponseData.phien = sid;
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;

                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";
                const resultChar = result === 'Tài' ? 'T' : 'X';
                
                let correctnessStatus = null;
                if (lastPrediction && lastPrediction !== "?") {
                    totalPredictions++;
                    if (lastPrediction === result) {
                        correctPredictions++;
                        correctnessStatus = "ĐÚNG";
                    } else {
                        // SỬA LỖI 3: Thêm trường hợp dự đoán sai
                        correctnessStatus = "SAI";
                    }
                }

                const winRate = totalPredictions === 0 ? "0%" : `${((correctPredictions / totalPredictions) * 100).toFixed(0)}%`;
                apiResponseData.ty_le_thang_lich_su = winRate;
                
                // SỬA LỖI 2: Cập nhật thuật toán với đúng phương thức và định dạng dữ liệu
                predictor.addResult(resultChar);
                
                // Lấy dự đoán mới
                const predictionResult = predictor.predict();
                
                apiResponseData.ket_qua = result;

                // SỬA LỖI 5: Xử lý khi thuật toán chưa đưa ra dự đoán
                if (predictionResult.prediction) {
                    apiResponseData.du_doan = predictionResult.prediction === 'T' ? "Tài" : "Xỉu";
                    apiResponseData.do_tin_cay = `${(predictionResult.confidence * 100).toFixed(0)}%`;
                } else {
                    apiResponseData.du_doan = "?";
                    apiResponseData.do_tin_cay = "0%";
                }
                
                lastPrediction = apiResponseData.du_doan;
                
                console.log(`Phiên #${apiResponseData.phien}: ${total} (${result}) | Dự đoán mới: ${apiResponseData.du_doan} | Tin cậy: ${apiResponseData.do_tin_cay} | Tỷ lệ thắng: ${winRate}`);

                fullHistory.push({
                    phien: apiResponseData.phien,
                    xuc_xac_1: d1,
                    xuc_xac_2: d2,
                    xuc_xac_3: d3,
                    tong: total,
                    ket_qua: result,
                    du_doan: lastPrediction, 
                    do_tin_cay: apiResponseData.do_tin_cay,
                    trang_thai: correctnessStatus
                });
                
                // Giới hạn lịch sử để tránh tràn bộ nhớ
                if (fullHistory.length > 200) {
                    fullHistory.shift();
                }
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

// CẢI TIẾN: Giao diện trang /history đẹp hơn
app.get('/history', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lịch sử Phiên</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: 'Courier New', Courier, monospace;
                    background-color: #1a1a1a;
                    color: #e0e0e0;
                    margin: 0;
                    padding: 20px;
                }
                h2 {
                    color: #58a6ff;
                    text-align: center;
                    border-bottom: 2px solid #30363d;
                    padding-bottom: 10px;
                }
                .container {
                    max-width: 800px;
                    margin: auto;
                }
                .entry {
                    background-color: #212121;
                    border: 1px solid #30363d;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .info { flex-basis: 60%; }
                .result { flex-basis: 35%; text-align: right; }
                .phien { font-size: 1.1em; font-weight: bold; color: #c9d1d9; }
                .ket-qua { font-size: 1.2em; }
                .tai { color: #58a6ff; font-weight: bold; }
                .xiu { color: #ff7b72; font-weight: bold; }
                .dung { color: #3fb950; font-weight: bold; }
                .sai { color: #f85149; font-weight: bold; }
                .dice { font-size: 0.9em; color: #8b949e; }
                @media (max-width: 600px) {
                    .entry { flex-direction: column; align-items: flex-start; }
                    .result { text-align: left; margin-top: 10px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>📜 Lịch sử ${fullHistory.length} phiên gần nhất</h2>`;

    if (fullHistory.length === 0) {
        html += '<p style="text-align:center;">Chưa có dữ liệu lịch sử.</p>';
    } else {
        [...fullHistory].reverse().forEach(h => {
            const resultClass = h.ket_qua === 'Tài' ? 'tai' : 'xiu';
            let statusHtml = '';
            if (h.trang_thai === "ĐÚNG") {
                statusHtml = `<span class="dung">✅ ĐÚNG</span>`;
            } else if (h.trang_thai === "SAI") {
                statusHtml = `<span class="sai">❌ SAI</span>`;
            }

            const predictionHtml = h.du_doan && h.du_doan !== "?"
                ? `<span>Dự đoán: <b>${h.du_doan}</b> (${h.do_tin_cay}) - ${statusHtml}</span><br/>`
                : '<span>Chưa có dự đoán</span><br/>';

            html += `
                <div class="entry">
                    <div class="info">
                        <span class="phien">#${h.phien}</span><br/>
                        ${predictionHtml}
                        <span class="dice">🎲 [${h.xuc_xac_1}]-[${h.xuc_xac_2}]-[${h.xuc_xac_3}]</span>
                    </div>
                    <div class="result">
                        <span class="ket-qua">Kết quả: <span class="${resultClass}">${h.ket_qua} (${h.tong})</span></span>
                    </div>
                </div>`;
        });
    }
    html += `
            </div>
        </body>
        </html>`;
    res.send(html);
});


app.get('/', (req, res) => {
    res.send(`<h2>🎯 API Phân Tích Sunwin Tài Xỉu</h2><p>Xem kết quả JSON: <a href="/sunlon">/sunlon</a></p><p>Xem lịch sử các phiên: <a href="/history">/history</a></p>`);
});

app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
