
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus, QuestionType } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';
import { supabase } from '../lib/supabase';

const GameMaster: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gameState, broadcastState, matchId } = useGameState('MANAGER', code);
  const [timeLeft, setTimeLeft] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!matchId || gameState?.currentQuestionIndex === undefined) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (currentQ) fetchResponses(currentQ.id);
  }, [matchId, gameState?.currentQuestionIndex]);

  const fetchResponses = async (qId: string) => {
    const { data } = await supabase.from('responses').select('*').eq('question_id', qId);
    setResponses(data || []);
  };

  useEffect(() => {
    if (gameState?.status === GameStatus.QUESTION_ACTIVE && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          if (next <= 0) { handleTimeUp(); return 0; }
          return next;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameState?.status, timeLeft === 0]);

  const handleTimeUp = () => {
    if (!gameState) return;
    broadcastState({ ...gameState, status: GameStatus.SHOWING_RESULTS, timer: 0 });
  };

  const jumpToQuestion = async (index: number) => {
    if (!gameState || !matchId) return;
    const nextQ = gameState.questions[index];
    const timeLimit = nextQ.timeLimit || 30;
    
    // Reset buzzer_time for all players on new question
    await supabase.from('players').update({ buzzer_time: null }).eq('match_id', matchId);
    
    setTimeLeft(timeLimit);
    (window as any).questionStartTime = Date.now();

    broadcastState({
      ...gameState,
      currentQuestionIndex: index,
      status: GameStatus.QUESTION_ACTIVE,
      timer: timeLimit,
      activeBuzzerPlayerId: null
    });
  };

  const updatePlayerScore = async (playerId: string, newScore: number) => {
    await supabase.from('players').update({ score: newScore }).eq('id', playerId);
  };

  const deletePlayer = async (playerId: string) => {
    if (window.confirm("Xóa thí sinh này khỏi trận đấu?")) {
      await supabase.from('players').delete().eq('id', playerId);
    }
  };

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">ĐANG TẢI...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar chọn câu hỏi */}
      <div className="w-20 bg-slate-900 border-r border-white/5 flex flex-col items-center py-6 gap-3 overflow-y-auto">
        <span className="text-[10px] font-black text-slate-500 uppercase">Câu</span>
        {gameState.questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => jumpToQuestion(idx)}
            className={`w-12 h-12 rounded-xl font-black transition-all ${gameState.currentQuestionIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
             <h1 className="text-3xl font-black text-yellow-400 font-mono tracking-tighter">{gameState.matchCode}</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/manage/${code}`)} className="bg-slate-800 px-6 py-3 rounded-xl font-bold text-sm">SỬA ĐỀ</button>
            <button 
              onClick={() => jumpToQuestion(gameState.currentQuestionIndex + 1)}
              className="bg-indigo-600 px-8 py-3 rounded-xl font-black shadow-lg"
            >
               CÂU TIẾP THEO
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-slate-900/50 rounded-[40px] border border-white/5 overflow-hidden flex flex-col min-h-[500px]">
               {currentQ ? (
                 <>
                   <div className="grid grid-cols-3 flex-1">
                      <div className="col-span-1 bg-black/20 border-r border-white/5 min-h-[300px]">
                         <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                      </div>
                      <div className="col-span-2 p-10 relative">
                        {gameState.status === GameStatus.QUESTION_ACTIVE && (
                          <div className="absolute top-6 right-8 text-5xl font-black text-indigo-500 font-mono">{timeLeft}</div>
                        )}
                        <h2 className="text-3xl font-extrabold leading-tight mb-8 pr-16">{currentQ.content}</h2>
                        {gameState.status === GameStatus.SHOWING_RESULTS && (
                          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                             <p className="text-emerald-400 font-black">Đáp án: {currentQ.correctAnswer}</p>
                          </div>
                        )}
                      </div>
                   </div>
                 </>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-slate-500 font-bold">Hãy chọn một câu hỏi để bắt đầu</div>
               )}
            </div>
          </div>

          <div className="space-y-4 h-[calc(100vh-200px)] overflow-y-auto pr-2">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-500">Thí sinh ({gameState.players.length})</h3>
            {gameState.players.map(p => {
              const resp = responses.find(r => r.player_id === p.id);
              return (
                <div key={p.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-black truncate max-w-[100px]">{p.name}</span>
                    <button onClick={() => deletePlayer(p.id)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition">✕</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      defaultValue={p.score}
                      onBlur={(e) => updatePlayerScore(p.id, parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-800 border-none rounded-lg p-2 text-yellow-400 font-black text-center"
                    />
                  </div>
                  {resp ? (
                    <p className="text-[10px] text-emerald-400 font-bold mt-2">✓ {resp.answer}</p>
                  ) : (
                    <p className="text-[10px] text-slate-600 font-bold mt-2">... Đang chờ</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameMaster;
