// server.js
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

// ##################################################################
// ############## START: INTEGRATED ALGORITHM CODE ##################
// ##################################################################

// NOTE: Most of the classes below are complex scaffolds. 
// Many core methods return placeholder values (e.g., empty arrays, 0, or fixed strings).
// For the algorithm to be effective, these placeholder implementations need to be replaced with real logic.

class RobustCauAnalysisSystem {
    constructor() {
        this.dataManager = new DataManager();
        this.coreAnalyzer = new CoreAnalyzer();
        this.statisticalEngine = new StatisticalEngine();
        this.mlAdapter = new MLAdapter();
        this.strategyManager = new StrategyManager();
        this.trendForecaster = new TrendForecaster();
        this.riskManager = new RiskManager();
        this.evaluationSystem = new EvaluationSystem();
        this.robustnessModule = new RobustnessModule();
        this.optimizationEngine = new OptimizationEngine();
        
        this.mainAI = new MainAI();
        this.miniAI = new MiniAI();
        this.advancedAI = new AdvancedAI();
        
        this.history = [];
        this.performanceStats = {
            accuracy: 0,
            totalPredictions: 0,
            correctPredictions: 0,
            streakStats: {
                currentWinStreak: 0,
                currentLossStreak: 0,
                maxWinStreak: 0,
                maxLossStreak: 0
            }
        };
    }

    analyze(newData) {
        const processedData = this.dataManager.processIncomingData(newData);
        const miniAnalysis = this.miniAI.quickAnalyze(processedData);
        const mainAnalysis = this.mainAI.comprehensiveAnalysis(processedData, this.history);
        const advancedAnalysis = this.advancedAI.deepAnalysis(processedData, this.history);
        const consolidatedResult = this.consolidateAnalyses(
            miniAnalysis, 
            mainAnalysis, 
            advancedAnalysis
        );
        const finalDecision = this.makeFinalDecision(consolidatedResult);
        this.updateLearningCycle(finalDecision, newData);
        
        return {
            decision: finalDecision,
            confidence: consolidatedResult.confidence,
            explanation: this.generateExplanation(finalDecision, consolidatedResult),
            timestamp: Date.now(),
            analysisId: this.generateAnalysisId()
        };
    }

    consolidateAnalyses(mini, main, advanced) {
        const weights = this.calculateDynamicWeights();
        return {
            prediction: this.weightedAveragePrediction(mini, main, advanced, weights),
            confidence: this.calculateCombinedConfidence(mini, main, advanced, weights),
            patterns: this.mergePatterns(mini.patterns, main.patterns, advanced.patterns),
            riskAssessment: this.mergeRisks(mini.risk, main.risk, advanced.risk),
            trends: this.mergeTrends(mini.trends, main.trends, advanced.trends)
        };
    }
    
    // This is a placeholder as the underlying methods return placeholders.
    weightedAveragePrediction(mini, main, advanced, weights) {
         // Since 'main' contains the most detailed (though placeholder) logic, we'll default to its prediction.
         return main.consolidated.prediction;
    }
    
    calculateCombinedConfidence(mini, main, advanced, weights) {
         // This is a placeholder implementation.
         const conf = (main.consolidated.confidence * weights.main) + 
                      (mini.confidence * weights.mini) + 
                      (advanced.combined.confidence * weights.advanced);
         return isNaN(conf) ? 0.5 : conf; // Return a default if calculation fails
    }
    
    mergePatterns(p1 = [], p2 = [], p3 = []) { return [...new Set([...p1, ...p2, ...p3])]; }
    mergeRisks(r1 = {}, r2 = {}, r3 = {}) { return {...r1, ...r2, ...r3 }; }
    mergeTrends(t1 = {}, t2 = {}, t3 = {}) { return {...t1, ...t2, ...t3 }; }


    calculateDynamicWeights() {
        const perfMain = this.mainAI.getHistoricalPerformance();
        const perfMini = this.miniAI.getHistoricalPerformance();
        const perfAdvanced = this.advancedAI.getHistoricalPerformance();
        const total = perfMain + perfMini + perfAdvanced;
        if (total === 0) return { main: 0.4, mini: 0.2, advanced: 0.4 }; // Default weights
        return {
            main: perfMain / total,
            mini: perfMini / total,
            advanced: perfAdvanced / total
        };
    }

    makeFinalDecision(consolidatedResult) {
        const riskAdjusted = this.riskManager.adjustForRisk(consolidatedResult);
        const strategy = this.strategyManager.selectOptimalStrategy(riskAdjusted);
        return strategy.execute(riskAdjusted);
    }

    updateLearningCycle(decision, newData) {
        const accuracy = this.evaluateAccuracy(decision, newData);
        this.updatePerformanceStats(accuracy);
        this.mlAdapter.trainWithNewData(newData, accuracy);
        this.adjustParameters(accuracy);
        this.history.push({
            data: newData,
            decision: decision,
            accuracy: accuracy,
            timestamp: Date.now()
        });
    }

