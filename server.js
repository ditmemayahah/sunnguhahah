// server.js
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

// ##################################################################
// ############## START: THUẬT TOÁN MỚI CỦA BẠN #####################
// ##################################################################

let modelPredictions = {};

// Helper function: Detect streak and break probability
function detectStreakAndBreak(history) {
  if (!history || history.length === 0) return { streak: 0, currentResult: null, breakProb: 0.0 };
  let streak = 1;
  const currentResult = history[history.length - 1].result;
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i].result === currentResult) {
      streak++;
    } else {
      break;
    }
  }
  const last15 = history.slice(-15).map(h => h.result);
  if (!last15.length) return { streak, currentResult, breakProb: 0.0 };
  const switches = last15.slice(1).reduce((count, curr, idx) => count + (curr !== last15[idx] ? 1 : 0), 0);
  const taiCount = last15.filter(r => r === 'Tài').length;
  const xiuCount = last15.filter(r => r === 'Xỉu').length;
  const imbalance = Math.abs(taiCount - xiuCount) / last15.length;
  let breakProb = 0.0;

  if (streak >= 8) {
    breakProb = Math.min(0.6 + (switches / 15) + imbalance * 0.15, 0.9); // Giảm breakProb
  } else if (streak >= 5) {
    breakProb = Math.min(0.35 + (switches / 10) + imbalance * 0.25, 0.85); // Giảm breakProb
  } else if (streak >= 3 && switches >= 7) { // Tăng ngưỡng switches
    breakProb = 0.3;
  }

  return { streak, currentResult, breakProb };
}

// Helper function: Evaluate model performance
function evaluateModelPerformance(history, modelName, lookback = 10) {
  if (!modelPredictions[modelName] || history.length < 2) return 1.0;
  lookback = Math.min(lookback, history.length - 1);
  let correctCount = 0;
  for (let i = 0; i < lookback; i++) {
    const pred = modelPredictions[modelName][history[history.length - (i + 2)].session] || 0;
    const actual = history[history.length - (i + 1)].result;
    if ((pred === 1 && actual === 'Tài') || (pred === 2 && actual === 'Xỉu')) {
      correctCount++;
    }
  }
  const performanceScore = lookback > 0 ? 1.0 + (correctCount - lookback / 2) / (lookback / 2) : 1.0;
  return Math.max(0.5, Math.min(1.5, performanceScore)); // Giới hạn score để tránh lệch
}

// Helper function: Smart bridge break model
function smartBridgeBreak(history) {
  if (!history || history.length < 3) return { prediction: 0, breakProb: 0.0, reason: 'Không đủ dữ liệu để bẻ cầu' };

  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  const last20 = history.slice(-20).map(h => h.result);
  const lastScores = history.slice(-20).map(h => h.totalScore || 0);
  let breakProbability = breakProb;
  let reason = '';

  // Analyze score trends
  const avgScore = lastScores.reduce((sum, score) => sum + score, 0) / (lastScores.length || 1);
  const scoreDeviation = lastScores.reduce((sum, score) => sum + Math.abs(score - avgScore), 0) / (lastScores.length || 1);

  // Detect specific bridge patterns
  const last5 = last20.slice(-5);
  const patternCounts = {};
  for (let i = 0; i <= last20.length - 3; i++) {
    const pattern = last20.slice(i, i + 3).join(',');
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  }
  const mostCommonPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
  const isStablePattern = mostCommonPattern && mostCommonPattern[1] >= 3;

  // Adjust break probability based on streak length and patterns
  if (streak >= 6) {
    breakProbability = Math.min(breakProbability + 0.15, 0.9); // Giảm ảnh hưởng
    reason = `[Bẻ Cầu] Chuỗi ${streak} ${currentResult} dài, khả năng bẻ cầu cao`;
  } else if (streak >= 4 && scoreDeviation > 3) {
    breakProbability = Math.min(breakProbability + 0.1, 0.85); // Giảm ảnh hưởng
    reason = `[Bẻ Cầu] Biến động điểm số lớn (${scoreDeviation.toFixed(1)}), khả năng bẻ cầu tăng`;
  } else if (isStablePattern && last5.every(r => r === currentResult)) {
    breakProbability = Math.min(breakProbability + 0.05, 0.8); // Giảm ảnh hưởng
    reason = `[Bẻ Cầu] Phát hiện mẫu lặp ${mostCommonPattern[0]}, có khả năng bẻ cầu`;
  } else {
    breakProbability = Math.max(breakProbability - 0.15, 0.15); // Giảm xác suất bẻ cầu
    reason = `[Bẻ Cầu] Không phát hiện mẫu bẻ cầu mạnh, tiếp tục theo cầu`;
  }

  // Decide prediction based on break probability
  let prediction = breakProbability > 0.65 ? (currentResult === 'Tài' ? 2 : 1) : (currentResult === 'Tài' ? 1 : 2); // Tăng ngưỡng breakProb
  return { prediction, breakProb: breakProbability, reason };
}

