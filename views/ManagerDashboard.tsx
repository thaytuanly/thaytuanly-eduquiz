
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
      content: 'Nội dung câu hỏi mới...',
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
      const insertData = aiQs.map((q: any, i: number) => ({
        match_id: matchId,
        type: q.type,
        content: q.content,
        options: q.options,
        correct_answer: q.correctAnswer,
        points: q.points,
        time_limit: 30,
        sort_order: questions.length + i
      }));
      await supabase.from('questions').insert(insertData);
      fetchMatchAndQuestions();
      setAiTopic('');
    } catch (e) {
      alert("Lỗi AI: " + e);
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
      media_type: q.mediaType
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
          <button onClick={() => navigate('/manage-list')} className="text-indigo-600 font-bold text-sm mb-2 flex items-center gap-1">← Quay lại</button>
          <h1 className="text-3xl font-black text-slate-900 leading-none mb-1">Thiết Lập Câu Hỏi</h1>
          <p className="text-slate-500 font-medium italic">Mã trận: <span className="text-indigo-600 font-mono font-bold">{code}</span></p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => handleAddQuestion(QuestionType.MCQ)} className="px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition">+ MCQ</button>
            <button onClick={() => handleAddQuestion(QuestionType.SHORT_ANSWER)} className="px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition">+ TỰ LUẬN</button>
          </div>
          <button onClick={() => navigate(`/host/${code}`)} className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-black shadow-lg">VÀO TRẬN ĐẤU</button>
        </div>
      </header>

      {/* AI Box */}
      <div className="mb-8 bg-indigo-600 p-8 rounded-[32px] shadow-xl text-white">
        <h3 className="text-xl font-black mb-4 flex items-center gap-2">✨ TẠO CÂU HỎI NHANH BẰNG AI</h3>
        <div className="flex gap-4">
          <input 
            placeholder="Ví dụ: Lịch sử Việt Nam lớp 9, Toán học cơ bản..."
            value={aiTopic}
            onChange={e => setAiTopic(e.target.value)}
            className="flex-1 p-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 font-bold outline-none focus:bg-white/20 transition"
          />
          <button 
            onClick={handleGenerateAI}
            disabled={loadingAI || !aiTopic}
            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-100 transition disabled:opacity-50"
          >
            {loadingAI ? 'ĐANG TẠO...' : 'TẠO 5 CÂU'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 relative group">
             <div className="flex justify-between items-center mb-6">
               <span className="bg-slate-900 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">CÂU {idx + 1} - {q.type}</span>
               <div className="flex gap-2">
                 <button onClick={() => deleteQuestion(q.id)} className="px-4 py-2 rounded-xl text-xs font-black bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition">XÓA</button>
                 <button onClick={() => handleSaveQuestion(q.id)} className={`px-6 py-2 rounded-xl text-xs font-black ${savingId === q.id ? 'bg-slate-100' : 'bg-indigo-600 text-white'}`}>
                   {savingId === q.id ? 'ĐANG LƯU...' : 'LƯU LẠI'}
                 </button>
               </div>
             </div>
             <div className="grid lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-4">
                 <textarea value={q.content} onChange={(e) => updateLocalState(q.id, { content: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold min-h-[100px] outline-none" placeholder="Nội dung câu hỏi..." />
                 {q.type === QuestionType.MCQ && (
                   <div className="grid grid-cols-2 gap-3">
                     {q.options?.map((opt, oIdx) => (
                       <div key={oIdx} className="relative">
                          <span className="absolute left-3 top-3.5 text-[10px] font-black text-slate-300">{String.fromCharCode(65+oIdx)}</span>
                          <input value={opt} onChange={(e) => {
                            const newOpts = [...(q.options || [])];
                            newOpts[oIdx] = e.target.value;
                            updateLocalState(q.id, { options: newOpts });
                          }} className="w-full pl-8 pr-3 py-3 bg-white border border-slate-100 rounded-xl text-sm font-medium" />
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Loại Media</label>
                    <select 
                      value={q.mediaType} 
                      onChange={(e) => updateLocalState(q.id, { mediaType: e.target.value as any })}
                      className="w-full p-3 bg-white border rounded-xl text-sm font-bold"
                    >
                      <option value="none">Không có</option>
                      <option value="image">Hình ảnh</option>
                      <option value="video">Video (YouTube)</option>
                    </select>
                  </div>
                  <input value={q.mediaUrl || ''} onChange={(e) => updateLocalState(q.id, { mediaUrl: e.target.value })} className="w-full p-3 bg-white border rounded-xl text-xs" placeholder="Link ảnh hoặc YouTube..." />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Điểm</label>
                      <input type="number" value={q.points} onChange={(e) => updateLocalState(q.id, { points: parseInt(e.target.value) || 0 })} className="w-full p-3 bg-white border rounded-xl text-sm text-center font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Giây</label>
                      <input type="number" value={q.timeLimit} onChange={(e) => updateLocalState(q.id, { timeLimit: parseInt(e.target.value) || 30 })} className="w-full p-3 bg-white border rounded-xl text-sm text-center font-bold" />
                    </div>
                  </div>
                  <input value={q.correctAnswer} onChange={(e) => updateLocalState(q.id, { correctAnswer: e.target.value })} className="w-full p-3 bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 rounded-xl text-sm" placeholder="Đáp án đúng..." />
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagerDashboard;
