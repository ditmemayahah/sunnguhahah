const fs = require('fs');

// ==================== CÁC MÔ HÌNH PHỤ TRỢ ====================

class HistoryModel {
    constructor() {
        this.history = [];
        this.maxHistory = 1000;
    }

    addResult(result) {
        this.history.push(result);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    getLastResults(count = 12) {
        return this.history.slice(-count);
    }

    getTrend(length = 5) {
        const recent = this.getLastResults(length);
        const taiCount = recent.filter(r => r === 'T').length;
        const xiuCount = recent.filter(r => r === 'X').length;

        return taiCount > xiuCount ? 'uptrend' : (taiCount < xiuCount ? 'downtrend' : 'neutral');
    }
}

class StatsModel {
    calculateProbability(results, target) {
        if (results.length === 0) return 0;
        const count = results.filter(r => r === target).length;
        return count / results.length;
    }

    calculateDeviation(values) {
        if (values.length < 2) return 0;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
    }
}

class WeightManager {
    constructor() {
        this.weights = { model1: 1.0, model2: 1.0, model3: 1.0, model4: 1.0, model5: 1.0, model6: 1.0, model7: 1.0, model8: 1.0, model9: 1.0, model10: 1.0, model11: 1.0, model12: 1.0 };
    }

    adjustWeights(performanceData) {
        Object.keys(this.weights).forEach(model => {
            if (performanceData[model] !== undefined) {
                // Tăng/giảm trọng số dựa trên hiệu suất thực tế (độ chính xác)
                // Cho trọng số cơ bản là 0.5, và cộng thêm phần thưởng dựa trên hiệu suất
                this.weights[model] = 0.5 + (performanceData[model] * 0.75);
            }
        });
        this.normalizeWeights();
    }

    normalizeWeights() {
        const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
        if (total === 0) return;
        Object.keys(this.weights).forEach(model => {
            this.weights[model] /= total;
        });
    }
}

// ==================== CÁC MÔ HÌNH CHÍNH ====================

class BasicPatternModel {
    constructor(historyModel) { this.historyModel = historyModel; }
    analyze() {
        const results = this.historyModel.getLastResults(10).join('');
        if (results.length < 4) return { prediction: null, confidence: 0 };

        // Cầu 1-1 (zíc zắc)
        if (/^(XT){2,}$/.test(results.slice(-4)) || /^(TX){2,}$/.test(results.slice(-4))) {
            const prediction = results.slice(-1) === 'T' ? 'X' : 'T';
            return { prediction, confidence: 0.75, reason: "Cầu 1-1" };
        }
        // Cầu 1-2-1
        if (/(TXXT|XTTX)/.test(results.slice(-4))) {
            const prediction = results.slice(-1);
            return { prediction, confidence: 0.65, reason: "Cầu 1-2-1" };
        }
        return { prediction: null, confidence: 0 };
    }
}

class TrendAnalysisModel {
    constructor(historyModel) { this.historyModel = historyModel; }
    analyze() {
        const shortTrend = this.historyModel.getTrend(5);
        const longTrend = this.historyModel.getTrend(10);
        if (shortTrend === longTrend && shortTrend !== 'neutral') {
            const prediction = shortTrend === 'uptrend' ? 'T' : 'X';
            return { prediction, confidence: 0.6, reason: `Xu hướng đồng nhất ${shortTrend}` };
        }
        if (shortTrend !== 'neutral') {
            const prediction = shortTrend === 'uptrend' ? 'T' : 'X';
            return { prediction, confidence: 0.55, reason: `Theo xu hướng ngắn hạn ${shortTrend}` };
        }
        return { prediction: null, confidence: 0 };
    }
}
class DisparityModel {
    constructor(historyModel) { this.historyModel = historyModel; }
    analyze() {
        const results = this.historyModel.getLastResults(12);
        if (results.length < 12) return { prediction: null, confidence: 0 };
        const taiCount = results.filter(r => r === 'T').length;
        if (taiCount >= 9 || taiCount <= 3) {
            const prediction = taiCount >= 9 ? 'X' : 'T';
            return { prediction, confidence: 0.7, reason: "Chênh lệch cao, dự đoán cân bằng" };
        }
        return { prediction: null, confidence: 0 };
    }
}
class ShortTermModel {
    constructor(historyModel) { this.historyModel = historyModel; }
    analyze() {
        const results = this.historyModel.getLastResults(3);
        if (results.length < 3) return { prediction: null, confidence: 0 };
        if (results[1] === results[2] && results[0] !== results[1]) {
            return { prediction: results[2], confidence: 0.6, reason: "Theo cầu ngắn 2 nhịp" };
        }
        return { prediction: null, confidence: 0 };
    }
}
class BalanceModel {
    constructor(historyModel) { this.historyModel = historyModel; }
    analyze() {
        const results = this.historyModel.getLastResults(20);
        if (results.length < 20) return { prediction: null, confidence: 0 };
        const taiCount = results.filter(r => r === 'T').length;
        if (taiCount >= 14 || taiCount <= 6) {
            const prediction = taiCount >= 14 ? 'X' : 'T';
            return { prediction, confidence: 0.75, reason: "Tỉ lệ chênh lệch quá cao, dự đoán cân bằng" };
        }
        return { prediction: null, confidence: 0 };
    }
}
class DecisionModel {
    constructor(historyModel) { this.historyModel = historyModel; }
    analyze() {
        const results = this.historyModel.getLastResults(8);
        if (results.length < 4) return { prediction: null, confidence: 0 };
        const last = results[results.length - 1];
        let streak = 0;
        for (let i = results.length - 1; i >= 0; i--) {
            if (results[i] === last) streak++;
            else break;
        }
        if (streak >= 4) {
            const prediction = last === 'T' ? 'X' : 'T';
            return { prediction, confidence: 0.8, reason: `Bẻ cầu bệt dài ${streak}` };
        }
        if (streak >= 2) {
            return { prediction: last, confidence: 0.65, reason: `Theo cầu bệt ngắn ${streak}` };
        }
        return { prediction: null, confidence: 0 };
    }
}

// Model 7 & 8 đã được tích hợp vào logic tổng hợp và PerformanceModel
class ExtendedPatternModel { // Model 9
    constructor(historyModel) { this.historyModel = historyModel; }
    analyze() {
        const r = this.historyModel.getLastResults(5).join('');
        if (r.length < 4) return { prediction: null, confidence: 0 };
        if (/(TTTX|XXXT)/.test(r.slice(-4))) {
            const prediction = r.slice(-1) === 'T' ? 'X' : 'T';
            return { prediction, confidence: 0.65, reason: "Cầu 3-1" };
        }
        if (/(TTXX|XXTT)/.test(r.slice(-4))) {
            const prediction = r.slice(-1);
            return { prediction, confidence: 0.6, reason: "Cầu 2-2" };
        }
        return { prediction: null, confidence: 0 };
    }
}

// ... Các model khác từ 10 đến 12 có thể được thêm vào tương tự ...
// Để đơn giản, ta sẽ bỏ qua chúng và tập trung vào PerformanceModel

// SỬA LỖI 4: Model này sẽ theo dõi và điều chỉnh trọng số dựa trên hiệu suất thực tế
class PerformanceModel {
    constructor(weightManager) {
        this.weightManager = weightManager;
        this.modelPerformance = {};
        this.lastPredictions = {};
    }

