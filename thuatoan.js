// thuatoan.js

class SimplePredictor {
    constructor() {
        // Chỉ cần lưu lịch sử kết quả (Tài hoặc Xỉu)
        this.history = [];
    }

    /**
     * Cập nhật kết quả phiên mới nhất.
     * @param {{ result: string }} newEntry - Chỉ cần kết quả "Tài" hoặc "Xỉu".
     */
    updateData({ result }) {
        this.history.push(result);

        // Giới hạn lịch sử để tránh tốn bộ nhớ
        if (this.history.length > 500) {
            this.history.shift();
        }
    }

    /**
     * Tạo dự đoán cho phiên tiếp theo.
     * @returns {{prediction: string, confidence: number}}
     */
    predict() {
        const historyLength = this.history.length;

        // Nếu chưa có lịch sử, không thể dự đoán
        if (historyLength < 1) {
            return { prediction: "?", confidence: 0 };
        }

        // === LOGIC 1: BẮT CẦU BỆT (KHÔNG ĐỔI) ===
        // "Bệt cho đến chết": Nếu 2 phiên gần nhất giống nhau, theo cầu đó.
        if (historyLength >= 2) {
            const lastResult = this.history[historyLength - 1];
            const secondLastResult = this.history[historyLength - 2];

            if (lastResult === secondLastResult) {
                // Đang có bệt, dự đoán theo bệt
                return { prediction: lastResult, confidence: 0.75 }; // Độ tin cậy cao khi theo cầu
            }
        }

        // === LOGIC 2: BẺ CẦU (ĐẢO NGƯỢC) ===
        // Nếu không có cầu bệt, dự đoán ngược lại kết quả gần nhất.
        const lastResult = this.history[historyLength - 1];
        const reversedPrediction = lastResult === 'Tài' ? 'Xỉu' : 'Tài';
        
        return { prediction: reversedPrediction, confidence: 0.60 }; // Độ tin cậy trung bình khi bẻ cầu
    }
}

module.exports = SimplePredictor;
