
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus, QuestionType } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';
import { supabase } from '../lib/supabase';

const GameMaster: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gameState, matchId, refresh, questionStartedAt, responses: syncedResponses } = useGameState('MANAGER', code);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (gameState?.status === GameStatus.QUESTION_ACTIVE && questionStartedAt && gameState.currentQuestionIndex >= 0) {
      const start = new Date(questionStartedAt).getTime();
      const currentQ = gameState.questions[gameState.currentQuestionIndex];
      const limit = (currentQ?.timeLimit || 30) * 1000;

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - start;
        const remaining = Math.max(0, Math.ceil((limit - elapsed) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          handleTimeUp();
          clearInterval(timerIntervalRef.current);
        }
      }, 500);

      return () => clearInterval(timerIntervalRef.current);
    } else {
      setTimeLeft(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [gameState?.status, questionStartedAt, gameState?.currentQuestionIndex]);

  const handleTimeUp = async () => {
    if (!matchId || gameState?.status !== GameStatus.QUESTION_ACTIVE) return;
    await supabase.from('matches').update({ status: GameStatus.SHOWING_RESULTS }).eq('id', matchId);
    refresh();
  };

  const jumpToQuestion = async (index: number) => {
    if (!matchId) return;
    
    try {
      let updateData: any = {};
      
      if (index === -1) {
        updateData = { 
          status: GameStatus.LOBBY,
          current_question_index: -1,
          question_started_at: null,
          buzzer_p1_id: null,
          buzzer_p2_id: null
        };
      } else {
        if (!gameState || index < 0 || index >= gameState.questions.length) return;
        const nextQ = gameState.questions[index];
        updateData = { 
          buzzer_p1_id: null, 
          buzzer_t1: null, 
          buzzer_p2_id: null, 
          buzzer_t2: null,
          status: GameStatus.QUESTION_ACTIVE,
          current_question_index: index,
          timer: nextQ.timeLimit,
          question_started_at: new Date().toISOString()
        };
      }

      await supabase.from('matches').update(updateData).eq('id', matchId);
      refresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const resetCurrentResponses = async () => {
    if (!gameState || gameState.currentQuestionIndex < 0) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (window.confirm("Xóa toàn bộ đáp án của câu hỏi này?")) {
      await supabase.from('responses').delete().eq('question_id', currentQ.id);
      refresh();
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
    refresh();
  };

  const updatePlayerScore = async (playerId: string, newScore: number) => {
    await supabase.from('players').update({ score: newScore }).eq('id', playerId);
  };

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">ĐANG KẾT NỐI...</div>;

  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex overflow-hidden font-inter">
      <div className="w-24 bg-slate-900 border-r border-white/5 flex flex-col items-center py-6 gap-3 overflow-y-auto shrink-0 scrollbar-hide">
        <span className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest text-center">BẮT ĐẦU</span>
        <button
          onClick={() => jumpToQuestion(-1)}
          className={`w-14 h-14 rounded-2xl font-black transition-all flex items-center justify-center text-2xl ${gameState.currentQuestionIndex === -1 ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
        >
          🏠
        </button>
        <div className="w-12 h-px bg-white/10 my-2"></div>
        <span className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest text-center">ĐỀ THI</span>
        {gameState.questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => jumpToQuestion(idx)}
            className={`w-14 h-14 rounded-2xl font-black transition-all shrink-0 text-lg ${gameState.currentQuestionIndex === idx ? 'bg-indigo-600 text-white scale-110 shadow-xl' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-between items-center p-6 bg-slate-900/80 border-b border-white/5 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 px-6 py-2 rounded-xl font-black text-2xl font-mono">{gameState.matchCode}</div>
            <div className="flex gap-2">
              <button onClick={resetBuzzer} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">RESET CHUÔNG</button>
              <button onClick={resetCurrentResponses} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-[10px] font-black">DỌN ĐÁP ÁN</button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/manage/${code}`)} className="bg-slate-800 px-6 py-3 rounded-xl font-bold text-sm">SỬA ĐỀ</button>
            <button 
              onClick={() => jumpToQuestion(gameState.currentQuestionIndex + 1)}
              className="bg-emerald-600 px-8 py-3 rounded-xl font-black shadow-lg"
            >
               TIẾP THEO →
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 grid lg:grid-cols-4 gap-8 overflow-y-auto">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-slate-900/50 rounded-[48px] border border-white/5 overflow-hidden flex flex-col min-h-[550px] shadow-2xl relative">
               {currentQ ? (
                 <div className="grid grid-cols-3 flex-1 min-h-0">
                    <div className="col-span-1 bg-black/40 border-r border-white/5 flex items-center justify-center">
                       <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                    </div>
                    <div className="col-span-2 p-12 relative flex flex-col justify-center">
                      <div className="absolute top-8 right-12 flex flex-col items-end">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Thời gian</span>
                        <div className={`text-8xl font-black font-mono tracking-tighter ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-500'}`}>{timeLeft}</div>
                      </div>
                      <div className="mb-4">
                        <span className="bg-white/10 text-indigo-300 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">CÂU HỎI {gameState.currentQuestionIndex + 1}</span>
                      </div>
                      <h2 className="text-4xl font-extrabold leading-tight mb-10 pr-24">{currentQ.content}</h2>
                      <div className="flex gap-4 mb-10">
                         <div className={`p-6 rounded-[32px] border flex-1 text-center transition-all duration-500 ${gameState?.buzzerP1Id ? 'bg-emerald-500/20 border-emerald-500/40 scale-105 shadow-xl' : 'bg-white/5 border-white/5 opacity-50'}`}>
                            <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">🔔 Hạng 1</p>
                            <p className="text-2xl font-black truncate">{gameState?.players.find(p => p.id === gameState.buzzerP1Id)?.name || "---"}</p>
                         </div>
                         <div className={`p-6 rounded-[32px] border flex-1 text-center transition-all duration-500 ${gameState?.buzzerP2Id ? 'bg-amber-500/20 border-amber-500/40 scale-105 shadow-xl' : 'bg-white/5 border-white/5 opacity-50'}`}>
                            <p className="text-[10px] font-black uppercase text-amber-400 mb-1">🔔 Hạng 2</p>
                            <p className="text-2xl font-black truncate">{gameState?.players.find(p => p.id === gameState.buzzerP2Id)?.name || "---"}</p>
                         </div>
                      </div>
                      <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px]">
                         <p className="text-emerald-400 font-black text-xs mb-1 uppercase opacity-60">Đáp án đúng</p>
                         <p className="text-3xl font-black text-white">{currentQ.correctAnswer || "Chưa có"}</p>
                      </div>
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-12 text-center">
                    <div className="text-9xl mb-8 opacity-10 animate-bounce">🏠</div>
                    <p className="font-black text-4xl uppercase text-white/20 tracking-tighter">Màn hình chờ</p>
                    <p className="text-slate-500 mt-4 text-xl font-medium">Hiện có <span className="text-indigo-400 font-black">{gameState.players.length}</span> thí sinh đang trong phòng.</p>
                 </div>
               )}
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <h3 className="font-black text-sm uppercase text-slate-500 mb-4 border-b border-white/5 pb-2">Xếp hạng & Đáp án</h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => {
                const resp = syncedResponses.find(r => r.player_id === p.id);
                return (
                  <div key={p.id} className="bg-white/5 p-5 rounded-[32px] border border-white/5 transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? 'bg-yellow-400 text-indigo-950' : 'bg-slate-800 text-slate-400'}`}>{idx + 1}</div>
                        <span className="font-black text-sm truncate">{p.name}</span>
                      </div>
                      <input 
                        type="number" 
                        value={p.score}
                        onChange={(e) => updatePlayerScore(p.id, parseInt(e.target.value) || 0)}
                        className="w-16 bg-transparent text-emerald-400 font-black text-right outline-none text-xl"
                      />
                    </div>
                    {resp ? (
                      <div className={`p-3 rounded-2xl border-2 animate-in zoom-in ${resp.is_correct ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${resp.is_correct ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {resp.is_correct ? 'ĐÚNG' : 'SAI'}
                          </span>
                          <span className="text-[10px] font-mono text-white/30">{resp.response_time}ms</span>
                        </div>
                        <p className="text-sm font-bold text-white italic truncate">"{resp.answer}"</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5 border-dashed text-center opacity-30">
                        <p className="text-[10px] text-slate-500 font-bold uppercase italic">Chờ phản hồi...</p>
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
