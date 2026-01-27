
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

  // Theo dõi câu trả lời thời gian thực từ bảng responses
  useEffect(() => {
    if (!matchId || gameState?.currentQuestionIndex === undefined) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (!currentQ) return;

    fetchResponses(currentQ.id);

    // Lắng nghe thay đổi ở bảng responses
    const channel = supabase
      .channel('realtime_responses')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'responses', 
        filter: `question_id=eq.${currentQ.id}` 
      }, () => {
        fetchResponses(currentQ.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
          if (next <= 0) {
            handleTimeUp();
            return 0;
          }
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

  const jumpToQuestion = (index: number) => {
    if (!gameState || index < 0 || index >= gameState.questions.length) return;
    const nextQ = gameState.questions[index];
    const timeLimit = nextQ.timeLimit || 30;
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

  const nextQuestion = () => {
    if (!gameState) return;
    const nextIdx = gameState.currentQuestionIndex + 1;
    if (nextIdx >= gameState.questions.length) {
      broadcastState({ ...gameState, status: GameStatus.FINISHED });
    } else {
      jumpToQuestion(nextIdx);
    }
  };

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">ĐANG TẢI...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
             <h1 className="text-4xl font-black text-yellow-400 font-mono">{gameState.matchCode}</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/manage/${code}`)} className="bg-slate-800 px-6 py-4 rounded-2xl font-bold">THIẾT LẬP</button>
            <button onClick={nextQuestion} className="bg-indigo-600 px-8 py-4 rounded-2xl font-black shadow-xl">
               {gameState.currentQuestionIndex === -1 ? 'BẮT ĐẦU' : 'CÂU TIẾP THEO'}
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-slate-900/50 p-10 rounded-[48px] border border-white/5 relative min-h-[400px]">
               {gameState.status === GameStatus.QUESTION_ACTIVE && (
                 <div className="absolute top-8 right-10 text-6xl font-black text-indigo-500 font-mono">{timeLeft}</div>
               )}
               {currentQ ? (
                 <>
                   <h2 className="text-4xl font-extrabold mb-10 leading-tight">{currentQ.content}</h2>
                   <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                   {gameState.status === GameStatus.SHOWING_RESULTS && (
                     <div className="mt-10 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                        <p className="text-3xl font-black text-emerald-400">Đáp án: {currentQ.correctAnswer}</p>
                     </div>
                   )}
                 </>
               ) : (
                 <div className="text-center py-20">
                    <h3 className="text-3xl font-black mb-2 text-slate-400">Sẵn sàng! Hãy nhấn "BẮT ĐẦU"</h3>
                 </div>
               )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 h-fit">
              <h3 className="font-black text-xl mb-6">Trạng Thái Trả Lời ({responses.length}/{gameState.players.length})</h3>
              <div className="space-y-4">
                {gameState.players.map(p => {
                  const resp = responses.find(r => r.player_id === p.id);
                  return (
                    <div key={p.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div>
                        <p className="font-black">{p.name}</p>
                        {resp ? (
                          <p className="text-[10px] text-emerald-400 font-bold">✓ Đã gửi ({resp.response_time/1000}s)</p>
                        ) : (
                          <p className="text-[10px] text-slate-600 font-bold">... Đang chờ</p>
                        )}
                      </div>
                      <p className="text-xl font-black text-yellow-400">{p.score}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameMaster;
