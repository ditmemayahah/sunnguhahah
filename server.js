const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
// Import hàm dự đoán từ file thuatoan.js
const { getPrediction } = require('./thuatoan.js');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// ===================================
// === Trạng thái và Cấu hình API ===
// ===================================
let apiResponseData = {
    phien: null,
    xucxac: [],
    tong: null,
    ketqua: "",
    prediction: "?",
    tyledung: "0%"
};

// --- Biến quản lý trạng thái ---
const MAX_HISTORY_SIZE = 1000;
let currentSessionId = null;
let lastPrediction = "?";
const fullHistory = [];
let tong_dung = 0;
let tong_sai = 0;


// --- Cấu hình WebSocket ---
const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 5000;
const PING_INTERVAL = 15000;

const initialMessages = [
    [1, "MiniGame", "GM_ghetvicode", "123123p", { "info": "{\"ipAddress\":\"2402:800:62cd:9a0f:f50f:362a:a11d:6b53\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJoYWhoZGVpZG93IiwiYm90IjowLCJpc01lcmNoYW50IjpmYWxzZSwidmVyaWZpZWRCYW5rQWNjb3VudCI6ZmFsc2UsInBsYXlFdmVudExvYmJ5IjpmYWxzZSwiY3VzdG9tZXJJZCI6MzEyNzY1NzYyLCJhZmZJZCI6IkdFTVdJTiIsImJhbm5lZCI6ZmFsc2UsImJyYW5kIjoiZ2VtIiwidGltZXN0YW1wIjoxNzU1MzIwNDk2NDI4LCJsb2NrR2FtZXMiOltdLCJhbW91bnQiOjAsImxvY2tDaGF0IjpmYWxzZSwicGhvbmVWZXJpZmllZCI6ZmFsc2UsImlwQWRkcmVzcyI6IjI0MDI6ODAwOjYyY2Q6OWEwZjpmNTBmOjM2MmE6YTExZDo2YjUzIiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8wMS5wbmciLCJwbGF0Zm9ybUlkIjo1LCJ1c2VySWQiOiIzZTdkMDgxOC05NzYxLTQxNzItYWI5My1mZTBhNzcxZTk4NjkiLCJyZWdUaW1lIjoxNzU1MzIwNDU2ODcxLCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IkdNX2doZXR2aWNvZGUifQ.NR03-CLneSKl0UmjHdsrZe-zvC85jTC3F3c0NaTunns\",\"locale\":\"vi\",\"userId\":\"3e7d0818-9761-4172-ab93-fe0a771e9869\",\"username\":\"GM_ghetvicode\",\"timestamp\":1755320496428,\"refreshToken\":\"17789097ff0c49e9921a585fc0fcc806.0a371f891970418b92433a7aaf3c92c7\"}", "signature": "0BCD65A09039833123A330BE8B6C7693681C4DD91683F3DE096FC6FE70EE19A3475F17CF5EC33DCC02D06FCC07F1DDE535E0B54C14DC52E8BE735DD6BEEC13D20DE7579443FD1CF5D9116B686E8167822BE73CDFE8F761D89FD00F849C5227CF83A12E24641FDF5E0646CB9C6661F265A65B86667AB1A29781BC249565C36469" }],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

// ===================================
// === WebSocket Client ===
// ===================================
let ws = null;
let pingInterval = null;

function connectWebSocket() {
    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket đã kết nối.');
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

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;

            const { cmd, sid, d1, d2, d3 } = data[1];

            if (cmd === 1008 && sid) {
                currentSessionId = sid;
            }

            if (cmd === 1003 && d1 && d2 && d3) {
                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";

                if (lastPrediction !== "?") {
                    if (lastPrediction === result) {
                        tong_dung++;
                    } else {
                        tong_sai++;
                    }
                }

                const totalGames = tong_dung + tong_sai;
                const winRate = totalGames === 0 ? "0%" : `${((tong_dung / totalGames) * 100).toFixed(0)}%`;

                const historyEntry = { session: currentSessionId, d1, d2, d3, totalScore: total, result };
                fullHistory.push(historyEntry);
                if (fullHistory.length > MAX_HISTORY_SIZE) {
                    fullHistory.shift();
                }

                // Gọi hàm dự đoán từ thuatoan.js
                const { prediction } = getPrediction(fullHistory);

                // Cập nhật dữ liệu để trả về qua API
                apiResponseData.phien = currentSessionId;
                apiResponseData.xucxac = [d1, d2, d3];
                apiResponseData.tong = total;
                apiResponseData.ketqua = result;
                apiResponseData.prediction = prediction;
                apiResponseData.tyledung = winRate;

                // Lưu lại dự đoán cho phiên tiếp theo
                lastPrediction = prediction;
                currentSessionId = null;

                console.log(`Phiên #${apiResponseData.phien}: ${apiResponseData.tong} (${result}) | Dự đoán mới: ${prediction} | Tỷ lệ đúng: ${winRate}`);
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', () => {
        console.log(`[🔌] WebSocket đã đóng. Đang kết nối lại sau ${RECONNECT_DELAY / 1000} giây...`);
        clearInterval(pingInterval);
        setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => {
        console.error('[❌] Lỗi WebSocket:', err.message);
        ws.close();
    });
}

// ===================================
// === API Endpoints ===
// ===================================
app.get('/truongdong', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(apiResponseData, null, 4));
});

app.get('/history', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let html = `<style>body{font-family:monospace;background-color:#121212;color:#e0e0e0;}.entry{border-bottom:1px solid #444;padding:5px;}.tai{color:#28a745;}.xiu{color:#dc3545;}</style><h2>Lịch sử ${fullHistory.length} phiên gần nhất</h2>`;
    if (fullHistory.length === 0) {
        html += '<p>Chưa có dữ liệu lịch sử.</p>';
    } else {
        [...fullHistory].reverse().forEach(h => {
            const resultClass = h.result === 'Tài' ? 'tai' : 'xiu';
            html += `<div class="entry">- Phiên: ${h.session}<br/>- Kết quả: <b class="${resultClass}">${h.result}</b><br/>- Xúc xắc: [${h.d1}]-[${h.d2}]-[${h.d3}]<br/>- Tổng: ${h.totalScore}</div>`;
        });
    }
    res.send(html);
});

app.get('/', (req, res) => {
    res.send(`<h2>🎯 API Phân Tích Tài Xỉu</h2><p>Xem kết quả JSON: <a href="/truongdong">/truongdong</a></p><p>Xem lịch sử 1000 phiên gần nhất: <a href="/history">/history</a></p>`);
});

// ===================================
// === Khởi động Server ===
// ===================================
app.listen(PORT, () => {
    console.log(`[🌐] Server đang chạy tại http://localhost:${PORT}`);
    connectWebSocket();
});
