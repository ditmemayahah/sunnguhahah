// thuatoan.js
class Predictor {
    constructor(config = {}) {
        // Cấu hình thuật toán
        this.config = {
            streakThreshold: 3, // Ngưỡng bắt đầu theo cầu bệt
            ...config
        };
        // Trạng thái hiện tại của thuật toán
        this.currentStreak = 0;
        this.currentStreakResult = null;
    }

    /**
     * Cập nhật thuật toán với kết quả mới nhất.
     * @param {string} newResult - Kết quả mới của phiên (e.g., "Tài" or "Xỉu").
     */
    update(newResult) {
        if (newResult === this.currentStreakResult) {
            this.currentStreak++;
        } else {
            this.currentStreak = 1;
            this.currentStreakResult = newResult;
        }
    }

    /**
     * Tạo một dự đoán mới dựa trên thuật toán.
     * @returns {{prediction: string, confidence: number}}
     */
    predict() {
        // Nếu đã đủ ngưỡng để "bắt cầu bệt"
        if (this.currentStreak >= this.config.streakThreshold) {
            // Dự đoán theo cầu bệt với độ tin cậy cao
            return {
                prediction: this.currentStreakResult,
                confidence: 0.85
            };
        }

        // Nếu không có cầu bệt, dự đoán ngẫu nhiên
        const randomPrediction = Math.random() < 0.5 ? "Tài" : "Xỉu";
        return {
            prediction: randomPrediction,
            confidence: 0.5 // Độ tin cậy thấp khi ngẫu nhiên
        };
    }
}

// Export class để có thể sử dụng ở các file khác
module.exports = Predictor;