    evaluateAccuracy(decision, newData) {
        return 0.8; // Placeholder
    }

    updatePerformanceStats(accuracy) {
        this.performanceStats.totalPredictions++;
        if (accuracy > 0.7) {
            this.performanceStats.correctPredictions++;
            this.performanceStats.streakStats.currentWinStreak++;
            this.performanceStats.streakStats.currentLossStreak = 0;
            if (this.performanceStats.streakStats.currentWinStreak > this.performanceStats.streakStats.maxWinStreak) {
                this.performanceStats.streakStats.maxWinStreak = this.performanceStats.streakStats.currentWinStreak;
            }
        } else {
            this.performanceStats.streakStats.currentLossStreak++;
            this.performanceStats.streakStats.currentWinStreak = 0;
            if (this.performanceStats.streakStats.currentLossStreak > this.performanceStats.streakStats.maxLossStreak) {
                this.performanceStats.streakStats.maxLossStreak = this.performanceStats.streakStats.currentLossStreak;
            }
        }
        this.performanceStats.accuracy = this.performanceStats.correctPredictions / this.performanceStats.totalPredictions;
    }

    adjustParameters(accuracy) {
        const adjustmentFactor = accuracy - 0.5;
        this.riskManager.adjustThresholds(adjustmentFactor);
        this.robustnessModule.adjustSensitivity(adjustmentFactor);
    }

    generateExplanation(decision, analysis) {
        return {
            decisionReason: "Placeholder reason based on analysis.",
            patternDescription: "No patterns detected (placeholder).",
            riskFactors: "Standard risk factors apply (placeholder).",
            confidenceFactors: "Confidence based on historical performance (placeholder)."
        };
    }

    generateAnalysisId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

class DataManager {
    processIncomingData(newData) {
        return this.cleanData(newData);
    }
    cleanData(data) {
        return data.filter(value => value !== null && value !== undefined && typeof value === 'number' && isFinite(value));
    }
}

class CoreAnalyzer {
    constructor() {
        this.patternDetector = new PatternDetector();
        this.trendAnalyzer = new TrendAnalyzer();
        this.volatilityCalculator = new VolatilityCalculator();
    }
    analyze(data) {
        const patterns = this.patternDetector.detect(data);
        const trends = this.trendAnalyzer.analyze(data);
        const volatility = this.volatilityCalculator.calculate(data);
        // Placeholder prediction logic
        const lastValue = data[data.length - 1] || 11; // Default to 11
        const prediction = lastValue > 10.5 ? 12 : 9; // Simple mean-reversion placeholder
        
        return {
            patterns,
            trends,
            volatility,
            prediction,
            confidence: 0.6 // Placeholder confidence
        };
    }
}

class StatisticalEngine {
    calculateStatistics(data) {
        if (!data || data.length === 0) return {};
         const lastValue = data[data.length - 1] || 11;
        // Placeholder prediction logic
        const prediction = lastValue > 10.5 ? 12 : 9;
        return {
            mean: data.reduce((a, b) => a + b, 0) / data.length,
            prediction,
            confidence: 0.65 // Placeholder confidence
        };
    }
}

class MLAdapter {
    trainWithNewData(data, accuracy) { /* Placeholder */ }
    predict(data) {
         if (!data || data.length === 0) return { prediction: 11, confidence: 0.1 };
         const lastValue = data[data.length - 1] || 11;
         // Placeholder prediction logic
        return {
            prediction: lastValue, // Simple persistence model placeholder
            confidence: 0.5 // Placeholder confidence
        };
    }
}

class StrategyManager {
    constructor() {
        // Only implementing one strategy for this placeholder version
        this.strategy = new TrendFollowingStrategy();
    }
    selectOptimalStrategy(analysis) {
        // Always select the default strategy in this simplified version
        return this.strategy;
    }
}

class TrendForecaster { /* Placeholder */ }

class RiskManager {
    adjustForRisk(analysis) {
        // Pass-through in this simplified version
        return analysis;
    }
    adjustThresholds(performanceFactor) { /* Placeholder */ }
}

class EvaluationSystem { /* Placeholder */ }

class RobustnessModule {
    adjustSensitivity(adjustmentFactor) { /* Placeholder */ }
}

class OptimizationEngine { /* Placeholder */ }

class MainAI {
    constructor() {
        this.core = new CoreAnalyzer();
        this.statistical = new StatisticalEngine();
        this.ml = new MLAdapter();
    }
    comprehensiveAnalysis(data, history) {
        const coreAnalysis = this.core.analyze(data);
        const statisticalAnalysis = this.statistical.calculateStatistics(data);
        const mlPrediction = this.ml.predict(data);
        return {
            consolidated: this.consolidateAnalyses(coreAnalysis, statisticalAnalysis, mlPrediction)
        };
    }
    consolidateAnalyses(core, statistical, ml) {
        // Weighted average of predictions (placeholders)
        const prediction = (core.prediction * 0.4) + (statistical.prediction * 0.3) + (ml.prediction * 0.3);
        const confidence = (core.confidence * 0.4) + (statistical.confidence * 0.3) + (ml.confidence * 0.3);
        return { prediction, confidence, risk: {}, trends: {}, patterns: [] };
    }
    getHistoricalPerformance() { return 0.7; } // Placeholder
}

class MiniAI {
    quickAnalyze(data) {
        if (data.length < 2) return { prediction: 11, confidence: 0.1, risk: {}, trends: {}, patterns: [] };
        const last = data[data.length - 1];
        const prev = data[data.length - 2];
        return {
            prediction: last + (last - prev), // Simple linear extrapolation
            confidence: 0.4, // Lower confidence for quick analysis
            risk: {}, trends: {}, patterns: []
        };
    }
    getHistoricalPerformance() { return 0.6; } // Placeholder
}

class AdvancedAI {
    deepAnalysis(data, history) {
        // Simplified deep analysis returning an average
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        return {
            combined: {
                prediction: avg,
                confidence: 0.75, // Higher confidence for advanced analysis
                risk: {}, trends: {}, patterns: []
            }
        };
    }
    getHistoricalPerformance() { return 0.8; } // Placeholder
}

// Helper classes with placeholder implementations
class PatternDetector { detect(data) { return []; } }
class TrendAnalyzer { analyze(data) { return {}; } }
class VolatilityCalculator { calculate(data) { return 0; } }

// Placeholder Strategy
class TrendFollowingStrategy {
    execute(analysis) {
        // The core logic that returns a decision.
        // 'buy' and 'sell' are generic terms we will map to "Tài" and "Xỉu".
        // In this placeholder, it bases the decision on the predicted score.
        return analysis.prediction > 10.5 ? 'buy' : 'sell';
    }
}


// ###############################################################
// ############## ADAPTER FOR THE SERVER LOGIC ###################
// ###############################################################

class MasterPredictor {
    constructor() {
        this.scoreHistory = [];
        this.analysisSystem = new RobustCauAnalysisSystem();
    }