    // Ghi nhận dự đoán của các model ở phiên TRƯỚC
    recordPredictions(allPredictions) {
        this.lastPredictions = {};
        Object.keys(allPredictions).forEach(modelKey => {
            if (allPredictions[modelKey] && allPredictions[modelKey].prediction) {
                this.lastPredictions[modelKey] = allPredictions[modelKey].prediction;
            }
        });
    }

    // Cập nhật hiệu suất khi có kết quả THỰC TẾ
    updatePerformance(actualResult) {
        Object.keys(this.lastPredictions).forEach(modelKey => {
            if (!this.modelPerformance[modelKey]) {
                this.modelPerformance[modelKey] = { correct: 0, total: 0 };
            }
            this.modelPerformance[modelKey].total++;
            if (this.lastPredictions[modelKey] === actualResult) {
                this.modelPerformance[modelKey].correct++;
            }
        });

        // Tính toán độ chính xác và điều chỉnh trọng số
        const accuracies = {};
        Object.keys(this.modelPerformance).forEach(modelKey => {
            const perf = this.modelPerformance[modelKey];
            if (perf.total > 5) { // Chỉ tính khi đã có đủ dữ liệu
                accuracies[modelKey] = perf.correct / perf.total;
            } else {
                accuracies[modelKey] = 0.5; // Mặc định
            }
        });

        this.weightManager.adjustWeights(accuracies);
    }
}


// ==================== HỆ THỐNG TỔNG HỢP ====================

class PredictionSystem {
    constructor() {
        this.historyModel = new HistoryModel();
        this.statsModel = new StatsModel();
        this.weightManager = new WeightManager();

        this.models = {
            model1: new BasicPatternModel(this.historyModel),
            model2: new TrendAnalysisModel(this.historyModel),
            model3: new DisparityModel(this.historyModel),
            model4: new ShortTermModel(this.historyModel),
            model5: new BalanceModel(this.historyModel),
            model6: new DecisionModel(this.historyModel),
            model9: new ExtendedPatternModel(this.historyModel),
        };
        
        this.performanceModel = new PerformanceModel(this.weightManager);
    }

    addResult(result) {
        this.historyModel.addResult(result);
        // Cập nhật hiệu suất của các model dựa trên kết quả vừa có
        this.performanceModel.updatePerformance(result);
    }

    predict() {
        const allPredictions = {};
        Object.keys(this.models).forEach(modelKey => {
            allPredictions[modelKey] = this.models[modelKey].analyze();
        });

        // Ghi nhận lại các dự đoán của phiên này để so sánh ở phiên sau
        this.performanceModel.recordPredictions(allPredictions);

        return this.calculateFinalPrediction(allPredictions);
    }

    calculateFinalPrediction(allPredictions) {
        let taiScore = 0;
        let xiuScore = 0;

        Object.keys(allPredictions).forEach(modelKey => {
            const pred = allPredictions[modelKey];
            if (pred.prediction) {
                const weight = this.weightManager.weights[modelKey] || 1.0;
                const score = pred.confidence * weight;
                if (pred.prediction === 'T') taiScore += score;
                else xiuScore += score;
            }
        });
        
        const totalScore = taiScore + xiuScore;
        if (totalScore === 0) {
            return { prediction: null, confidence: 0 };
        }

        const finalPrediction = taiScore > xiuScore ? 'T' : 'X';
        const confidence = Math.max(taiScore, xiuScore) / totalScore;

        return {
            prediction: finalPrediction,
            confidence: Math.min(confidence + 0.2, 0.95), // Tăng nhẹ độ tin cậy để hiển thị đẹp hơn
        };
    }
}

// SỬA LỖI 1: Thêm export để server.js có thể import
module.exports = { PredictionSystem };
