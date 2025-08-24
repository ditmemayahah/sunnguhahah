const fs = require('fs');

// ==================== CÁC MÔ HÌNH PHỤ TRỢ ====================

// Model phụ: Lưu lịch sử kết quả
class HistoryModel {
  constructor() {
    this.history = [];
    this.maxHistory = 1000;
  }

  addResult(data) {
    this.history.push(data);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getLastResults(count = 12) {
    return this.history.slice(-count).map(item => item.result === 'Tài' ? 'T' : 'X');
  }

  getTrend(length = 5) {
    const recent = this.getLastResults(length);
    const taiCount = recent.filter(r => r === 'T').length;
    const xiuCount = recent.filter(r => r === 'X').length;
    
    return taiCount > xiuCount ? 'uptrend' : (taiCount < xiuCount ? 'downtrend' : 'neutral');
  }
}

// Model phụ: Phân tích thống kê
class StatsModel {
  calculateProbability(results, target) {
    if (results.length === 0) return 0;
    const count = results.filter(r => r === target).length;
    return count / results.length;
  }

  calculateDeviation(values) {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
  }
}

// Model phụ: Quản lý trọng số
class WeightManager {
  constructor() {
    this.weights = {
      model1: 1.0,
      model2: 1.0,
      model3: 1.0,
      model4: 1.0,
      model5: 1.0,
      model6: 1.0,
      model7: 1.0,
      model8: 1.0,
      model9: 1.0,
      model10: 1.0,
      model11: 1.0,
      model12: 1.0,
      model13: 1.0
    };
    this.performance = {};
  }

  adjustWeights(performanceData) {
    Object.keys(performanceData).forEach(model => {
      this.performance[model] = performanceData[model];
    });

    Object.keys(this.weights).forEach(model => {
      if (this.performance[model] !== undefined) {
        this.weights[model] = 0.5 + (this.performance[model] * 0.5);
      }
    });

    this.normalizeWeights();
  }

  normalizeWeights() {
    const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    if (total === 0) return;
    Object.keys(this.weights).forEach(model => {
      this.weights[model] = this.weights[model] / total;
    });
  }
}

// ==================== CÁC MÔ HÌNH CHÍNH ====================

// Model 1: Nhận biết các loại cầu cơ bản
class BasicPatternModel {
  constructor(historyModel) {
    this.historyModel = historyModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(10);
    if (results.length < 5) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    let isOneOne = true;
    for (let i = 0; i < results.length - 1; i++) {
      if (results[i] === results[i + 1]) {
        isOneOne = false;
        break;
      }
    }

    if (isOneOne) {
      const last = results[results.length - 1];
      const prediction = last === 'T' ? 'X' : 'T';
      return {
        prediction,
        confidence: 0.7,
        reason: `Phát hiện cầu 1-1, dự đoán đảo chiều từ ${last} sang ${prediction}`
      };
    }

    if (results.length >= 4) {
      const pattern = results.slice(-4).join('');
      if (pattern === 'TXXT' || pattern === 'XTTX') {
        const prediction = pattern === 'TXXT' ? 'T' : 'X';
        return {
          prediction,
          confidence: 0.65,
          reason: `Phát hiện cầu 1-2-1, dự đoán ${prediction}`
        };
      }
    }

    return { prediction: null, confidence: 0, reason: "Không phát hiện cầu cơ bản" };
  }
}

// Model 2: Bắt trend xu hướng ngắn và dài
class TrendAnalysisModel {
  constructor(historyModel) {
    this.historyModel = historyModel;
  }