    /**
     * Updates the predictor with the latest game result.
     * @param {{score: number, result: string}} newEntry - The score and result of the last game.
     */
    updateData({ score, result }) {
        this.scoreHistory.push(score);
        
        // To prevent memory leaks, keep the history to a reasonable size.
        if (this.scoreHistory.length > 500) {
            this.scoreHistory.shift();
        }
    }

    /**
     * Generates a new prediction based on the entire history.
     * @returns {{prediction: string, confidence: number}}
     */
    predict() {
        if (this.scoreHistory.length < 3) {
            return { prediction: "?", confidence: 0 };
        }

        try {
            const analysisResult = this.analysisSystem.analyze(this.scoreHistory);
            
            let finalPrediction = "?";
            
            if (analysisResult.decision === 'buy') {
                finalPrediction = "Tài"; 
            } else if (analysisResult.decision === 'sell') {
                finalPrediction = "Xỉu"; 
            }
            
            return {
                prediction: finalPrediction,
                confidence: analysisResult.confidence || 0
            };
        } catch (error) {
            console.error("[❌] Error during prediction:", error);
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
    [1,"MiniGame","GM_dcmshiffsdf","12123p",{"info":"{\"ipAddress\":\"2405:4802:18ce:a780:8c30:666c:5bfd:36b1\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJkY3VtYXJlZmUiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTMzNTE3NTEsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTU2ODE2NDk0NzMsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZXZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwNTo0ODAyOjE4Y2U6YTc4MDo4YzMwOjY2NmM6NWJmZDozNmIxIiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8wMS5wbmciLCJwbGF0Zm9ybUlkIjo0LCJ1c2VySWQiOiI1OWYzZDA1Yy1jNGZjLTQxOTEtODI1OS04OGU2OGUyYThmMGYiLCJyZWdUaW1lIjoxNzU1Njc0NzAzODA4LCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IkdNX2RjbXNoaWZmc2RmIn0.vDdq-SLgdXjRwijNY5PEMUEETEP4dQRklZnWcTtJML8\",\"locale\":\"vi\",\"userId\":\"59f3d05c-c4fc-4191-8259-88e68e2a8f0f\",\"username\":\"GM_dcmshiffsdf\",\"timestamp\":1755681649473,\"refreshToken\":\"5448e4e7f31241a6bda367b3ac520167.dce5a5690af745c9b01a73d531a1901b\"}","signature":"05F08CF241C76DA35BB0C4F951181A807E2423EDB9FF99F9A24ABF6929E668889BB84BC1EE0DFE61F0114CE262D61DEBFFFA8E9DF09CA1E1985B326CAE963138027D37B13D7671545DCDD357079FFC7B18E2E33FC85D68E43571BC8D2CC28BC502D0D8FEE4544D680817F607309C415A6C496C287E44C98E91D04577DCA9CCFB"}],
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
                predictor.updateData({ score: total, result: result });
                
                // 2. Get the next prediction from the algorithm
                const predictionResult = predictor.predict();
                
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
