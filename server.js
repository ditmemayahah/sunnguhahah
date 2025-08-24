const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

// ##################################################################
// ############## START: GỌI THUẬT TOÁN TỪ FILE BÊN NGOÀI ##########
// ##################################################################
const { MasterPredictor } = require('./thuatoan.js');
const predictor = new MasterPredictor();
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
    [1,"MiniGame","GM_dcmshiffsdf","12123p",{"info":"{\"ipAddress\":\"2405:4802:18ce:a780:8c30:666c:5bfd:36b1\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJkY3VtYXJlZmUiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTMzNTE3NTEsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTU2ODE2NDk0NzMsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwNTo0ODAyOjE4Y2U6YTc4MDo4YzMwOjY2NmM6NWJmZDozNmIxIiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8wMS5wbmciLCJwbGF0Zm9ybUlkIjo0LCJ1c2VySWQiOiI1OWYzZDA1Yy1jNGZjLTQxOTEtODI1OS04OGU2OGUyYThmMGYiLCJyZWdUaW1lIjoxNzU1Njc0NzAzODA4LCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IkdNX2RjbXNoaWZmc2RmIn0.vDdq-SLgdXjRwijNY5PEMUEETEP4dQRklZnWcTtJML8\",\"locale\":\"vi\",\"userId\":\"59f3d05c-c4fc-4191-8259-88e68e2a8f0f\",\"username\":\"GM_dcmshiffdsf\"}","signature":"05F08CF241C76DA35BB0C4F951181A807E2423EDB9FF99F9A24ABF6929E668889BB84BC1EE0DFE61F0114CE262D61DEBFFFA8E9DF09CA1E1985B326CAE963138027D37B13D7671545DCDD357079FFC7B18E2E33FC85D68E43571BC8D2CC28BC502D0D8FEE4544D680817F607309C415A6C496C287E44C98E91D04577DCA9CCFB"}],
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
                apiResponseData.phien = sid;
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;

                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";
                
                // Cập nhật tỷ lệ thắng lịch sử
                let correctnessStatus = null;
                if (lastPrediction && lastPrediction !== "?") {
                    if (lastPrediction === result) {
                        predictor.correctPredictions++;
                        correctnessStatus = "ĐÚNG";
                    } else {
                        // #############################################
                        // ###### START: SỬA LỖI HIỂN THỊ ĐÚNG/SAI ######
                        // #############################################
                        correctnessStatus = "SAI"; // Thêm dòng này để ghi nhận dự đoán SAI
                        // ###########################################
                        // ###### END: SỬA LỖI HIỂN THỊ ĐÚNG/SAI ######
                        // ###########################################
                    }
                    predictor.totalPredictions++;
                }

                const winRate = predictor.totalPredictions === 0 ? "0%" : `${((predictor.correctPredictions / predictor.totalPredictions) * 100).toFixed(0)}%`;
                apiResponseData.ty_le_thang_lich_su = winRate;
                
                await predictor.updateData({ result: result, score: total });
                
                const predictionResult = await predictor.predict();
                
                apiResponseData.ket_qua = result;
                apiResponseData.du_doan = predictionResult.prediction;
                apiResponseData.do_tin_cay = `${(predictionResult.confidence * 100).toFixed(0)}%`;
                
                lastPrediction = apiResponseData.du_doan;
                
                console.log(`Phiên #${apiResponseData.phien}: ${total} (${result}) | Dự đoán mới: ${apiResponseData.du_doan} | Tin cậy: ${apiResponseData.do_tin_cay} | Tỷ lệ thắng: ${apiResponseData.ty_le_thang_lich_su}`);

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

// ########################################################
// ###### START: TRANG TRÍ LẠI TRANG LỊCH SỬ ##############
// ########################################################
app.get('/history', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let html = `<style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        background-color: #1a1a1d; 
                        color: #c5c6c7; 
                        padding: 20px; 
                        line-height: 1.6;
                    }
                    .container { max-width: 700px; margin: auto; }
                    h2 { 
                        color: #66fcf1; 
                        text-align: center; 
                        margin-bottom: 25px; 
                        border-bottom: 2px solid #45a29e; 
                        padding-bottom: 10px; 
                        font-weight: 300;
                        letter-spacing: 1px;
                    }
                    .entry {
                        background-color: #2c3e50;
                        border: 1px solid #34495e;
                        border-left: 5px solid #66fcf1;
                        padding: 15px 20px;
                        margin-bottom: 15px;
                        border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .entry div { display: flex; align-items: center; }
                    .label { color: #95a5a6; min-width: 80px; }
                    .value { font-weight: bold; }
                    .result-tai { color: #2ecc71; }
                    .result-xiu { color: #e74c3c; }
                    .status-dung { color: #2ecc71; }
                    .status-sai { color: #e74c3c; }
                    .dice-img { 
                        width: 24px; 
                        height: 24px; 
                        margin: 0 3px;
                        background-color: #fff;
                        border-radius: 4px;
                        padding: 2px;
                    }
                    .dice-container { gap: 5px; }
                    .total-score { color: #bdc3c7; margin-left: 8px; font-size: 0.9em; }
                </style>
                <div class="container">
                    <h2>🎯 LỊCH SỬ ${fullHistory.length} PHIÊN GẦN NHẤT</h2>`;

    if (fullHistory.length === 0) {
        html += '<p style="text-align: center;">Chưa có dữ liệu lịch sử.</p>';
    } else {
        [...fullHistory].reverse().forEach(h => {
            const resultClass = h.ket_qua === 'Tài' ? 'result-tai' : 'result-xiu';
            let statusHtml = '';
            if (h.trang_thai === "ĐÚNG") {
                statusHtml = `<span class="status-dung value">✅ ĐÚNG</span>`;
            } else if (h.trang_thai === "SAI") {
                statusHtml = `<span class="status-sai value">❌ SAI</span>`;
            }

            const predictionHtml = h.du_doan && h.du_doan !== "?"
                ? `<div><span class="label">Dự đoán:</span> <span class="value">${h.du_doan}</span> ${statusHtml}</div>`
                : '';
            
            // Sửa link ảnh xúc xắc
            const diceImageURL = 'https://i.imgur.com/YDc3wz6.png'; // Link ảnh mới hoạt động

            html += `<div class="entry">
                        <div><span class="label">Phiên:</span> <span class="value">#${h.phien}</span></div>
                        ${predictionHtml}
                        <div><span class="label">Kết quả:</span> <span class="${resultClass} value">${h.ket_qua}</span></div>
                        <div class="dice-container">
                            <span class="label">Xúc xắc:</span> 
                            <img src="${diceImageURL}" alt="dice ${h.xuc_xac_1}" class="dice-img">
                            <img src="${diceImageURL}" alt="dice ${h.xuc_xac_2}" class="dice-img">
                            <img src="${diceImageURL}" alt="dice ${h.xuc_xac_3}" class="dice-img">
                            <span class="total-score">(Tổng: ${h.tong})</span>
                        </div>
                     </div>`;
        });
    }
    html += `</div>`;
    res.send(html);
});
// ######################################################
// ###### END: TRANG TRÍ LẠI TRANG LỊCH SỬ ##############
// ######################################################


app.get('/', (req, res) => {
    res.send(`<h2>🎯 API Phân Tích Sunwin Tài Xỉu</h2><p>Xem kết quả JSON: <a href="/sunlon">/sunlon</a></p><p>Xem lịch sử các phiên: <a href="/history">/history</a></p>`);
});

app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
