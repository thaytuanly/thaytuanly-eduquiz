
import { GoogleGenAI, Type } from "@google/genai";

export const generateQuestionsAI = async (topic: string, count: number) => {
  // Thêm dòng này để TypeScript không báo lỗi "Cannot find name 'process'"
  // @ts-ignore
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
              type: { 
                type: Type.STRING, 
                description: 'Giá trị phải là MCQ, SHORT_ANSWER, hoặc BUZZER' 
              },
              content: { type: Type.STRING, description: 'Nội dung câu hỏi' },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'Mảng 4 lựa chọn nếu là MCQ, rỗng nếu là loại khác'
              },
              correctAnswer: { type: Type.STRING, description: 'Đáp án chính xác' },
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
    // Cung cấp thông báo lỗi thân thiện hơn cho người dùng
    if (error.message?.includes("API_KEY") || error.message?.includes("API key")) {
      throw new Error("Không thể kết nối với AI. Vui lòng kiểm tra xem API_KEY đã được cấu hình đúng trong Environment Variables chưa.");
    }
    throw new Error("Lỗi khi tạo câu hỏi bằng AI: " + (error.message || "Vui lòng thử lại sau."));
  }
};
