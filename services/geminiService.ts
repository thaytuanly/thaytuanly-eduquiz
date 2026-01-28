
import { GoogleGenAI, Type } from "@google/genai";

export const generateQuestionsAI = async (topic: string, count: number) => {
  // Lấy API Key từ biến môi trường theo yêu cầu
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("Không tìm thấy API_KEY trong cấu hình hệ thống. Vui lòng kiểm tra lại thiết lập biến môi trường (Environment Variables).");
  }

  // Khởi tạo instance mới ngay trước khi gọi API để đảm bảo Key luôn mới nhất
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy đóng vai một chuyên gia giáo dục. Tạo danh sách gồm ${count} câu hỏi thi đấu trí tuệ về chủ đề: "${topic}". 
      Yêu cầu:
      - Loại câu hỏi: MCQ (trắc nghiệm), SHORT_ANSWER (tự luận ngắn), BUZZER (câu hỏi bấm chuông).
      - Ngôn ngữ: Tiếng Việt.
      - Với MCQ, phải có mảng options chứa đúng 4 chuỗi đáp án.
      - correctAnswer phải là đáp án đúng nhất.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: 'MCQ, SHORT_ANSWER, hoặc BUZZER' },
              content: { type: Type.STRING, description: 'Nội dung câu hỏi' },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'Cung cấp mảng 4 lựa chọn nếu là MCQ'
              },
              correctAnswer: { type: Type.STRING, description: 'Đáp án đúng' },
              points: { type: Type.NUMBER, description: 'Điểm số (10, 20 hoặc 30)' }
            },
            required: ['type', 'content', 'correctAnswer', 'points']
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    if (error.message?.includes("API key")) {
      throw new Error("API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại Key: " + apiKey.substring(0, 5) + "...");
    }
    throw new Error(error.message || "Lỗi tạo câu hỏi từ AI");
  }
};
