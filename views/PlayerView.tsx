
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { supabase } from '../lib/supabase';
import { GameStatus, QuestionType } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';

const PlayerView: React.FC = () => {
  const { code: routeCode } = useParams<{ code: string }>();
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const { gameState, matchId, refresh, questionStartedAt } = useGameState('PLAYER', routeCode);
  
  const [localAnswer, setLocalAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localTimeLeft, setLocalTimeLeft] = useState(0);
  const timerIntervalRef = useRef<any>(null);

  // Khôi phục phiên làm việc
  useEffect(() => {
    const savedId = localStorage.getItem(`edu_quiz_id_${routeCode}`);
    const savedName = localStorage.getItem(`edu_quiz_name_${routeCode}`);
    if (savedId && savedName) {
      setMyPlayerId(savedId);
      setName(savedName);
      setJoined(true);
    }
  }, [routeCode]);

  // RESET KHI CHUYỂN CÂU HỎI (Quan trọng nhất để không phải reload)
  useEffect(() => {
    if (joined && myPlayerId && gameState?.currentQuestionIndex !== undefined) {
      setSubmitted(false);
      setLocalAnswer('');
      setLocalTimeLeft(0);
      
      // Kiểm tra xem câu hỏi này mình đã làm chưa (phòng trường hợp rớt mạng vào lại)
      if (gameState.currentQuestionIndex >= 0) {
        checkExistingResponse();
      }
    }
  }, [gameState?.currentQuestionIndex, joined, myPlayerId]);

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
        setLocalTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(timerIntervalRef.current);
        }
      }, 500);

      return () => clearInterval(timerIntervalRef.current);
    } else {
      setLocalTimeLeft(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [gameState?.status, questionStartedAt, gameState?.currentQuestionIndex]);

  const checkExistingResponse = async () => {
    if (!gameState?.questions || gameState.currentQuestionIndex < 0 || !myPlayerId) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (!currentQ) return;
    
    try {
      const { data } = await supabase
        .from('responses')
        .select('answer')
        .eq('player_id', myPlayerId)
        .eq('question_id', currentQ.id)
        .maybeSingle();

      if (data) { 
        setLocalAnswer(data.answer || ''); 
        setSubmitted(true); 
      }
    } catch (e) {
      console.error("Sync error:", e);
    }
  };

  const joinGame = async () => {
    if (!matchId) {
      await refresh();
      if (!matchId) {
        alert("Chưa tìm thấy phòng. Vui lòng thử lại.");
        return;
      }
    }
    
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('players').insert([{ 
        match_id: matchId, 
        name: name.trim(), 
        score: 0 
      }]).select().single();
      
      if (error) throw error;
      setMyPlayerId(data.id);
      setJoined(true);
      localStorage.setItem(`edu_quiz_id_${routeCode}`, data.id);
      localStorage.setItem(`edu_quiz_name_${routeCode}`, name.trim());
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAnswer = async () => {
    if (!gameState || !myPlayerId || submitted || !matchId || !localAnswer || localTimeLeft <= 0 || gameState.status !== GameStatus.QUESTION_ACTIVE) return;
    
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (!currentQ) return;

    setLoading(true);
    try {
      const startTime = new Date(questionStartedAt!).getTime();
      const responseTime = Math.max(0, Math.floor(Date.now() - startTime));
      
      const answerString = localAnswer.toString().trim().toLowerCase();
      const correctAnswerString = (currentQ.correctAnswer || "").toString().trim().toLowerCase();
      const isCorrect = answerString === correctAnswerString;
      const points = isCorrect ? (currentQ.points || 0) : 0;
      
      const { error } = await supabase.from('responses').upsert({
        match_id: matchId, 
        player_id: myPlayerId, 
        question_id: currentQ.id,
        answer: localAnswer.toString(), 
        is_correct: isCorrect, 
        response_time: responseTime, 
        points_earned: points
      }, { onConflict: 'player_id,question_id' });

      if (error) throw error;

      if (isCorrect && points > 0) {
        const { data: p } = await supabase.from('players').select('score').eq('id', myPlayerId).single();
        await supabase.from('players').update({ score: (p?.score || 0) + points }).eq('id', myPlayerId);
      }
      setSubmitted(true);
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuzzer = async () => {
    if (!gameState || !myPlayerId || !matchId || gameState.status !== GameStatus.QUESTION_ACTIVE || localTimeLeft <= 0) return;
    const now = Date.now();
    try {
      const { data: m } = await supabase.from('matches').select('buzzer_p1_id').eq('id', matchId).single();
      if (!m?.buzzer_p1_id) {
        await supabase.from('matches').update({ buzzer_p1_id: myPlayerId, buzzer_t1: now }).eq('id', matchId);
      } else {
        await supabase.from('matches').update({ buzzer_p2_id: myPlayerId, buzzer_t2: now }).eq('id', matchId);
      }
    } catch (e) { console.error(e); }
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-black text-center mb-8 uppercase">EduQuiz <span className="text-indigo-600">Pro</span></h1>
          <div className="space-y-4">
            <input placeholder="Tên của bạn..." value={name} onChange={e => setName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold outline-none" />
            <button onClick={joinGame} disabled={loading} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl">THAM GIA</button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="min-h-screen flex items-center justify-center font-black">ĐANG TẢI...</div>;

  const currentQ = gameState.questions[gameState.currentQuestionIndex];
  const myPlayerData = gameState.players.find(p => p.id === myPlayerId);
  const isTimeUp = localTimeLeft <= 0;
  const buzzerRank = gameState.buzzerP1Id === myPlayerId ? 1 : gameState.buzzerP2Id === myPlayerId ? 2 : null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-40">
      <header className="bg-white px-6 py-4 shadow flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">{name[0]}</div>
          <span className="font-black text-slate-900">{name}</span>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-2xl text-emerald-600 font-black text-xl">{myPlayerData?.score || 0} đ</div>
      </header>

      <main className="flex-1 flex flex-col">
        {gameState.status === GameStatus.QUESTION_ACTIVE && currentQ ? (
          <div className="flex flex-col flex-1">
            <div className="h-[30vh] bg-black relative flex items-center justify-center overflow-hidden">
               <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
               <div className={`absolute top-4 right-4 px-5 py-2 rounded-2xl text-2xl font-black text-white border border-white/20 bg-black/50`}>
                 {localTimeLeft}s
               </div>
            </div>
            
            <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
              <div className="text-center">
                <span className="bg-indigo-600 text-white px-6 py-1 rounded-full text-xs font-black uppercase mb-3 inline-block">Câu {gameState.currentQuestionIndex + 1}</span>
                <h2 className="text-3xl font-extrabold text-slate-800 leading-tight">{currentQ.content}</h2>
              </div>
              
              {!submitted && !isTimeUp ? (
                <div className="space-y-4">
                  {currentQ.type === QuestionType.MCQ ? (
                    <div className="grid grid-cols-1 gap-4">
                      {currentQ.options?.map((opt, i) => (
                        <button key={i} onClick={() => setLocalAnswer(opt)} className={`p-6 text-left border-4 rounded-[28px] font-bold flex items-center gap-6 ${localAnswer === opt ? 'border-indigo-600 bg-indigo-50 shadow-lg' : 'bg-white border-white shadow-sm'}`}>
                          <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${localAnswer === opt ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>{String.fromCharCode(65+i)}</span>
                          <span className="text-xl">{opt}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input value={localAnswer} onChange={e => setLocalAnswer(e.target.value)} className="w-full p-8 bg-white rounded-[32px] font-black text-2xl text-center shadow-lg border-4 border-white focus:border-indigo-100 outline-none" placeholder="Gõ đáp án..." />
                  )}
                  <button onClick={handleConfirmAnswer} disabled={!localAnswer || loading} className="w-full text-white py-6 rounded-[32px] font-black text-2xl bg-emerald-500 shadow-2xl transition active:scale-95 disabled:opacity-50">GỬI ĐÁP ÁN</button>
                </div>
              ) : (
                <div className="bg-white p-12 rounded-[48px] text-center border-4 border-emerald-50 shadow-2xl">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✓</div>
                  <p className="text-slate-400 font-black uppercase text-xs mb-3 tracking-widest">{isTimeUp ? 'Hết giờ' : 'Đã gửi đáp án'}</p>
                  <p className="text-4xl font-black text-indigo-600 italic leading-tight">"{localAnswer || "---"}"</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-8">
             <div className="text-9xl animate-bounce">🎮</div>
             <h2 className="text-4xl font-black text-slate-900 uppercase">Vui lòng chờ...</h2>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t flex items-center justify-between gap-6 z-40">
        <button onClick={handleBuzzer} disabled={!!buzzerRank || isTimeUp || gameState.status !== GameStatus.QUESTION_ACTIVE} className={`flex-1 py-7 rounded-[35px] font-black text-3xl transition-all active:scale-95 ${buzzerRank ? 'bg-slate-200 text-slate-400' : 'bg-rose-600 text-white shadow-xl shadow-rose-200'}`}>
          {buzzerRank ? `ĐÃ NHẤN #${buzzerRank}` : 'BẤM CHUÔNG!'}
        </button>
      </div>
    </div>
  );
};

export default PlayerView;