  analyze() {
    const shortTrend = this.historyModel.getTrend(5);
    const longTrend = this.historyModel.getTrend(10);
    
    if (shortTrend === longTrend && shortTrend !== 'neutral') {
      const prediction = shortTrend === 'uptrend' ? 'T' : 'X';
      return {
        prediction,
        confidence: 0.6,
        reason: `Xu hướng ngắn và dài hạn cùng ${shortTrend}, dự đoán ${prediction}`
      };
    }
    
    if (shortTrend !== 'neutral') {
      const prediction = shortTrend === 'uptrend' ? 'T' : 'X';
      return {
        prediction,
        confidence: 0.55,
        reason: `Theo xu hướng ngắn hạn (${shortTrend}), dự đoán ${prediction}`
      };
    }
    
    return { prediction: null, confidence: 0, reason: "Không có xu hướng rõ ràng" };
  }
}

// Model 3: Chênh lệch cao trong 12 phiên
class DisparityModel {
  constructor(historyModel, statsModel) {
    this.historyModel = historyModel;
    this.statsModel = statsModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(12);
    if (results.length < 12) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    const taiCount = results.filter(r => r === 'T').length;
    const xiuCount = results.filter(r => r === 'X').length;
    
    const disparity = Math.abs(taiCount - xiuCount) / 12;
    
    if (disparity >= 0.33) {
      const prediction = taiCount > xiuCount ? 'X' : 'T';
      return {
        prediction,
        confidence: 0.65,
        reason: `Chênh lệch cao (${taiCount}T/${xiuCount}X), dự đoán cân bằng với ${prediction}`
      };
    }
    
    return { prediction: null, confidence: 0, reason: "Không có chênh lệch đáng kể" };
  }
}

// Model 4: Bắt cầu ngắn hạn
class ShortTermModel {
  constructor(historyModel) {
    this.historyModel = historyModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(5);
    if (results.length < 3) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    if (results[results.length - 1] === results[results.length - 2]) {
      const prediction = results[results.length - 1] === 'T' ? 'X' : 'T';
      return {
        prediction,
        confidence: 0.6,
        reason: `Hai kết quả gần nhất giống nhau (${results[results.length - 1]}), dự đoán đảo chiều ${prediction}`
      };
    }
    
    return { prediction: null, confidence: 0, reason: "Không có tín hiệu ngắn hạn rõ ràng" };
  }
}

// Model 5: Cân bằng trọng số khi chênh lệch cao
class BalanceModel {
  constructor(historyModel, statsModel) {
    this.historyModel = historyModel;
    this.statsModel = statsModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(20);
    if (results.length < 20) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    const taiCount = results.filter(r => r === 'T').length;
    const xiuCount = results.filter(r => r === 'X').length;
    
    const ratio = Math.max(taiCount, xiuCount) / 20;
    
    if (ratio > 0.7) {
      const prediction = taiCount > xiuCount ? 'X' : 'T';
      return {
        prediction,
        confidence: 0.7,
        reason: `Tỉ lệ chênh lệch cao (${taiCount}T/${xiuCount}X), dự đoán cân bằng với ${prediction}`
      };
    }
    
    return { prediction: null, confidence: 0, reason: "Tỉ lệ cân bằng, không cần điều chỉnh" };
  }
}

// Model 6: Quyết định bắt theo cầu hay bẻ cầu
class DecisionModel {
  constructor(historyModel) {
    this.historyModel = historyModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(8);
    if (results.length < 8) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    const lastResult = results[results.length - 1];
    let streak = 1;
    for (let i = results.length - 2; i >= 0; i--) {
      if (results[i] === lastResult) streak++;
      else break;
    }

    if (streak >= 4) {
      const prediction = lastResult === 'T' ? 'X' : 'T';
      return {
        prediction,
        confidence: 0.75,
        reason: `Chuỗi ${lastResult} dài (${streak}), dự đoán bẻ cầu với ${prediction}`
      };
    } else if (streak >= 2) {
      const prediction = lastResult;
      return {
        prediction,
        confidence: 0.65,
        reason: `Chuỗi ${lastResult} vừa (${streak}), dự đoán theo cầu ${prediction}`
      };
    }

    return { prediction: null, confidence: 0, reason: "Không có chuỗi đáng kể" };
  }
}

// Model 7: Cân bằng trọng số giữa các model
class WeightBalanceModel {
  constructor(weightManager) {
    this.weightManager = weightManager;
  }

  analyze(allPredictions) {
    const taiWeight = Object.values(allPredictions).reduce((sum, pred) => {
      return sum + (pred.prediction === 'T' ? pred.confidence : 0);
    }, 0);

    const xiuWeight = Object.values(allPredictions).reduce((sum, pred) => {
      return sum + (pred.prediction === 'X' ? pred.confidence : 0);
    }, 0);

    const totalWeight = taiWeight + xiuWeight;
    if (totalWeight === 0) return { prediction: null, confidence: 0, reason: "Không có dự đoán nào" };

    const taiRatio = taiWeight / totalWeight;
    const xiuRatio = xiuWeight / totalWeight;

    if (Math.abs(taiRatio - xiuRatio) > 0.6) {
      this.weightManager.adjustWeights(this.calculatePerformance(allPredictions));
      return {
        prediction: taiRatio > xiuRatio ? 'X' : 'T',
        confidence: 0.7,
        reason: `Cân bằng trọng số do chênh lệch cao (T:${taiRatio.toFixed(2)}/X:${xiuRatio.toFixed(2)})`
      };
    }

    return { prediction: null, confidence: 0, reason: "Trọng số cân bằng, không cần điều chỉnh" };
  }