// Helper function: Trend and probability model
function trendAndProb(history) {
  if (!history || history.length < 3) return 0;
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 5) {
    if (breakProb > 0.75) { // Tăng ngưỡng breakProb
      return currentResult === 'Tài' ? 2 : 1; // 2: Xỉu, 1: Tài
    }
    return currentResult === 'Tài' ? 1 : 2;
  }
  const last15 = history.slice(-15).map(h => h.result);
  if (!last15.length) return 0;
  const weights = last15.map((_, i) => Math.pow(1.2, i)); // Giảm trọng số lịch sử gần
  const taiWeighted = weights.reduce((sum, w, i) => sum + (last15[i] === 'Tài' ? w : 0), 0);
  const xiuWeighted = weights.reduce((sum, w, i) => sum + (last15[i] === 'Xỉu' ? w : 0), 0);
  const totalWeight = taiWeighted + xiuWeighted;
  const last10 = last15.slice(-10);
  const patterns = [];
  if (last10.length >= 4) {
    for (let i = 0; i <= last10.length - 4; i++) {
      patterns.push(last10.slice(i, i + 4).join(','));
    }
  }
  const patternCounts = patterns.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
  const mostCommon = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
  if (mostCommon && mostCommon[1] >= 3) {
    const pattern = mostCommon[0].split(',');
    return pattern[pattern.length - 1] !== last10[last10.length - 1] ? 1 : 2;
  } else if (totalWeight > 0 && Math.abs(taiWeighted - xiuWeighted) / totalWeight >= 0.25) { // Tăng ngưỡng
    return taiWeighted > xiuWeighted ? 2 : 1; // Dự đoán ngược lại để cân bằng
  }
  return last15[last15.length - 1] === 'Xỉu' ? 1 : 2;
}

// Helper function: Short pattern model
function shortPattern(history) {
  if (!history || history.length < 3) return 0;
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 4) {
    if (breakProb > 0.75) { // Tăng ngưỡng
      return currentResult === 'Tài' ? 2 : 1;
    }
    return currentResult === 'Tài' ? 1 : 2;
  }
  const last8 = history.slice(-8).map(h => h.result);
  if (!last8.length) return 0;
  const patterns = [];
  if (last8.length >= 3) {
    for (let i = 0; i <= last8.length - 3; i++) {
      patterns.push(last8.slice(i, i + 3).join(','));
    }
  }
  const patternCounts = patterns.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
  const mostCommon = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
  if (mostCommon && mostCommon[1] >= 2) {
    const pattern = mostCommon[0].split(',');
    return pattern[pattern.length - 1] !== last8[last8.length - 1] ? 1 : 2;
  }
  return last8[last8.length - 1] === 'Xỉu' ? 1 : 2;
}

// Helper function: Mean deviation model
function meanDeviation(history) {
  if (!history || history.length < 3) return 0;
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 4) {
    if (breakProb > 0.75) { // Tăng ngưỡng
      return currentResult === 'Tài' ? 2 : 1;
    }
    return currentResult === 'Tài' ? 1 : 2;
  }
  const last12 = history.slice(-12).map(h => h.result);
  if (!last12.length) return 0;
  const taiCount = last12.filter(r => r === 'Tài').length;
  const xiuCount = last12.length - taiCount;
  const deviation = Math.abs(taiCount - xiuCount) / last12.length;
  if (deviation < 0.35) { // Tăng ngưỡng
    return last12[last12.length - 1] === 'Xỉu' ? 1 : 2;
  }
  return xiuCount > taiCount ? 1 : 2;
}

