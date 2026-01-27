
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionType } from "../types";

export const generateQuestionsAI = async (topic: string, count: number) => {
  // process.env.API_KEY được tiêm tự động bởi hệ thống
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy đóng vai một chuyên gia giáo dục. Tạo ${count} câu hỏi thi đấu trí tuệ về chủ đề: "${topic}". 
      Yêu cầu:
      - Đa dạng các loại: MCQ (trắc nghiệm), SHORT_ANSWER (tự luận ngắn), và BUZZER (câu hỏi bấm chuông nhanh).
      - Ngôn ngữ: Tiếng Việt.
      - Với MCQ, phải có đúng 4 lựa chọn trong mảng options.
      - correctAnswer phải là chuỗi văn bản chính xác.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: 'Sử dụng một trong: MCQ, SHORT_ANSWER, hoặc BUZZER' },
              content: { type: Type.STRING, description: 'Nội dung câu hỏi' },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'Chỉ cung cấp 4 lựa chọn nếu type là MCQ'
              },
              correctAnswer: { type: Type.STRING, description: 'Đáp án đúng' },
              points: { type: Type.NUMBER, description: 'Số điểm của câu hỏi (thường là 10, 20, 30)' },
              mediaType: { type: Type.STRING, description: 'Luôn trả về "none"' }
            },
            required: ['type', 'content', 'correctAnswer', 'points']
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
};
