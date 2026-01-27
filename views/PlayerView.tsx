
import React, { useState, useEffect, useMemo } from 'react';
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
  const { gameState, matchId } = useGameState('PLAYER', routeCode);
  
  const [localAnswer, setLocalAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);

  useEffect(() => {
    const savedId = localStorage.getItem(`eduquiz_player_id_${routeCode}`);
    const savedName = localStorage.getItem(`eduquiz_player_name_${routeCode}`);
    if (savedId && savedName) {
      setMyPlayerId(savedId);
      setName(savedName);
      setJoined(true);
    }
  }, [routeCode]);

  // Lắng nghe dữ liệu chuông từ trận đấu
  useEffect(() => {
    if (!matchId) return;
    const fetchMatch = async () => {
      const { data } = await supabase.from('matches').select('*').eq('id', matchId).single();
      setMatchData(data);
    };
    fetchMatch();

    const matchSub = supabase.channel(`player_match_sub_${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
        setMatchData(payload.new);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(matchSub); };
  }, [matchId]);

  useEffect(() => {
    if (joined && myPlayerId && gameState?.currentQuestionIndex !== undefined) {
      checkExistingResponse();
    }
  }, [joined, myPlayerId, gameState?.currentQuestionIndex]);

  const checkExistingResponse = async () => {
    if (!gameState?.questions || gameState.currentQuestionIndex < 0) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (!currentQ) return;
    
    const { data } = await supabase
      .from('responses')
      .select('answer')
      .eq('player_id', myPlayerId)
      .eq('question_id', currentQ.id)
      .single();

    if (data) { 
      setLocalAnswer(data.answer); 
      setSubmitted(true); 
    } else { 
      setSubmitted(false); 
      setLocalAnswer(''); 
    }
  };

  const joinGame = async () => {
    if (!routeCode || !name || !matchId) return;
    setLoading(true);
    const { data, error } = await supabase.from('players').insert([{ match_id: matchId, name: name, score: 0 }]).select().single();
    if (error) { alert("Lỗi tham gia!"); setLoading(false); return; }
    setMyPlayerId(data.id);
    setJoined(true);
    localStorage.setItem(`eduquiz_player_id_${routeCode}`, data.id);
    localStorage.setItem(`eduquiz_player_name_${routeCode}`, name);
    setLoading(false);
  };

  const handleConfirmAnswer = async () => {
    if (!gameState || !myPlayerId || submitted || !matchId || !localAnswer) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (!currentQ) return;

    const responseTime = Date.now() - (window as any).questionStartTime;
    const isCorrect = localAnswer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();
    let points = isCorrect ? currentQ.points : 0;
    
    setSubmitted(true);
    
    // Lưu vào bảng responses
    const { error } = await supabase.from('responses').upsert({
      match_id: matchId, 
      player_id: myPlayerId, 
      question_id: currentQ.id,
      answer: localAnswer, 
      is_correct: isCorrect, 
      response_time: responseTime, 
      points_earned: points
    });

    if (error) {
      console.error("Lỗi gửi bài:", error);
      setSubmitted(false);
      return;
    }

    // Tự động cộng điểm vào bảng players
    const { data: p } = await supabase.from('players').select('score').eq('id', myPlayerId).single();
    await supabase.from('players').update({ score: (p?.score || 0) + points }).eq('id', myPlayerId);
  };

  const handleBuzzer = async () => {
    if (!gameState || !myPlayerId || !matchData || gameState.status !== GameStatus.QUESTION_ACTIVE) return;
    
    // Nếu chính mình đã bấm rồi thì không làm gì
    if (matchData.buzzer_p1_id === myPlayerId || matchData.buzzer_p2_id === myPlayerId) return;

    const now = Date.now();
    
    if (!matchData.buzzer_p1_id) {
      await supabase.from('matches').update({ buzzer_p1_id: myPlayerId, buzzer_t1: now }).eq('id', matchId);
    } else if (!matchData.buzzer_p2_id) {
      await supabase.from('matches').update({ buzzer_p2_id: myPlayerId, buzzer_t2: now }).eq('id', matchId);
    } else {
      alert("Đã đủ 2 người bấm nhanh nhất!");
    }
  };

  const buzzerInfo = useMemo(() => {
    if (!matchData || !myPlayerId) return { rank: null, full: false };
    if (matchData.buzzer_p1_id === myPlayerId) return { rank: 1, full: false };
    if (matchData.buzzer_p2_id === myPlayerId) return { rank: 2, full: false };
    const full = !!(matchData.buzzer_p1_id && matchData.buzzer_p2_id);
    return { rank: null, full };
  }, [matchData, myPlayerId]);

  if (!joined) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-black text-center mb-8">EduQuiz <span className="text-indigo-600">Pro</span></h1>
          <div className="space-y-4">
            <input placeholder="Họ và tên..." value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold outline-none" />
            <button onClick={joinGame} disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition">
              {loading ? 'ĐANG VÀO...' : 'VÀO THI ĐẤU'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="min-h-screen flex items-center justify-center font-black text-indigo-600">ĐANG TẢI...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];
  const myPlayerData = gameState.players.find(p => p.id === myPlayerId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-36">
      <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-inner">{name[0]?.toUpperCase()}</div>
          <span className="font-black text-slate-900 truncate max-w-[120px]">{name}</span>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 text-right">
          <span className="text-2xl font-black text-indigo-600 leading-none">{myPlayerData?.score || 0}</span>
          <p className="text-[8px] text-indigo-400 font-black uppercase tracking-widest">Điểm</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {gameState.status === GameStatus.QUESTION_ACTIVE && currentQ ? (
          <div className="flex flex-col flex-1">
            {/* 1/3 Media Frame - Top */}
            <div className="h-[35vh] bg-black relative flex items-center justify-center overflow-hidden">
               <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
               <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest">Media Frame</div>
            </div>
            
            <div className="p-6 space-y-6 max-w-xl mx-auto w-full">
              <div className="text-center">
                <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase mb-4 inline-block">CÂU HỎI {gameState.currentQuestionIndex + 1}</span>
                <h2 className="text-2xl font-extrabold text-slate-800 leading-tight">{currentQ.content}</h2>
              </div>
              
              {!submitted ? (
                <div className="space-y-4">
                  {currentQ.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-1 gap-3">
                      {currentQ.options?.map((opt, i) => (
                        <button 
                          key={i} 
                          onClick={() => setLocalAnswer(opt)}
                          className={`p-5 text-left border-2 rounded-[24px] font-bold transition-all flex items-center gap-4 ${localAnswer === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg shadow-indigo-100' : 'border-white bg-white hover:border-slate-200'}`}
                        >
                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${localAnswer === opt ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{String.fromCharCode(65+i)}</span>
                          <span className="text-lg">{opt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {currentQ.type === QuestionType.SHORT_ANSWER && (
                    <div className="bg-white p-2 rounded-[28px] shadow-sm border border-slate-200">
                      <input 
                        value={localAnswer} 
                        onChange={e => setLocalAnswer(e.target.value)} 
                        className="w-full p-6 bg-transparent font-black text-2xl text-center outline-none"
                        placeholder="Nhập câu trả lời..."
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleConfirmAnswer}
                    disabled={!localAnswer || loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-[28px] font-black text-xl shadow-xl shadow-emerald-100 transition active:scale-95 disabled:opacity-50"
                  >
                    XÁC NHẬN GỬI
                  </button>
                </div>
              ) : (
                <div className="bg-white p-10 rounded-[40px] text-center border-2 border-emerald-100 shadow-2xl">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✓</div>
                  <p className="text-slate-400 font-bold uppercase text-[10px] mb-2 tracking-widest">Đáp án đã gửi</p>
                  <p className="text-3xl font-black text-indigo-600">"{localAnswer}"</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-6">
             <div className="text-8xl animate-bounce">⏳</div>
             <h2 className="text-3xl font-black text-slate-800 uppercase tracking-widest">Đang chờ câu hỏi...</h2>
          </div>
        )}
      </main>

      {/* Buzzer Area - Luôn hiển thị */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200 flex items-center justify-between gap-6 z-20">
        <button 
          onClick={handleBuzzer}
          disabled={!!buzzerInfo.rank || buzzerInfo.full || gameState.status !== GameStatus.QUESTION_ACTIVE}
          className={`flex-1 py-6 rounded-[32px] font-black text-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
            buzzerInfo.rank 
            ? 'bg-slate-200 text-slate-400 shadow-none' 
            : buzzerInfo.full 
              ? 'bg-slate-300 text-slate-500 opacity-50 cursor-not-allowed'
              : 'bg-rose-600 text-white active:bg-rose-700 shadow-rose-200'
          }`}
        >
          {buzzerInfo.rank ? 'ĐÃ NHẤN' : (buzzerInfo.full ? 'ĐÃ ĐỦ 2 NGƯỜI' : 'NHẤN CHUÔNG!') }
        </button>

        {buzzerInfo.rank && (
          <div className="w-24 h-20 bg-yellow-400 rounded-[32px] flex flex-col items-center justify-center text-indigo-950 shadow-lg border-4 border-white animate-in zoom-in duration-300">
            <span className="text-[10px] font-black uppercase leading-none">Thứ</span>
            <span className="text-4xl font-black font-mono">#{buzzerInfo.rank}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerView;
