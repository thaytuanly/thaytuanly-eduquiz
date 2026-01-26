
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Question, QuestionType, GameStatus } from '../types';
import { generateQuestionsAI } from '../services/geminiService';

const ManagerDashboard: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

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
      setQuestions(qs || []);
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
    if (data) setQuestions([...questions, data]);
  };

  const updateQuestion = async (id: string, updates: Partial<Question>) => {
    // Map camelCase to snake_case for DB
    const dbUpdates: any = {};
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.correctAnswer !== undefined) dbUpdates.correct_answer = updates.correctAnswer;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.timeLimit !== undefined) dbUpdates.time_limit = updates.timeLimit;
    if (updates.options !== undefined) dbUpdates.options = updates.options;
    if (updates.mediaUrl !== undefined) dbUpdates.media_url = updates.mediaUrl;
    if (updates.mediaType !== undefined) dbUpdates.media_type = updates.mediaType;

    await supabase.from('questions').update(dbUpdates).eq('id', id);
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from('questions').delete().eq('id', id);
    setQuestions(questions.filter(q => q.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div>
          <button onClick={() => navigate('/manage-list')} className="text-indigo-600 font-bold text-sm mb-2 flex items-center gap-1">← Quay lại danh sách</button>
          <h1 className="text-3xl font-black text-slate-900">Thiết Lập Câu Hỏi</h1>
          <p className="text-slate-500 font-medium italic">Cloud Match: <span className="text-indigo-600 font-mono font-bold">{code}</span></p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => handleAddQuestion(QuestionType.MCQ)} className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white rounded-lg transition">+ MCQ</button>
            <button onClick={() => handleAddQuestion(QuestionType.SHORT_ANSWER)} className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white rounded-lg transition">+ Tự Luận</button>
            <button onClick={() => handleAddQuestion(QuestionType.BUZZER)} className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white rounded-lg transition">+ Bấm Chuông</button>
          </div>
          <button onClick={() => navigate(`/host/${code}`)} className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-black">VÀO TRẬN ĐẤU</button>
        </div>
      </header>

      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
               <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded uppercase">#{idx + 1} {q.type}</span>
               <button onClick={() => deleteQuestion(q.id)} className="text-rose-500">✕</button>
             </div>
             <textarea 
               value={q.content} 
               onChange={(e) => updateQuestion(q.id, { content: e.target.value })}
               className="w-full p-4 bg-slate-50 rounded-xl font-bold mb-4 outline-none focus:ring-2 ring-indigo-500"
             />
             {q.type === QuestionType.MCQ && (
               <div className="grid grid-cols-2 gap-3 mb-4">
                 {q.options?.map((opt, oIdx) => (
                   <input 
                    key={oIdx} value={opt} 
                    onChange={(e) => {
                      const newOpts = [...(q.options || [])];
                      newOpts[oIdx] = e.target.value;
                      updateQuestion(q.id, { options: newOpts });
                    }}
                    className="p-2 bg-slate-50 border rounded-lg text-sm"
                   />
                 ))}
               </div>
             )}
             <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                <span>Đáp án:</span>
                <input 
                  value={q.correctAnswer || (q as any).correct_answer} 
                  onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                  className="bg-emerald-50 text-emerald-700 p-2 rounded-lg flex-1 outline-none"
                />
                <span>Điểm:</span>
                <input 
                  type="number" value={q.points} 
                  onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value) })}
                  className="w-16 bg-slate-100 p-2 rounded-lg text-center"
                />
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagerDashboard;