// Helper function: Recent switch model
function recentSwitch(history) {
  if (!history || history.length < 3) return 0;
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 4) {
    if (breakProb > 0.75) { // Tăng ngưỡng
      return currentResult === 'Tài' ? 2 : 1;
    }
    return currentResult === 'Tài' ? 1 : 2;
  }
  const last10 = history.slice(-10).map(h => h.result);
  if (!last10.length) return 0;
  const switches = last10.slice(1).reduce((count, curr, idx) => count + (curr !== last10[idx] ? 1 : 0), 0);
  return switches >= 6 ? (last10[last10.length - 1] === 'Xỉu' ? 1 : 2) : (last10[last10.length - 1] === 'Xỉu' ? 1 : 2); // Tăng ngưỡng switches
}

// Helper function: Check bad pattern
function isBadPattern(history) {
  if (!history || history.length < 3) return false;
  const last15 = history.slice(-15).map(h => h.result);
  if (!last15.length) return false;
  const switches = last15.slice(1).reduce((count, curr, idx) => count + (curr !== last15[idx] ? 1 : 0), 0);
  const { streak } = detectStreakAndBreak(history);
  return switches >= 9 || streak >= 10; // Tăng ngưỡng
}

// AI HTDD Logic
function aiHtddLogic(history) {
  if (!history || history.length < 3) {
    const randomResult = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
    return { prediction: randomResult, reason: '[AI] Không đủ lịch sử, dự đoán ngẫu nhiên', source: 'AI HTDD' };
  }
  const recentHistory = history.slice(-5).map(h => h.result);
  const recentScores = history.slice(-5).map(h => h.totalScore || 0);
  const taiCount = recentHistory.filter(r => r === 'Tài').length;
  const xiuCount = recentHistory.filter(r => r === 'Xỉu').length;

  if (history.length >= 3) {
    const last3 = history.slice(-3).map(h => h.result);
    if (last3.join(',') === 'Tài,Xỉu,Tài') {
      return { prediction: 'Xỉu', reason: '[AI] Phát hiện mẫu 1T1X → tiếp theo nên đánh Xỉu', source: 'AI HTDD' };
    } else if (last3.join(',') === 'Xỉu,Tài,Xỉu') {
      return { prediction: 'Tài', reason: '[AI] Phát hiện mẫu 1X1T → tiếp theo nên đánh Tài', source: 'AI HTDD' };
    }
  }

  if (history.length >= 4) {
    const last4 = history.slice(-4).map(h => h.result);
    if (last4.join(',') === 'Tài,Tài,Xỉu,Xỉu') {
      return { prediction: 'Tài', reason: '[AI] Phát hiện mẫu 2T2X → tiếp theo nên đánh Tài', source: 'AI HTDD' };
    } else if (last4.join(',') === 'Xỉu,Xỉu,Tài,Tài') {
      return { prediction: 'Xỉu', reason: '[AI] Phát hiện mẫu 2X2T → tiếp theo nên đánh Xỉu', source: 'AI HTDD' };
    }
  }

  if (history.length >= 9 && history.slice(-6).every(h => h.result === 'Tài')) {
    return { prediction: 'Xỉu', reason: '[AI] Chuỗi Tài quá dài (6 lần) → dự đoán Xỉu', source: 'AI HTDD' }; // Giảm ngưỡng streak
  } else if (history.length >= 9 && history.slice(-6).every(h => h.result === 'Xỉu')) {
    return { prediction: 'Tài', reason: '[AI] Chuỗi Xỉu quá dài (6 lần) → dự đoán Tài', source: 'AI HTDD' }; // Giảm ngưỡng streak
  }

  const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / (recentScores.length || 1);
  if (avgScore > 10) {
    return { prediction: 'Tài', reason: `[AI] Điểm trung bình cao (${avgScore.toFixed(1)}) → dự đoán Tài`, source: 'AI HTDD' };
  } else if (avgScore < 8) {
    return { prediction: 'Xỉu', reason: `[AI] Điểm trung bình thấp (${avgScore.toFixed(1)}) → dự đoán Xỉu`, source: 'AI HTDD' };
  }

  // Sửa lỗi logic và cân bằng
  if (taiCount > xiuCount + 1) {
    return { prediction: 'Xỉu', reason: `[AI] Tài chiếm đa số (${taiCount}/${recentHistory.length}) → dự đoán Xỉu`, source: 'AI HTDD' };
  } else if (xiuCount > taiCount + 1) {
    return { prediction: 'Tài', reason: `[AI] Xỉu chiếm đa số (${xiuCount}/${recentHistory.length}) → dự đoán Tài`, source: 'AI HTDD' };
  } else {
    const overallTai = history.filter(h => h.result === 'Tài').length;
    const overallXiu = history.filter(h => h.result === 'Xỉu').length;
    if (overallTai > overallXiu + 2) { // Thêm ngưỡng để cân bằng
      return { prediction: 'Xỉu', reason: '[AI] Tổng thể Tài nhiều hơn → dự đoán Xỉu', source: 'AI HTDD' };
    } else if (overallXiu > overallTai + 2) {
      return { prediction: 'Tài', reason: '[AI] Tổng thể Xỉu nhiều hơn → dự đoán Tài', source: 'AI HTDD' };
    } else {
      return { prediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu', reason: '[AI] Cân bằng, dự đoán ngẫu nhiên', source: 'AI HTDD' };
    }
  }
}

// Main prediction function
function generatePrediction(history, modelPredictionsRef) {
  modelPredictions = modelPredictionsRef;
  if (!history || history.length < 3) {
      return {
          prediction: "?",
          confidence: 0,
          reason: "Chưa đủ dữ liệu (cần 3 phiên)."
      };
  }

  if (!modelPredictions['trend']) {
    modelPredictions['trend'] = {};
    modelPredictions['short'] = {};
    modelPredictions['mean'] = {};
    modelPredictions['switch'] = {};
    modelPredictions['bridge'] = {};
  }

  const currentIndex = history[history.length - 1].session;

  // Run models
  const trendPred = history.length < 5 ? (history[history.length - 1].result === 'Tài' ? 2 : 1) : trendAndProb(history);
  const shortPred = history.length < 5 ? (history[history.length - 1].result === 'Tài' ? 2 : 1) : shortPattern(history);
  const meanPred = history.length < 5 ? (history[history.length - 1].result === 'Tài' ? 2 : 1) : meanDeviation(history);
  const switchPred = history.length < 5 ? (history[history.length - 1].result === 'Tài' ? 2 : 1) : recentSwitch(history);
  const bridgePred = history.length < 5 ? { prediction: (history[history.length - 1].result === 'Tài' ? 2 : 1), breakProb: 0.0, reason: 'Lịch sử ngắn, dự đoán ngược lại' } : smartBridgeBreak(history);
  const aiPred = aiHtddLogic(history);

  // Store predictions
  modelPredictions['trend'][currentIndex] = trendPred;
  modelPredictions['short'][currentIndex] = shortPred;
  modelPredictions['mean'][currentIndex] = meanPred;
  modelPredictions['switch'][currentIndex] = switchPred;
  modelPredictions['bridge'][currentIndex] = bridgePred.prediction;

  // Evaluate model performance
  const modelScores = {
    trend: evaluateModelPerformance(history, 'trend'),
    short: evaluateModelPerformance(history, 'short'),
    mean: evaluateModelPerformance(history, 'mean'),
    switch: evaluateModelPerformance(history, 'switch'),
    bridge: evaluateModelPerformance(history, 'bridge')
  };

  // Điều chỉnh trọng số
  const weights = {
    trend: 0.2 * modelScores.trend, // Giảm từ 0.25
    short: 0.2 * modelScores.short,
    mean: 0.25 * modelScores.mean, // Tăng từ 0.2
    switch: 0.2 * modelScores.switch, // Tăng từ 0.15
    bridge: 0.15 * modelScores.bridge, // Giảm từ 0.2
    aihtdd: 0.2
  };

  let taiScore = 0;
  let xiuScore = 0;

  if (trendPred === 1) taiScore += weights.trend; else if (trendPred === 2) xiuScore += weights.trend;
  if (shortPred === 1) taiScore += weights.short; else if (shortPred === 2) xiuScore += weights.short;
  if (meanPred === 1) taiScore += weights.mean; else if (meanPred === 2) xiuScore += weights.mean;
  if (switchPred === 1) taiScore += weights.switch; else if (switchPred === 2) xiuScore += weights.switch;
  if (bridgePred.prediction === 1) taiScore += weights.bridge; else if (bridgePred.prediction === 2) xiuScore += weights.bridge;
  if (aiPred.prediction === 'Tài') taiScore += weights.aihtdd; else xiuScore += weights.aihtdd;

  // Điều chỉnh khi phát hiện mẫu xấu
  if (isBadPattern(history)) {
    taiScore *= 0.8; 
    xiuScore *= 0.8;
  }

  // Cân bằng nếu dự đoán nghiêng quá nhiều
  const last10Preds = history.slice(-10).map(h => h.result);
  const taiPredCount = last10Preds.filter(r => r === 'Tài').length;
  if (taiPredCount >= 7) {
    xiuScore += 0.15;
  } else if (taiPredCount <= 3) {
    taiScore += 0.15;
  }

  // Điều chỉnh dựa trên xác suất bẻ cầu
  if (bridgePred.breakProb > 0.65) {
    if (bridgePred.prediction === 1) taiScore += 0.2; else xiuScore += 0.2;
  }

  const totalScore = taiScore + xiuScore;
  const confidence = totalScore > 0 ? Math.max(taiScore, xiuScore) / totalScore : 0;
  const finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';

  return {
    prediction: finalPrediction,
    confidence: confidence,
    reason: `${aiPred.reason} | ${bridgePred.reason}`
  };
}

// ###############################################################
// ############## ADAPTER FOR THE SERVER LOGIC ###################
// ###############################################################

class Predictor {
    constructor() {
        // Trạng thái để theo dõi hiệu suất của các mô hình con
        // được quản lý bởi biến `modelPredictions` ở scope ngoài
    }

    /**
     * Generates a new prediction based on the entire history.
     * @param {Array} history - The full history of game results.
     * @returns {{prediction: string, confidence: number}}
     */
    predict(history) {
        try {
            // Chạy thuật toán chính với toàn bộ lịch sử
            const result = generatePrediction(history, modelPredictions);
            return result;
        } catch (error) {
            console.error("[❌] Error during prediction:", error);
            // Trả về giá trị mặc định an toàn nếu có lỗi
            return { prediction: "?", confidence: 0 };
        }
    }
}


// ################################################################
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

// Khởi tạo predictor mới với thuật toán của bạn
const predictor = new Predictor();

const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;

// Dữ liệu initialMessages đã được cập nhật
const initialMessages = [
    [1,"MiniGame","GM_dcmshiffsdf","12123p",{"info":"{\"ipAddress\":\"2405:4802:18ce:a780:8c30:666c:5bfd:36b1\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJkY3VtYXJlZmUiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTMzNTE3NTEsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTU2ODE2NDk0NzMsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwNTo0ODAyOjE4Y2U6YTc4MDo4YzMwOjY2NmM6NWJmZDozNmIxIiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8wMS5wbmciLCJwbGF0Zm9ybUlkIjo0LCJ1c2VySWQiOiI1OWYzZDA1Yy1jNGZjLTQxOTEtODI1OS04OGU2OGUyYThmMGYiLCJyZWdUaW1lIjoxNzU1Njc0NzAzODA4LCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IkdNX2RjbXNoaWZmc2RmIn0.vDdq-SLgdXjRwijNY5PEMUEETEP4dQRklZnWcTtJML8\",\"locale\":\"vi\",\"userId\":\"59f3d05c-c4fc-4191-8259-88e68e2a8f0f\",\"username\":\"GM_dcmshiffsdf\",\"timestamp\":1755681649473,\"refreshToken\":\"5448e4e7f31241a6bda367b3ac520167.dce5a5690af745c9b01a73d531a1901b\"}","signature":"05F08CF241C76DA35BB0C4F951181A807E2423EDB9FF99F9A24ABF6929E668889BB84BC1EE0DFE61F0114CE262D61DEBFFFA8E9DF09CA1E1985B326CAE963138027D37B13D7671545DCDD357079FFC7B18E2E33FC85D68E43571BC8D2CC28BC502D0D8FEE4544D680817F607309C415A6C496C287E44C98E91D04577DCA9CCFB"}],
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
                
                // Thuật toán mới không cần updateData, nó sẽ phân tích toàn bộ `fullHistory` mỗi lần.
                // Gọi hàm dự đoán với toàn bộ lịch sử.
                const predictionResult = predictor.predict(fullHistory);
                
                let finalPrediction = predictionResult.prediction;
                let predictionConfidence = `${(predictionResult.confidence * 100).toFixed(0)}%`;

                // Cập nhật đối tượng response chính
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

                // Lưu lại dự đoán mới để kiểm tra ở phiên sau
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
