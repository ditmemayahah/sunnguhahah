/**
 * Hàm dự đoán kết quả tiếp theo dựa trên lịch sử.
 * Logic: Nếu kết quả cuối cùng là Tài, dự đoán Xỉu và ngược lại (bẻ cầu).
 * @param {Array} history - Mảng lịch sử các phiên game.
 * @returns {Object} - Đối tượng chứa dự đoán cho phiên tiếp theo.
 */
function getPrediction(history) {
  // Nếu chưa có lịch sử, trả về giá trị mặc định.
  if (!history || history.length === 0) {
    return {
      prediction: "?",
    };
  }

  // Lấy kết quả của phiên gần nhất.
  const lastGame = history[history.length - 1];
  const lastResult = lastGame.result;

  let nextPrediction = "?";

  // Áp dụng logic dự đoán đơn giản.
  if (lastResult === "Tài") {
    nextPrediction = "Xỉu";
  } else if (lastResult === "Xỉu") {
    nextPrediction = "Tài";
  }

  return {
    prediction: nextPrediction,
  };
}

// Xuất hàm getPrediction để file server.js có thể sử dụng.
module.exports = {
  getPrediction,
};
