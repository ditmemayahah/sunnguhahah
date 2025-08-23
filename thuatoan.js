// file: thuatoan.js

/**
 * Lớp MasterPredictor: Một thuật toán dự đoán nâng cao.
 * Nó kết hợp nhiều phương pháp khác nhau để đưa ra dự đoán.
 */
class MasterPredictor {
    constructor() {
        this.history = []; // Lưu trữ lịch sử kết quả: ['Tài', 'Xỉu', 'Tài', ...]
        this.maxHistorySize = 500;
    }

    /**
     * Cập nhật dữ liệu lịch sử mỗi khi có kết quả mới.
     * @param {Object} data - Dữ liệu mới, bao gồm { result: 'Tài'/'Xỉu', score: số_tổng }
     */
    async updateData(data) {
        if (!data || !data.result) {
            console.warn("Dữ liệu cập nhật không hợp lệ.");
            return;
        }

        // Thêm kết quả mới vào lịch sử
        this.history.push(data.result);
        
        // Giới hạn kích thước lịch sử để tránh tốn bộ nhớ
        if (this.history.length > this.maxHistorySize) {
            this.history.shift(); // Xóa phần tử đầu tiên
        }
        console.log(`[🔮] Thuật toán cập nhật lịch sử. Tổng số phiên: ${this.history.length}`);
    }

    /**
     * Phương pháp 1: Phân tích mẫu hình chuỗi (Sequence Pattern)
     */
    predictBySequencePattern() {
        if (this.history.length < 5) return { prediction: '?', confidence: 0 };
        
        // Chuyển đổi lịch sử thành chuỗi 'T' và 'X'
        const historyStr = this.history.map(r => r === 'Tài' ? 'T' : 'X').join('');

        // Kiểm tra các mẫu hình lặp lại gần đây
        const recentPatterns = [
            historyStr.slice(-6, -3), // Ví dụ: 'TXX'
            historyStr.slice(-5, -2),
            historyStr.slice(-4, -1)
        ];

        let bestMatch = null;
        let highestConfidence = 0;

        for (const pattern of recentPatterns) {
            const patternToMatch = pattern;
            const nextExpected = historyStr.slice(-1);
            
            // Tìm kiếm mẫu hình tương tự trong lịch sử
            let matchCount = 0;
            for (let i = 0; i < historyStr.length - patternToMatch.length; i++) {
                if (historyStr.slice(i, i + patternToMatch.length) === patternToMatch) {
                    const nextResult = historyStr[i + patternToMatch.length];
                    if (nextResult === nextExpected) {
                        matchCount++;
                    }
                }
            }

            if (matchCount > 0) {
                const totalMatches = historyStr.split(patternToMatch).length - 1;
                const confidence = matchCount / totalMatches;
                if (confidence > highestConfidence) {
                    highestConfidence = confidence;
                    bestMatch = {
                        prediction: nextExpected === 'T' ? 'Xỉu' : 'Tài', // Đảo ngược kết quả vì mẫu hình có thể bị phá vỡ
                        confidence: 0.6 + confidence * 0.3 // Tăng độ tin cậy, ví dụ từ 60-90%
                    };
                }
            }
        }
        
        return bestMatch || { prediction: '?', confidence: 0 };
    }

    /**
     * Phương pháp 2: Phân tích xác suất theo số lần xuất hiện gần đây
     */
    predictByRecentBias() {
        if (this.history.length < 20) return { prediction: '?', confidence: 0 };
        
        const recentHistory = this.history.slice(-100);
        const taiCount = recentHistory.filter(r => r === 'Tài').length;
        const xiuCount = recentHistory.length - taiCount;

        const bias = Math.abs(taiCount - xiuCount);
        const total = taiCount + xiuCount;

        if (bias > total * 0.1) { // Nếu có sự chênh lệch lớn hơn 10%
            const prediction = taiCount > xiuCount ? 'Tài' : 'Xỉu';
            const confidence = (bias / total);
            return { prediction: prediction, confidence: 0.5 + confidence * 0.4 }; // Từ 50-90%
        }

        return { prediction: '?', confidence: 0 };
    }

    /**
     * Phương pháp 3: Dự đoán đảo chiều sau chuỗi dài
     */
    predictByStreakReversal() {
        if (this.history.length < 5) return { prediction: '?', confidence: 0 };

        const lastResult = this.history[this.history.length - 1];
        let streak = 0;
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i] === lastResult) {
                streak++;
            } else {
                break;
            }
        }

        if (streak >= 4) { // Nếu có 4 lần liên tiếp trở lên
            const prediction = lastResult === 'Tài' ? 'Xỉu' : 'Tài';
            return { prediction: prediction, confidence: 0.6 + (streak - 4) * 0.05 }; // Độ tin cậy tăng theo độ dài chuỗi
        }
        
        return { prediction: '?', confidence: 0 };
    }

    /**
     * Phương pháp 4: Dự đoán ngẫu nhiên thông minh (fallback)
     */
    smartRandomPredictor() {
        const last10 = this.history.slice(-10);
        const taiCount = last10.filter(r => r === 'Tài').length;
        const xiuCount = last10.length - taiCount;
        
        const taiProb = (taiCount + 1) / (last10.length + 2); // Sử dụng Laplace smoothing
        
        const randomValue = Math.random();
        
        const prediction = randomValue < taiProb ? 'Tài' : 'Xỉu';
        const confidence = 0.45 + Math.random() * 0.1; // Luôn giữ ở mức thấp
        
        return { prediction, confidence };
    }

    /**
     * Kết hợp tất cả các phương pháp để đưa ra dự đoán cuối cùng.
     */
    async predict() {
        const methods = [
            this.predictByStreakReversal(), // Trọng số cao
            this.predictBySequencePattern(), // Trọng số trung bình
            this.predictByRecentBias(),      // Trọng số trung bình
            this.smartRandomPredictor()      // Trọng số thấp (fallback)
        ];

        let finalPrediction = { prediction: '?', confidence: 0 };
        let bestConfidence = 0;

        for (const methodResult of methods) {
            if (methodResult.confidence > bestConfidence) {
                bestConfidence = methodResult.confidence;
                finalPrediction = methodResult;
            }
        }
        
        return finalPrediction;
    }
}

// Export class MasterPredictor để sử dụng ở server.js
module.exports = { MasterPredictor };
