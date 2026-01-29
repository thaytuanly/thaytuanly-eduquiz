import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const generateQuestionsAI = async (topic: string, count: number) => {
  // Lấy API Key: Ưu tiên biến môi trường của Vite, nếu không có thì lấy của Node/Vercel
  // @ts-ignore
  const apiKey = import.meta.env.VITE_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Chưa tìm thấy API Key. Vui lòng kiểm tra cấu hình biến môi trường (GEMINI_API_KEY).");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // Sử dụng model Flash bản ổn định (thư viện này tự xử lý việc map version)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              type: { 
                type: SchemaType.STRING, 
                description: "Loại câu hỏi: MCQ, SHORT_ANSWER, hoặc BUZZER" 
              },
              content: { type: SchemaType.STRING },
              options: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING } 
              },
              correctAnswer: { type: SchemaType.STRING },
              points: { type: SchemaType.NUMBER }
            },
            required: ["type", "content", "correctAnswer", "points"]
          }
        }
      }
    });

    const prompt = `Đóng vai chuyên gia giáo dục. Tạo danh sách ${count} câu hỏi thi đấu trí tuệ về chủ đề: "${topic}".
    Yêu cầu bắt buộc:
    1. Ngôn ngữ: Tiếng Việt.
    2. Nếu là MCQ: Phải có đủ 4 đáp án trong mảng 'options'.
    3. Nếu là SHORT_ANSWER hoặc BUZZER: Mảng 'options' để rỗng [].
    4. 'correctAnswer': Phải khớp chính xác với một trong các options (nếu là MCQ).
    5. Điểm số: Random từ 10, 20 đến 30.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) return [];

    return JSON.parse(text);

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    
    // Xử lý thông báo lỗi dễ hiểu hơn
    if (error.message?.includes("429")) {
      throw new Error("Hệ thống đang quá tải hoặc hết hạn mức miễn phí. Vui lòng đợi 2 phút rồi thử lại.");
    }
    if (error.message?.includes("API key")) {
      throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại trên Vercel.");
    }
    
    throw new Error("Lỗi khi tạo câu hỏi: " + (error.message || "Không rõ nguyên nhân"));
  }
};
