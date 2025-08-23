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
        let confidence = 0.5; // Mức độ tin cậy mặc định 50%

        if (this.history.length >= 2) {
            const last = this.history[this.history.length - 1];
            const secondLast = this.history[this.history.length - 2];

            // Dự đoán theo cầu bệt (3 lần liên tiếp trở lên)
            if (this.history.length >= 3 && this.history.slice(-3).every(r => r === last)) {
                prediction = last;
                confidence = 0.8; // Tăng độ tin cậy
            } 
            // Dự đoán theo cầu 1-1
            else if (last !== secondLast) {
                prediction = secondLast;
                confidence = 0.7; // Tăng độ tin cậy
            } 
            // Dự đoán theo kết quả vừa rồi
            else {
                prediction = last;
                confidence = 0.6; 
            }
        } else if (this.history.length > 0) {
            prediction = this.history[this.history.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
            confidence = 0.55;
        }

        return {
            prediction: prediction,
            confidence: confidence
        };
    }
}

module.exports = { MasterPredictor };
