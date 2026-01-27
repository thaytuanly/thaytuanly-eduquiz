
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus, QuestionType } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';
import { supabase } from '../lib/supabase';

const GameMaster: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gameState, broadcastState, matchId, refresh } = useGameState('MANAGER', code);
  const [timeLeft, setTimeLeft] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!matchId || gameState?.currentQuestionIndex === undefined || gameState.currentQuestionIndex < 0) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (currentQ) {
      fetchResponses(currentQ.id);
      const channel = supabase
        .channel(`responses_sync_${currentQ.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'responses', filter: `question_id=eq.${currentQ.id}` }, () => fetchResponses(currentQ.id))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [matchId, gameState?.currentQuestionIndex]);

  const fetchResponses = async (qId: string) => {
    const { data } = await supabase.from('responses').select('*').eq('question_id', qId);
    setResponses(data || []);
  };

  useEffect(() => {
    if (gameState?.status === GameStatus.QUESTION_ACTIVE && timeLeft > 0) {
      timerRef.current = setInterval(async () => {
        setTimeLeft(prev => {
          const next = prev - 1;
          // Đồng bộ timer lên Database mỗi giây để Người chơi & Người xem nhìn thấy khớp nhau
          supabase.from('matches').update({ timer: next }).eq('id', matchId);
          
          if (next <= 0) { 
            handleTimeUp(); 
            clearInterval(timerRef.current);
            return 0;
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameState?.status, timeLeft > 0, matchId]);

  const handleTimeUp = async () => {
    if (!gameState) return;
    await supabase.from('matches').update({ status: GameStatus.SHOWING_RESULTS, timer: 0 }).eq('id', matchId);
    refresh();
  };

  const jumpToQuestion = async (index: number) => {
    if (!gameState || !matchId || index < 0 || index >= gameState.questions.length) return;
    const nextQ = gameState.questions[index];
    const timeLimit = nextQ.timeLimit || 30;
    
    // Reset DB state for new question
    await supabase.from('matches').update({ 
      buzzer_p1_id: null, 
      buzzer_t1: null, 
      buzzer_p2_id: null, 
      buzzer_t2: null,
      status: GameStatus.QUESTION_ACTIVE,
      current_question_index: index,
      timer: timeLimit
    }).eq('id', matchId);
    
    setTimeLeft(timeLimit);
    (window as any).questionStartTime = Date.now();
    refresh(); // Force local state sync
  };

  const resetCurrentResponses = async () => {
    if (!gameState || gameState.currentQuestionIndex < 0) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (window.confirm("BẠN CÓ CHẮC MUỐN XÓA TẤT CẢ CÂU TRẢ LỜI CỦA CÂU NÀY?")) {
      await supabase.from('responses').delete().eq('question_id', currentQ.id);
      fetchResponses(currentQ.id);
    }
  };

  const resetBuzzer = async () => {
    if (!matchId) return;
    await supabase.from('matches').update({ 
      buzzer_p1_id: null, 
      buzzer_t1: null, 
      buzzer_p2_id: null, 
      buzzer_t2: null 
    }).eq('id', matchId);
  };

  const updatePlayerScore = async (playerId: string, newScore: number) => {
    await supabase.from('players').update({ score: newScore }).eq('id', playerId);
  };

  const getBuzzerName = (id: string | null) => {
    if (!id) return "---";
    const p = gameState?.players.find(player => player.id === id);
    return p ? p.name : "Vắng mặt";
  };

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black text-xl animate-pulse">ĐANG KHỞI TẠO ĐIỀU KHIỂN...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex overflow-hidden font-inter">
      {/* Question Selector Sidebar */}
      <div className="w-20 bg-slate-900 border-r border-white/5 flex flex-col items-center py-6 gap-3 overflow-y-auto shrink-0 scrollbar-hide">
        <span className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Đề thi</span>
        {gameState.questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => jumpToQuestion(idx)}
            className={`w-12 h-12 rounded-xl font-black transition-all shrink-0 ${gameState.currentQuestionIndex === idx ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white'}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-between items-center p-6 bg-slate-900/80 border-b border-white/5 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 px-6 py-2 rounded-xl font-black text-2xl font-mono shadow-xl shadow-indigo-500/20">{gameState.matchCode}</div>
            <div className="flex gap-2">
              <button onClick={resetBuzzer} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-[10px] font-black transition shadow-lg active:scale-95">RESET CHUÔNG</button>
              <button onClick={resetCurrentResponses} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-[10px] font-black transition active:scale-95">XÓA ĐÁP ÁN CÂU NÀY</button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/manage/${code}`)} className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold text-sm transition border border-white/5">SỬA ĐỀ</button>
            <button 
              onClick={() => jumpToQuestion(gameState.currentQuestionIndex + 1)}
              className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-xl font-black shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
               CÂU KẾ TIẾP →
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 grid lg:grid-cols-4 gap-8 overflow-y-auto">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-slate-900/50 rounded-[48px] border border-white/5 overflow-hidden flex flex-col min-h-[550px] shadow-2xl relative">
               {currentQ ? (
                 <div className="grid grid-cols-3 flex-1 min-h-0">
                    <div className="col-span-1 bg-black/40 border-r border-white/5 relative flex items-center justify-center min-h-[400px]">
                       <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                    </div>
                    <div className="col-span-2 p-12 relative flex flex-col justify-center">
                      <div className="absolute top-8 right-12 flex flex-col items-end">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Thời gian</span>
                        <div className={`text-8xl font-black font-mono tracking-tighter ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-500'}`}>{timeLeft}</div>
                      </div>
                      
                      <div className="mb-4">
                        <span className="bg-white/10 text-indigo-300 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">CÂU HỎI SỐ {gameState.currentQuestionIndex + 1} ({currentQ.type})</span>
                      </div>
                      <h2 className="text-4xl font-extrabold leading-tight mb-10 pr-24">{currentQ.content}</h2>
                      
                      <div className="flex gap-4 mb-10">
                         <div className={`p-6 rounded-[32px] border flex-1 text-center transition-all duration-500 ${gameState?.buzzerP1Id ? 'bg-emerald-500/20 border-emerald-500/40 scale-105 shadow-2xl shadow-emerald-500/20' : 'bg-white/5 border-white/5 opacity-50'}`}>
                            <p className="text-[10px] font-black uppercase mb-1 text-emerald-400 tracking-tighter">🔔 CHUÔNG #1</p>
                            <p className="text-2xl font-black truncate">{getBuzzerName(gameState?.buzzerP1Id)}</p>
                         </div>
                         <div className={`p-6 rounded-[32px] border flex-1 text-center transition-all duration-500 ${gameState?.buzzerP2Id ? 'bg-amber-500/20 border-amber-500/40 scale-105 shadow-2xl shadow-amber-500/20' : 'bg-white/5 border-white/5 opacity-50'}`}>
                            <p className="text-[10px] font-black uppercase mb-1 text-amber-400 tracking-tighter">🔔 CHUÔNG #2</p>
                            <p className="text-2xl font-black truncate">{getBuzzerName(gameState?.buzzerP2Id)}</p>
                         </div>
                      </div>

                      <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16"></div>
                         <p className="text-emerald-400 font-black text-xs mb-1 uppercase tracking-widest opacity-60 relative z-10">Đáp án chính xác</p>
                         <p className="text-3xl font-black text-white relative z-10">{currentQ.correctAnswer || "Chưa thiết lập"}</p>
                      </div>
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-6">
                    <div className="text-9xl opacity-10 animate-pulse">🎮</div>
                    <div className="text-center">
                      <p className="font-black text-3xl uppercase tracking-widest mb-2 text-white/20">Sẵn sàng điều khiển</p>
                      <p className="text-slate-600 font-medium">Chọn câu hỏi đầu tiên ở cột trái để bắt đầu trận đấu.</p>
                    </div>
                 </div>
               )}
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-500 mb-4 border-b border-white/5 pb-2">Bảng xếp hạng ({gameState.players.length})</h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => {
                const resp = responses.find(r => r.player_id === p.id);
                return (
                  <div key={p.id} className="bg-white/5 p-5 rounded-[32px] border border-white/5 hover:bg-white/10 transition-all group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-yellow-400 text-indigo-950' : 'bg-slate-800 text-slate-400'}`}>{idx + 1}</div>
                        <span className="font-black text-sm truncate max-w-[100px]">{p.name}</span>
                      </div>
                      <input 
                        type="number" 
                        value={p.score}
                        onChange={(e) => updatePlayerScore(p.id, parseInt(e.target.value) || 0)}
                        className="w-16 bg-transparent text-emerald-400 font-black text-right outline-none text-xl focus:bg-white/5 rounded-lg p-1 transition"
                      />
                    </div>
                    {resp ? (
                      <div className={`p-3 rounded-2xl border-2 animate-in zoom-in duration-300 ${resp.is_correct ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${resp.is_correct ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {resp.is_correct ? 'ĐÚNG' : 'SAI'}
                          </span>
                          <span className="text-[10px] font-mono text-white/30">{resp.response_time}ms</span>
                        </div>
                        <p className="text-sm font-bold text-white italic truncate">"{resp.answer}"</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5 border-dashed text-center opacity-40">
                        <p className="text-[10px] text-slate-500 font-bold uppercase italic">Chưa phản hồi</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GameMaster;
