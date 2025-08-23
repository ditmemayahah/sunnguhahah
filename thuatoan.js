// thuatoan.js
class MasterPredictor {
    constructor() {
        this.history = [];
        this.correctPredictions = 0;
        this.totalPredictions = 0;
    }

    // Cập nhật dữ liệu mới từ kết quả phiên vừa rồi
    async updateData(data) {
        if (data && data.result) {
            this.history.push(data.result);
        }
    }

    // Dự đoán kết quả tiếp theo
    async predict() {
        let prediction = "?";
        let confidence = 0.5; // Mức độ tin cậy mặc định

        const historyLength = this.history.length;
        if (historyLength > 0) {
            const lastResult = this.history[historyLength - 1];
            
            // 1. Kiểm tra cầu bệt (3 phiên liên tiếp trở lên)
            // Lấy 3 phiên cuối cùng
            const lastThreeResults = this.history.slice(-3);
            const isStreak = lastThreeResults.length >= 3 && lastThreeResults.every(r => r === lastResult);

            if (isStreak) {
                // Nếu đang bệt, dự đoán tiếp tục bệt và tăng độ tin cậy
                prediction = lastResult;
                confidence = 0.8;
            } else {
                // 2. Không phải bệt, dự đoán ngẫu nhiên và đảo ngược
                const randomChoice = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
                prediction = (randomChoice === 'Tài') ? 'Xỉu' : 'Tài';
                confidence = 0.6; // Độ tin cậy cao hơn 50% một chút
            }
        } else {
            // Trường hợp chưa có lịch sử, dự đoán ngẫu nhiên
            prediction = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
            confidence = 0.5;
        }

        return {
            prediction: prediction,
            confidence: confidence
        };
    }
}

module.exports = { MasterPredictor };
