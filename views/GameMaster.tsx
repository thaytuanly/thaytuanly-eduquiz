
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
  const [matchData, setMatchData] = useState<any>(null);

  useEffect(() => {
    if (!matchId) return;
    const fetchMatch = async () => {
      const { data } = await supabase.from('matches').select('*').eq('id', matchId).single();
      setMatchData(data);
    };
    fetchMatch();

    const matchSub = supabase.channel(`match_update_${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
        setMatchData(payload.new);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(matchSub); };
  }, [matchId]);

  useEffect(() => {
    if (!matchId || gameState?.currentQuestionIndex === undefined || gameState.currentQuestionIndex < 0) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (currentQ) {
      fetchResponses(currentQ.id);
      const channel = supabase
        .channel('realtime_responses_gm')
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
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          if (next <= 0) { handleTimeUp(); return 0; }
          return next;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameState?.status, timeLeft]);

  const handleTimeUp = () => {
    if (!gameState) return;
    broadcastState({ ...gameState, status: GameStatus.SHOWING_RESULTS, timer: 0 });
  };

  const jumpToQuestion = async (index: number) => {
    if (!gameState || !matchId || index < 0 || index >= gameState.questions.length) return;
    const nextQ = gameState.questions[index];
    const timeLimit = nextQ.timeLimit || 30;
    
    await supabase.from('matches').update({ 
      buzzer_p1_id: null, 
      buzzer_t1: null, 
      buzzer_p2_id: null, 
      buzzer_t2: null 
    }).eq('id', matchId);
    
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

  const resetBuzzer = async () => {
    if (!matchId) return;
    await supabase.from('matches').update({ 
      buzzer_p1_id: null, 
      buzzer_t1: null, 
      buzzer_p2_id: null, 
      buzzer_t2: null 
    }).eq('id', matchId);
  };

  const resetCurrentResponses = async () => {
    if (!gameState || gameState.currentQuestionIndex < 0) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (window.confirm("Bạn có chắc muốn xóa toàn bộ câu trả lời của câu hiện tại?")) {
      await supabase.from('responses').delete().eq('question_id', currentQ.id);
      fetchResponses(currentQ.id);
    }
  };

  const updatePlayerScore = async (playerId: string, newScore: number) => {
    await supabase.from('players').update({ score: newScore }).eq('id', playerId);
  };

  const deletePlayer = async (playerId: string) => {
    if (window.confirm("Xóa thí sinh này khỏi trận đấu?")) {
      await supabase.from('players').delete().eq('id', playerId);
    }
  };

  const getBuzzerName = (id: string | null) => {
    if (!id) return "---";
    const p = gameState?.players.find(player => player.id === id);
    return p ? p.name : "Thí sinh đã thoát";
  };

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">ĐANG TẢI...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex overflow-hidden font-inter">
      <div className="w-20 bg-slate-900 border-r border-white/5 flex flex-col items-center py-6 gap-3 overflow-y-auto shrink-0">
        <span className="text-[10px] font-black text-slate-500 uppercase mb-2">Câu</span>
        {gameState.questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => jumpToQuestion(idx)}
            className={`w-12 h-12 rounded-xl font-black transition-all shrink-0 ${gameState.currentQuestionIndex === idx ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-between items-center p-6 bg-slate-900/50 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 px-4 py-2 rounded-xl font-black text-xl font-mono">{gameState.matchCode}</div>
            <div className="flex gap-2">
              <button onClick={resetBuzzer} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-[10px] font-black transition">RESET CHUÔNG</button>
              <button onClick={resetCurrentResponses} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-[10px] font-black transition">RESET ĐÁP ÁN</button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/manage/${code}`)} className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold text-sm transition">SỬA ĐỀ</button>
            <button 
              onClick={() => jumpToQuestion(gameState.currentQuestionIndex + 1)}
              className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-xl font-black shadow-lg transition active:scale-95"
            >
               CÂU KẾ TIẾP
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 grid lg:grid-cols-4 gap-8 overflow-y-auto">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-slate-900/50 rounded-[48px] border border-white/5 overflow-hidden flex flex-col min-h-[500px] shadow-2xl relative">
               {currentQ ? (
                 <div className="grid grid-cols-3 flex-1 min-h-0">
                    <div className="col-span-1 bg-black/40 border-r border-white/5 relative flex items-center justify-center min-h-[400px]">
                       <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                    </div>
                    <div className="col-span-2 p-12 relative flex flex-col justify-center">
                      {gameState.status === GameStatus.QUESTION_ACTIVE && (
                        <div className="absolute top-8 right-12 text-7xl font-black text-indigo-500 font-mono tracking-tighter animate-pulse">{timeLeft}</div>
                      )}
                      <div className="mb-4">
                        <span className="bg-white/10 text-indigo-400 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">CÂU {gameState.currentQuestionIndex + 1}</span>
                      </div>
                      <h2 className="text-4xl font-extrabold leading-tight mb-8 pr-24">{currentQ.content}</h2>
                      
                      <div className="flex gap-4 mb-8">
                         <div className="bg-rose-500/10 p-4 rounded-3xl border border-rose-500/20 flex-1 text-center">
                            <p className="text-[10px] font-black text-rose-500 uppercase mb-1">Chuông #1</p>
                            <p className="text-xl font-black">{getBuzzerName(matchData?.buzzer_p1_id)}</p>
                         </div>
                         <div className="bg-amber-500/10 p-4 rounded-3xl border border-amber-500/20 flex-1 text-center">
                            <p className="text-[10px] font-black text-amber-500 uppercase mb-1">Chuông #2</p>
                            <p className="text-xl font-black">{getBuzzerName(matchData?.buzzer_p2_id)}</p>
                         </div>
                      </div>

                      {gameState.status === GameStatus.SHOWING_RESULTS && (
                        <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] animate-in slide-in-from-bottom-4 duration-500">
                           <p className="text-emerald-400 font-black text-sm mb-1 uppercase tracking-widest opacity-60">Đáp án chính xác</p>
                           <p className="text-3xl font-black text-white">{currentQ.correctAnswer}</p>
                        </div>
                      )}
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <div className="text-8xl">🏁</div>
                    <p className="font-black text-2xl uppercase tracking-widest">Sẵn sàng! Hãy chọn một câu hỏi.</p>
                 </div>
               )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-500 border-b border-white/5 pb-2">Thí sinh ({gameState.players.length})</h3>
            <div className="space-y-3 h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
              {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => {
                const resp = responses.find(r => r.player_id === p.id);
                return (
                  <div key={p.id} className="bg-white/5 p-4 rounded-[28px] border border-white/5 group transition-all hover:bg-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-black">{idx + 1}</span>
                        <span className="font-black text-sm truncate max-w-[80px]">{p.name}</span>
                      </div>
                      <input 
                        type="number" 
                        defaultValue={p.score}
                        onBlur={(e) => updatePlayerScore(p.id, parseInt(e.target.value) || 0)}
                        className="w-16 bg-transparent text-yellow-400 font-black text-right outline-none text-lg"
                      />
                    </div>
                    {resp ? (
                      <div className={`p-2.5 rounded-xl border ${resp.is_correct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                        <div className="flex justify-between items-end mb-1">
                          <p className={`text-[8px] font-black uppercase ${resp.is_correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {resp.is_correct ? 'CHÍNH XÁC' : 'SAI'}
                          </p>
                          <p className="text-[8px] font-mono text-white/40">{resp.response_time}ms</p>
                        </div>
                        <p className="text-xs font-bold text-white truncate italic">"{resp.answer}"</p>
                      </div>
                    ) : (
                      <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 animate-pulse">
                        <p className="text-[8px] text-slate-500 font-black uppercase">Đang suy nghĩ...</p>
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
