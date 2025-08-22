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

        // === LOGIC CỐT LÕI: BẮT CẦU BỆT ===
        // "Bệt cho đến chết": Nếu 2 phiên gần nhất giống nhau, theo cầu đó.
        if (historyLength >= 2) {
            const lastResult = this.history[historyLength - 1];
            const secondLastResult = this.history[historyLength - 2];

            if (lastResult === secondLastResult) {
                // Đang có bệt, dự đoán theo bệt
                return { prediction: lastResult, confidence: 0.75 }; // Độ tin cậy cao hơn khi có cầu
            }
        }

        // === LOGIC DỰ PHÒNG: NGẪU NHIÊN ===
        // Nếu không có cầu bệt (hoặc chỉ có 1 phiên lịch sử), dự đoán ngẫu nhiên.
        const randomPrediction = Math.random() < 0.5 ? "Tài" : "Xỉu";
        return { prediction: randomPrediction, confidence: 0.50 }; // Độ tin cậy trung bình
    }
}

module.exports = SimplePredictor;