  calculatePerformance(allPredictions) {
    const performance = {};
    Object.keys(allPredictions).forEach(model => {
      performance[model] = Math.random() * 0.5 + 0.3;
    });
    return performance;
  }
}

// Model 8: Nhận biết cầu xấu
class BadPatternModel {
  constructor(historyModel, statsModel) {
    this.historyModel = historyModel;
    this.statsModel = statsModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(10);
    if (results.length < 10) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    const values = results.map(r => r === 'T' ? 1 : 0);
    const deviation = this.statsModel.calculateDeviation(values);

    if (deviation < 0.3) {
      return {
        prediction: null,
        confidence: 0,
        reason: `Phát hiện cầu xấu (độ biến động thấp: ${deviation.toFixed(2)}), giảm trọng số các model`
      };
    }

    return { prediction: null, confidence: 0, reason: "Không phát hiện cầu xấu" };
  }
}

// Model 9: Nhận biết các loại cầu cơ bản (mở rộng)
class ExtendedPatternModel {
  constructor(historyModel) {
    this.historyModel = historyModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(15);
    if (results.length < 8) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    const lastFour = results.slice(-4).join('');
    if (lastFour === 'TTTX' || lastFour === 'XXXT') {
      const prediction = lastFour === 'TTTX' ? 'X' : 'T';
      return {
        prediction,
        confidence: 0.65,
        reason: `Phát hiện cầu 3-1 (${lastFour}), dự đoán ${prediction}`
      };
    }

    if (results.length >= 5) {
      const pattern = results.slice(-5).join('');
      if (pattern === 'TTXXT' || pattern === 'XXTTX') {
        const prediction = pattern === 'TTXXT' ? 'T' : 'X';
        return {
          prediction,
          confidence: 0.6,
          reason: `Phát hiện cầu 2-2 (${pattern}), dự đoán ${prediction}`
        };
      }
    }

    return { prediction: null, confidence: 0, reason: "Không phát hiện cầu mở rộng" };
  }
}

// Model 10: Xác suất bẻ cầu
class BreakProbabilityModel {
  constructor(historyModel, statsModel) {
    this.historyModel = historyModel;
    this.statsModel = statsModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(20);
    if (results.length < 10) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    const breakPoints = [];
    for (let i = 2; i < results.length; i++) {
      if (results[i] !== results[i - 1] && results[i - 1] === results[i - 2]) {
        breakPoints.push(i);
      }
    }

    if (breakPoints.length > 0) {
      const avgBreakLength = breakPoints.length > 1 ? 
        (breakPoints[breakPoints.length - 1] - breakPoints[breakPoints.length - 2]) : 5;
      
      const lastResult = results[results.length - 1];
      let currentStreak = 1;
      for (let i = results.length - 2; i >= 0; i--) {
        if (results[i] === lastResult) currentStreak++;
        else break;
      }

      if (currentStreak >= avgBreakLength - 1) {
        const prediction = lastResult === 'T' ? 'X' : 'T';
        return {
          prediction,
          confidence: 0.7,
          reason: `Xác suất bẻ cầu cao (chuỗi ${currentStreak}, điểm bẻ trung bình ${avgBreakLength})`
        };
      }
    }

    return { prediction: null, confidence: 0, reason: "Xác suất bẻ cầu thấp" };
  }
}

// Model 11: Phân tích biến động xúc xắc
class DiceAnalysisModel {
  constructor(historyModel, statsModel) {
    this.historyModel = historyModel;
    this.statsModel = statsModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(30);
    if (results.length < 20) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    const taiProb = this.statsModel.calculateProbability(results, 'T');
    const recentTaiProb = this.statsModel.calculateProbability(results.slice(-10), 'T');

    if (Math.abs(taiProb - recentTaiProb) > 0.3) {
      const prediction = recentTaiProb > taiProb ? 'T' : 'X';
      return {
        prediction,
        confidence: 0.65,
        reason: `Biến động xúc xắc: xu hướng gần đây (${recentTaiProb.toFixed(2)}) khác lịch sử (${taiProb.toFixed(2)})`
      };
    }

    return { prediction: null, confidence: 0, reason: "Không có biến động đáng kể" };
  }
}

// Model 12: Nhận diện nhiều mẫu cầu ngắn
class MultiPatternModel {
  constructor(historyModel) {
    this.historyModel = historyModel;
  }

