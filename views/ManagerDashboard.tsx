
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { Question, QuestionType } from '../types.ts';
import { generateQuestionsAI } from '../services/geminiService.ts';

const ManagerDashboard: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
      navigate('/login');
      return;
    }
    fetchMatchAndQuestions();
  }, [code, navigate]);

  const fetchMatchAndQuestions = async () => {
    const { data: match } = await supabase.from('matches').select('id').eq('code', code).single();
    if (match) {
      setMatchId(match.id);
      const { data: qs } = await supabase.from('questions').select('*').eq('match_id', match.id).order('sort_order', { ascending: true });
      const mappedQs = (qs || []).map(q => ({
        ...q,
        correctAnswer: q.correct_answer,
        timeLimit: q.time_limit,
        mediaUrl: q.media_url,
        mediaType: q.media_type
      }));
      setQuestions(mappedQs);
    }
  };

  const handleAddQuestion = async (type: QuestionType) => {
    if (!matchId) return;
    const newQ = {
      match_id: matchId,
      type: type,
      content: type === QuestionType.BUZZER ? 'Ai là người nhanh nhất trả lời...' : 'Nội dung câu hỏi mới...',
      options: type === QuestionType.MCQ ? ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'] : [],
      correct_answer: type === QuestionType.MCQ ? 'Đáp án A' : '',
      points: 10,
      time_limit: 30,
      media_type: 'none',
      sort_order: questions.length
    };
    
    const { data } = await supabase.from('questions').insert([newQ]).select().single();
    if (data) {
       const mapped = { ...data, correctAnswer: data.correct_answer, timeLimit: data.time_limit, mediaUrl: data.media_url, mediaType: data.media_type };
       setQuestions([...questions, mapped]);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiTopic || !matchId) return;
    setLoadingAI(true);
    try {
      const aiQs = await generateQuestionsAI(aiTopic, 5);
      if (aiQs.length === 0) {
        alert("Không thể tạo câu hỏi. Hãy kiểm tra API Key!");
        return;
      }
      const insertData = aiQs.map((q: any, i: number) => ({
        match_id: matchId,
        type: q.type || QuestionType.MCQ,
        content: q.content,
        options: q.options,
        correct_answer: q.correctAnswer,
        points: q.points || 10,
        time_limit: 30,
        sort_order: questions.length + i
      }));
      await supabase.from('questions').insert(insertData);
      fetchMatchAndQuestions();
      setAiTopic('');
    } catch (e: any) {
      alert("Lỗi AI: " + e.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSaveQuestion = async (id: string) => {
    const q = questions.find(item => item.id === id);
    if (!q) return;
    setSavingId(id);
    await supabase.from('questions').update({
      content: q.content,
      correct_answer: q.correctAnswer,
      points: q.points,
      time_limit: q.timeLimit,
      options: q.options,
      media_url: q.mediaUrl,
      media_type: q.mediaType,
      type: q.type
    }).eq('id', id);
    setSavingId(null);
  };

  const deleteQuestion = async (id: string) => {
    if (window.confirm("Xóa câu hỏi này?")) {
      await supabase.from('questions').delete().eq('id', id);
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateLocalState = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pb-24 font-inter">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div>
          <button onClick={() => navigate('/manage-list')} className="text-indigo-600 font-bold text-sm mb-2 flex items-center gap-1">← Quay lại danh sách</button>
          <h1 className="text-3xl font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">Thiết Lập Câu Hỏi</h1>
          <p className="text-slate-500 font-medium italic">Mã trận đấu: <span className="text-indigo-600 font-mono font-bold tracking-widest">{code}</span></p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => handleAddQuestion(QuestionType.MCQ)} className="px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-white rounded-lg transition">+ MCQ</button>
            <button onClick={() => handleAddQuestion(QuestionType.SHORT_ANSWER)} className="px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-white rounded-lg transition">+ TỰ LUẬN</button>
            <button onClick={() => handleAddQuestion(QuestionType.BUZZER)} className="px-3 py-2 text-[10px] font-black text-rose-600 hover:bg-white rounded-lg transition">+ CHUÔNG</button>
          </div>
          <button onClick={() => navigate(`/host/${code}`)} className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-emerald-200 transition active:scale-95">VÀO TRẬN ĐẤU</button>
        </div>
      </header>

      <div className="mb-8 bg-indigo-600 p-8 rounded-[32px] shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <h3 className="text-xl font-black mb-4 flex items-center gap-2 relative z-10">✨ TẠO CÂU HỎI NHANH BẰNG AI</h3>
        <div className="flex flex-col md:flex-row gap-4 relative z-10">
          <input 
            placeholder="Ví dụ: Lịch sử Việt Nam thế kỷ 20, Toán học lớp 12, Đố vui kiến thức..."
            value={aiTopic}
            onChange={e => setAiTopic(e.target.value)}
            className="flex-1 p-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 font-bold outline-none focus:bg-white/20 transition"
          />
          <button 
            onClick={handleGenerateAI}
            disabled={loadingAI || !aiTopic}
            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            {loadingAI ? 'ĐANG TẠO...' : 'TẠO 5 CÂU'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {questions.length === 0 ? (
          <div className="bg-white p-20 text-center rounded-[32px] border-4 border-dashed border-slate-100">
             <p className="text-slate-400 font-bold text-xl uppercase tracking-widest">Chưa có câu hỏi nào</p>
             <p className="text-slate-300 mt-2">Hãy nhấn nút bên trên để thêm câu hỏi mới</p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 relative group animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">{idx + 1}</span>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${q.type === QuestionType.BUZZER ? 'text-rose-500' : 'text-slate-400'}`}>{q.type}</span>
                    <span className="text-xs font-bold text-slate-500">Loại câu hỏi</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => deleteQuestion(q.id)} className="px-4 py-2 rounded-xl text-xs font-black bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition">XÓA</button>
                  <button onClick={() => handleSaveQuestion(q.id)} className={`px-6 py-2 rounded-xl text-xs font-black shadow-sm ${savingId === q.id ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    {savingId === q.id ? 'ĐANG LƯU...' : 'LƯU LẠI'}
                  </button>
                </div>
              </div>
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <textarea 
                    value={q.content} 
                    onChange={(e) => updateLocalState(q.id, { content: e.target.value })} 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold min-h-[120px] outline-none focus:ring-2 ring-indigo-100 transition" 
                    placeholder="Nhập nội dung câu hỏi..." 
                  />
                  {q.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="relative group">
                           <span className="absolute left-3 top-3.5 text-[10px] font-black text-indigo-300 group-focus-within:text-indigo-600">{String.fromCharCode(65+oIdx)}</span>
                           <input 
                            value={opt} 
                            onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              newOpts[oIdx] = e.target.value;
                              updateLocalState(q.id, { options: newOpts });
                            }} 
                            className="w-full pl-8 pr-3 py-3 bg-white border-2 border-slate-50 rounded-xl text-sm font-bold focus:border-indigo-100 outline-none transition" 
                            placeholder={`Đáp án ${String.fromCharCode(65+oIdx)}...`}
                           />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 p-6 rounded-[28px] space-y-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Media</label>
                     <div className="grid grid-cols-2 gap-2">
                       <select 
                         value={q.mediaType} 
                         onChange={(e) => updateLocalState(q.id, { mediaType: e.target.value as any })}
                         className="p-2 bg-white border-2 border-white rounded-xl text-xs font-bold outline-none"
                       >
                         <option value="none">Không có</option>
                         <option value="image">Hình ảnh</option>
                         <option value="video">Video</option>
                       </select>
                       <input 
                        value={q.mediaUrl || ''} 
                        onChange={(e) => updateLocalState(q.id, { mediaUrl: e.target.value })} 
                        className="p-2 bg-white border-2 border-white rounded-xl text-[10px] outline-none" 
                        placeholder="Link URL..." 
                       />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm số</label>
                       <input type="number" value={q.points} onChange={(e) => updateLocalState(q.id, { points: parseInt(e.target.value) || 0 })} className="w-full p-3 bg-white border-2 border-white rounded-xl text-sm text-center font-black text-indigo-600 outline-none" />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giây (Đếm ngược)</label>
                       <input type="number" value={q.timeLimit} onChange={(e) => updateLocalState(q.id, { timeLimit: parseInt(e.target.value) || 30 })} className="w-full p-3 bg-white border-2 border-white rounded-xl text-sm text-center font-black text-rose-500 outline-none" />
                     </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đáp án đúng</label>
                      <input 
                        value={q.correctAnswer} 
                        onChange={(e) => updateLocalState(q.id, { correctAnswer: e.target.value })} 
                        className="w-full p-3 bg-emerald-50 text-emerald-700 font-black border-2 border-emerald-100 rounded-xl text-sm outline-none" 
                        placeholder="VD: Việt Nam, Đáp án A..." 
                      />
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
