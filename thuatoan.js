// thuatoan.js
class ThuatToan {
    constructor() {
        this.history = [];
        this.currentStreak = { type: null, length: 0 };
    }

    // Phân tích lịch sử để xác định chuỗi bệt hiện tại
    analyzeHistory(history) {
        if (history.length < 2) {
            this.currentStreak = { type: null, length: 0 };
            return;
        }

        const lastResult = history[history.length - 1].result;
        const secondLastResult = history[history.length - 2].result;

        if (lastResult === secondLastResult) {
            // Chuỗi tiếp tục
            if (this.currentStreak.type === lastResult) {
                this.currentStreak.length++;
            } else {
                // Chuỗi mới
                this.currentStreak = { type: lastResult, length: 2 };
            }
        } else {
            // Chuỗi bị phá vỡ
            this.currentStreak = { type: null, length: 0 };
        }
    }

    // Dự đoán dựa trên thuật toán
    predict(history) {
        this.history = history;
        
        // Nếu không có đủ dữ liệu, trả về random
        if (history.length < 2) {
            return Math.random() > 0.5 ? "Tài" : "Xỉu";
        }

        // Phân tích lịch sử để xác định chuỗi bệt
        this.analyzeHistory(history);

        // Nếu đang có chuỗi bệt từ 1 phiên trở lên, bắt cầu bệt
        if (this.currentStreak.length >= 1) {
            return this.currentStreak.type; // Tiếp tục bắt theo chuỗi bệt
        } else {
            // Random nếu không có chuỗi bệt rõ ràng
            return Math.random() > 0.5 ? "Tài" : "Xỉu";
        }
    }

    // Tính độ tin cậy (cao hơn khi có chuỗi bệt dài)
    calculateConfidence() {
        if (this.currentStreak.length >= 3) {
            return 0.85 + (this.currentStreak.length * 0.05); // Càng dài càng tin cậy
        } else if (this.currentStreak.length >= 1) {
            return 0.7;
        } else {
            return 0.5; // Độ tin cậy thấp khi random
        }
    }
}

module.exports = ThuatToan;