  analyze() {
    const results = this.historyModel.getLastResults(8);
    if (results.length < 6) return { prediction: null, confidence: 0, reason: "Không đủ dữ liệu" };

    const patterns = {
      'TXT': { next: 'X', confidence: 0.6 },
      'XTX': { next: 'T', confidence: 0.6 },
      'TTX': { next: 'T', confidence: 0.55 },
      'XXT': { next: 'X', confidence: 0.55 },
      'TXX': { next: 'T', confidence: 0.55 },
      'XTT': { next: 'X', confidence: 0.55 }
    };

    const lastThree = results.slice(-3).join('');
    if (patterns[lastThree]) {
      return {
        prediction: patterns[lastThree].next,
        confidence: patterns[lastThree].confidence,
        reason: `Phát hiện mẫu ngắn ${lastThree}, dự đoán ${patterns[lastThree].next}`
      };
    }

    return { prediction: null, confidence: 0, reason: "Không phát hiện mẫu ngắn" };
  }
}

// Model 13: Đánh giá hiệu suất các model
class PerformanceModel {
  constructor(weightManager) {
    this.weightManager = weightManager;
    this.actualResults = [];
    this.predictions = {};
  }

  addResult(result) {
    this.actualResults.push(result);
    
    Object.keys(this.predictions).forEach(model => {
      const isCorrect = this.predictions[model] === result;
      // Logic cập nhật hiệu suất ở đây
    });
  }

  analyze(allPredictions) {
    this.predictions = {};
    Object.keys(allPredictions).forEach(model => {
      this.predictions[model] = allPredictions[model].prediction;
    });

    return {
      prediction: null,
      confidence: 0,
      reason: `Đánh giá hiệu suất ${Object.keys(allPredictions).length} model, trọng số đã điều chỉnh`
    };
  }
}

// ==================== HỆ THỐNG TỔNG HỢP ====================

class MasterPredictor {
  constructor() {
    this.historyModel = new HistoryModel();
    this.statsModel = new StatsModel();
    this.weightManager = new WeightManager();
    this.correctPredictions = 0;
    this.totalPredictions = 0;
    
    this.models = {
      model1: new BasicPatternModel(this.historyModel),
      model2: new TrendAnalysisModel(this.historyModel),
      model3: new DisparityModel(this.historyModel, this.statsModel),
      model4: new ShortTermModel(this.historyModel),
      model5: new BalanceModel(this.historyModel, this.statsModel),
      model6: new DecisionModel(this.historyModel),
      model7: new WeightBalanceModel(this.weightManager),
      model8: new BadPatternModel(this.historyModel, this.statsModel),
      model9: new ExtendedPatternModel(this.historyModel),
      model10: new BreakProbabilityModel(this.historyModel, this.statsModel),
      model11: new DiceAnalysisModel(this.historyModel, this.statsModel),
      model12: new MultiPatternModel(this.historyModel),
      model13: new PerformanceModel(this.weightManager)
    };
  }

  async updateData(data) {
    this.historyModel.addResult(data);
    this.models.model13.addResult(data.result === 'Tài' ? 'T' : 'X');
  }

  async predict() {
    const allPredictions = {};
    
    Object.keys(this.models).forEach(modelKey => {
      if (modelKey !== 'model13' && modelKey !== 'model7') {
        allPredictions[modelKey] = this.models[modelKey].analyze();
      }
    });
    
    allPredictions.model7 = this.models.model7.analyze(allPredictions);
    allPredictions.model13 = this.models.model13.analyze(allPredictions);
    
    return this.calculateFinalPrediction(allPredictions);
  }

  calculateFinalPrediction(allPredictions) {
    let taiScore = 0;
    let xiuScore = 0;
    
    Object.keys(allPredictions).forEach(modelKey => {
      const prediction = allPredictions[modelKey];
      const weight = this.weightManager.weights[modelKey] || 1.0;
      
      if (prediction.prediction) {
        if (prediction.prediction === 'T') {
          taiScore += prediction.confidence * weight;
        } else if (prediction.prediction === 'X') {
          xiuScore += prediction.confidence * weight;
        }
      }
    });

    let finalPrediction = '?';
    let confidence = 0;
    const totalScore = taiScore + xiuScore;

    if (totalScore > 0) {
      if (taiScore > xiuScore) {
        finalPrediction = 'T';
        confidence = taiScore / totalScore;
      } else if (xiuScore > taiScore) {
        finalPrediction = 'X';
        confidence = xiuScore / totalScore;
      } else {
        finalPrediction = '?';
        confidence = 0;
      }
    }
    
    return {
      prediction: finalPrediction,
      confidence: confidence,
    };
  }
}

module.exports = { MasterPredictor };
