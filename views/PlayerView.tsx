
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

  useEffect(() => {
    const savedId = localStorage.getItem(`edu_quiz_id_${routeCode}`);
    const savedName = localStorage.getItem(`edu_quiz_name_${routeCode}`);
    if (savedId && savedName) {
      setMyPlayerId(savedId);
      setName(savedName);
      setJoined(true);
    }
  }, [routeCode]);

  // Kiểm tra đáp án đã tồn tại khi chuyển câu hỏi
  useEffect(() => {
    if (joined && myPlayerId && gameState?.currentQuestionIndex !== undefined) {
      setSubmitted(false);
      setLocalAnswer('');
      (window as any).questionStartTime = Date.now();
      if (gameState.currentQuestionIndex >= 0) {
        checkExistingResponse();
      }
    }
  }, [gameState?.currentQuestionIndex, joined, myPlayerId]);

  // Đồng bộ đếm ngược cục bộ
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
      }, 100);

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
      alert("Hệ thống đang kết nối máy chủ, vui lòng đợi trong giây lát...");
      refresh();
      return;
    }
    if (!name.trim()) {
      alert("Vui lòng nhập tên của bạn!");
      return;
    }
    
    setLoading(true);
    try {
      const safeName = name.trim();
      const { data, error } = await supabase.from('players').insert([{ match_id: matchId, name: safeName, score: 0 }]).select().single();
      if (error) throw error;
      
      setMyPlayerId(data.id);
      setJoined(true);
      localStorage.setItem(`edu_quiz_id_${routeCode}`, data.id);
      localStorage.setItem(`edu_quiz_name_${routeCode}`, safeName);
    } catch (error: any) {
      alert("Lỗi tham gia: " + error.message);
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
      const startTime = (window as any).questionStartTime || Date.now();
      const responseTime = Math.max(0, Math.floor(Date.now() - startTime));
      
      const answerString = localAnswer.toString().trim().toLowerCase();
      const correctAnswerString = (currentQ.correctAnswer || "").toString().trim().toLowerCase();
      const isCorrect = answerString === correctAnswerString;
      const points = isCorrect ? (currentQ.points || 0) : 0;
      
      const { error: responseError } = await supabase.from('responses').upsert({
        match_id: matchId, 
        player_id: myPlayerId, 
        question_id: currentQ.id,
        answer: localAnswer.toString(), 
        is_correct: isCorrect, 
        response_time: responseTime, 
        points_earned: points
      }, { onConflict: 'player_id,question_id' });

      if (responseError) throw responseError;

      if (isCorrect && points > 0) {
        const { data: p } = await supabase.from('players').select('score').eq('id', myPlayerId).single();
        const newScore = (p?.score || 0) + points;
        await supabase.from('players').update({ score: newScore }).eq('id', myPlayerId);
      }

      setSubmitted(true);
    } catch (error: any) {
      alert("Lỗi gửi đáp án: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuzzer = async () => {
    if (!gameState || !myPlayerId || !matchId || gameState.status !== GameStatus.QUESTION_ACTIVE || localTimeLeft <= 0) return;
    const { data: latestMatch } = await supabase.from('matches').select('buzzer_p1_id, buzzer_p2_id').eq('id', matchId).single();
    if (latestMatch?.buzzer_p1_id === myPlayerId || latestMatch?.buzzer_p2_id === myPlayerId) return;

    const now = Date.now();
    try {
      if (!latestMatch?.buzzer_p1_id) {
        await supabase.from('matches').update({ buzzer_p1_id: myPlayerId, buzzer_t1: now }).eq('id', matchId);
      } else if (!latestMatch?.buzzer_p2_id) {
        await supabase.from('matches').update({ buzzer_p2_id: myPlayerId, buzzer_t2: now }).eq('id', matchId);
      }
      refresh();
    } catch (e) {
      console.error("Buzzer error:", e);
    }
  };

  const buzzerRank = useMemo(() => {
    if (gameState?.buzzerP1Id === myPlayerId) return 1;
    if (gameState?.buzzerP2Id === myPlayerId) return 2;
    return null;
  }, [gameState?.buzzerP1Id, gameState?.buzzerP2Id, myPlayerId]);

  if (!joined) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6 font-inter">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-500 border-b-8 border-indigo-100">
          <h1 className="text-3xl font-black text-center mb-8 tracking-tighter uppercase">EduQuiz <span className="text-indigo-600">Pro</span></h1>
          <div className="space-y-4">
            <input 
              placeholder="Nhập họ tên của bạn..." 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold outline-none shadow-inner" 
              onKeyPress={(e) => e.key === 'Enter' && joinGame()}
            />
            <button onClick={joinGame} disabled={loading} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition disabled:opacity-50">
              {loading ? 'ĐANG KẾT NỐI...' : 'THAM GIA NGAY'}
            </button>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Mã trận đấu: {routeCode}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-black text-indigo-600 animate-pulse uppercase tracking-widest">Đang tải trận đấu...</div>;

  const currentQ = gameState.questions[gameState.currentQuestionIndex];
  const myPlayerData = gameState.players.find(p => p.id === myPlayerId);
  const isTimeUp = localTimeLeft <= 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-36 font-inter">
      <header className="bg-white px-6 py-4 shadow-md flex justify-between items-center sticky top-0 z-30 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-inner">{name ? name[0]?.toUpperCase() : '?'}</div>
          <span className="font-black text-slate-900 truncate max-w-[150px]">{name}</span>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm flex flex-col items-end">
          <span className="text-2xl font-black text-emerald-600 leading-none">{myPlayerData?.score || 0}</span>
          <p className="text-[8px] text-emerald-400 font-black uppercase tracking-tighter">Điểm của bạn</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {gameState.status === GameStatus.QUESTION_ACTIVE && currentQ ? (
          <div className="flex flex-col flex-1 animate-in slide-in-from-bottom-6 duration-500">
            <div className="h-[30vh] bg-black relative flex items-center justify-center overflow-hidden">
               <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
               <div className={`absolute top-4 right-4 bg-white/20 backdrop-blur-xl px-5 py-2 rounded-2xl text-2xl font-black text-white font-mono border border-white/20 ${isTimeUp ? 'bg-rose-600/50' : localTimeLeft < 10 ? 'bg-rose-500/50 animate-pulse' : ''}`}>
                 {localTimeLeft}s
               </div>
            </div>
            
            <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
              <div className="text-center">
                <span className="bg-indigo-600 text-white px-6 py-1.5 rounded-full text-xs font-black uppercase mb-3 inline-block shadow-lg">Câu hỏi {gameState.currentQuestionIndex + 1}</span>
                <h2 className="text-3xl font-extrabold text-slate-800 leading-tight">{currentQ.content}</h2>
              </div>
              
              {!submitted ? (
                <div className="space-y-4">
                  {isTimeUp ? (
                    <div className="bg-rose-50 p-10 rounded-[32px] text-center border-2 border-rose-100 shadow-inner animate-in zoom-in">
                      <p className="text-rose-500 font-black text-2xl uppercase tracking-widest">HẾT GIỜ!</p>
                      <p className="text-rose-300 font-medium text-sm mt-2">Bạn không thể trả lời câu hỏi này nữa.</p>
                    </div>
                  ) : (
                    <>
                      {currentQ.type === QuestionType.MCQ && (
                        <div className="grid grid-cols-1 gap-4">
                          {currentQ.options?.map((opt, i) => (
                            <button 
                              key={i} 
                              onClick={() => setLocalAnswer(opt)}
                              className={`p-6 text-left border-4 rounded-[28px] font-bold transition-all flex items-center gap-6 ${localAnswer === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xl scale-[1.02]' : 'border-white bg-white hover:border-slate-200 shadow-sm'}`}
                            >
                              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${localAnswer === opt ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>{String.fromCharCode(65+i)}</span>
                              <span className="text-xl">{opt}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {currentQ.type === QuestionType.SHORT_ANSWER && (
                        <div className="bg-white p-2 rounded-[32px] shadow-lg border-4 border-white focus-within:border-indigo-100 transition-all">
                          <input value={localAnswer} onChange={e => setLocalAnswer(e.target.value)} className="w-full p-8 bg-transparent font-black text-2xl text-center outline-none" placeholder="Gõ đáp án vào đây..." autoFocus />
                        </div>
                      )}
                      <button onClick={handleConfirmAnswer} disabled={!localAnswer || loading} className="w-full text-white py-6 rounded-[32px] font-black text-2xl shadow-2xl bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 disabled:opacity-50 transition active:scale-95">
                        {loading ? 'ĐANG GỬI...' : 'XÁC NHẬN ĐÁP ÁN'}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-[48px] text-center border-4 border-emerald-50 shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16"></div>
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner shadow-emerald-200">✓</div>
                  <p className="text-slate-400 font-black uppercase text-xs mb-3 tracking-widest">Hệ thống đã nhận đáp án</p>
                  <p className="text-4xl font-black text-indigo-600 italic leading-tight">"{localAnswer}"</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-8 animate-in fade-in duration-700">
             <div className="text-9xl animate-bounce drop-shadow-2xl">⏳</div>
             <div className="space-y-2">
               <h2 className="text-4xl font-black text-slate-900 uppercase tracking-widest">Sẵn sàng!</h2>
               <p className="text-slate-400 font-medium italic">Vui lòng chờ Quản lý bắt đầu trận đấu hoặc chuyển câu hỏi.</p>
             </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-2xl border-t border-slate-200 flex items-center justify-between gap-6 z-40 shadow-2xl">
        <button 
          onClick={handleBuzzer}
          disabled={!!buzzerRank || (!!gameState.buzzerP1Id && !!gameState.buzzerP2Id) || gameState.status !== GameStatus.QUESTION_ACTIVE || isTimeUp}
          className={`flex-1 py-7 rounded-[35px] font-black text-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 ${
            buzzerRank ? 'bg-slate-200 text-slate-400 border-4 border-white' : (!!gameState.buzzerP1Id && !!gameState.buzzerP2Id || isTimeUp) ? 'bg-slate-300 text-slate-500 opacity-50 border-4 border-white' : 'bg-rose-600 text-white animate-pulse border-4 border-rose-400'
          }`}
        >
          {buzzerRank ? 'ĐÃ NHẤN' : 'NHẤN CHUÔNG!'}
        </button>

        {buzzerRank && (
          <div className={`w-28 h-24 rounded-[35px] flex flex-col items-center justify-center text-white shadow-2xl border-4 border-white ${buzzerRank === 1 ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-200' : 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-200'}`}>
            <span className="text-[10px] font-black uppercase leading-none mb-1 text-white/80 tracking-widest">Hạng</span>
            <span className="text-5xl font-black font-mono">#{buzzerRank}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerView;
