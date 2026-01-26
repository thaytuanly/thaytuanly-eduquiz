
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionType } from "../types";

export const generateQuestionsAI = async (topic: string, count: number) => {
  // Fix: Create GoogleGenAI instance right before making an API call to use the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Tạo ${count} câu hỏi thi đấu về chủ đề: ${topic}. Hãy tạo đa dạng các loại: trắc nghiệm (MCQ), trả lời ngắn (SHORT_ANSWER), và câu hỏi bấm chuông (BUZZER).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: 'MCQ, SHORT_ANSWER, or BUZZER' },
              content: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'Cung cấp 4 lựa chọn nếu là MCQ'
              },
              correctAnswer: { type: Type.STRING },
              points: { type: Type.NUMBER },
              mediaType: { type: Type.STRING, description: 'none' }
            },
            required: ['type', 'content', 'correctAnswer', 'points']
          }
        }
      }
    });

    // Fix: Access .text property directly (not as a method) as per guidelines
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("AI Error:", error);
    // Graceful error handling for API failures
    return [];
  }
};
