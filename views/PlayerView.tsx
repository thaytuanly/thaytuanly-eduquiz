
import React, { useState, useEffect } from 'react';
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
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const joinGame = async () => {
    if (!routeCode || !name || !matchId) return;

    // Check if player exists in this session
    const { data, error } = await supabase.from('players').insert([
      { match_id: matchId, name: name, score: 0 }
    ]).select().single();

    if (error) return alert("Không thể tham gia trận đấu!");
    
    setMyPlayerId(data.id);
    setJoined(true);
  };

  useEffect(() => {
    setSubmitted(false);
    setAnswer('');
  }, [gameState?.currentQuestionIndex]);

  const handleAnswerSubmit = async (value: string) => {
    if (!gameState || !myPlayerId || submitted) return;
    
    const now = Date.now();
    const startTime = (window as any).questionStartTime || now;
    const responseTime = now - startTime;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];

    let pointsToAdd = 0;
    if (currentQ.type === QuestionType.MCQ && value === currentQ.correctAnswer) {
      pointsToAdd = currentQ.points;
      // Bonus tốc độ
      const speedBonus = Math.max(0, Math.floor((currentQ.timeLimit - responseTime/1000) * 0.5));
      pointsToAdd += speedBonus;
    }

    setSubmitted(true);
    setAnswer(value);

    // Cập nhật DB
    await supabase.rpc('increment_score', { 
      player_id: myPlayerId, 
      add_points: pointsToAdd,
      ans: value,
      r_time: Math.floor(responseTime)
    });
    
    // Nếu RPC không có sẵn, dùng update thông thường (cần cẩn thận với race condition)
    if (pointsToAdd > 0) {
       const { data: p } = await supabase.from('players').select('score').eq('id', myPlayerId).single();
       await supabase.from('players').update({ 
         score: (p?.score || 0) + pointsToAdd,
         last_answer: value,
         response_time: Math.floor(responseTime)
       }).eq('id', myPlayerId);
    } else {
       await supabase.from('players').update({ 
         last_answer: value,
         response_time: Math.floor(responseTime)
       }).eq('id', myPlayerId);
    }
  };

  const handleBuzzer = async () => {
    if (!gameState || gameState.activeBuzzerPlayerId || submitted || !matchId) return;
    await supabase.from('matches').update({ active_buzzer_player_id: myPlayerId }).eq('id', matchId);
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-black text-center mb-8">EduQuiz <span className="text-indigo-600">Online</span></h1>
          <div className="space-y-4">
            <input value={routeCode} disabled className="w-full p-4 bg-slate-100 rounded-2xl text-center font-mono font-bold" />
            <input placeholder="Họ và tên của bạn..." value={name} onChange={e => setName(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold outline-none focus:border-indigo-500" />
            <button onClick={joinGame} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition">VÀO PHÒNG THI</button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="p-10 text-center font-black animate-pulse">ĐANG ĐỒNG BỘ...</div>;

  const currentQ = gameState.questions[gameState.currentQuestionIndex];
  const myData = gameState.players.find(p => p.id === myPlayerId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-lexend">
      <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">{name[0]?.toUpperCase()}</div>
          <span className="font-black text-slate-900">{name}</span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-indigo-600">{myData?.score || 0}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Điểm số</p>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col justify-center max-w-lg mx-auto w-full">
        {gameState.status === GameStatus.LOBBY && (
          <div className="text-center bg-white p-10 rounded-[40px] shadow-sm">
             <div className="text-6xl mb-6">🛋️</div>
             <h2 className="text-2xl font-black mb-2">Đã ở trong phòng chờ</h2>
             <p className="text-slate-400">Trận đấu sẽ bắt đầu khi giáo viên nhấn Bắt đầu</p>
          </div>
        )}

        {gameState.status === GameStatus.QUESTION_ACTIVE && currentQ && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="bg-yellow-400 px-4 py-1 rounded-full text-xs font-black">{gameState.timer}s còn lại</span>
              <h2 className="text-xl font-black mt-4 leading-tight">{currentQ.content}</h2>
              <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
            </div>

            {currentQ.type === QuestionType.MCQ && !submitted && (
              <div className="grid gap-3">
                {currentQ.options?.map((opt, i) => (
                  <button key={i} onClick={() => handleAnswerSubmit(opt)} className="p-5 text-left bg-white border-2 border-slate-100 hover:border-indigo-500 rounded-3xl font-bold flex items-center gap-4 transition-all active:scale-95 shadow-sm">
                    <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === QuestionType.SHORT_ANSWER && !submitted && (
              <div className="space-y-4">
                <input value={answer} onChange={e => setAnswer(e.target.value)} className="w-full p-6 text-xl text-center rounded-3xl border-2 focus:border-indigo-500 outline-none font-bold" placeholder="Nhập đáp án..." />
                <button onClick={() => handleAnswerSubmit(answer)} className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black text-xl shadow-lg">GỬI ĐÁP ÁN</button>
              </div>
            )}

            {currentQ.type === QuestionType.BUZZER && (
              <div className="flex justify-center py-10">
                {!gameState.activeBuzzerPlayerId ? (
                  <button onClick={handleBuzzer} className="w-48 h-48 bg-rose-600 rounded-full border-b-8 border-rose-800 text-white text-3xl font-black shadow-xl active:translate-y-2 active:border-b-0 transition-all">CHUÔNG</button>
                ) : (
                  <div className="p-8 bg-white rounded-3xl text-center border-4 border-amber-400 animate-pulse">
                     <p className="text-xl font-black text-amber-600">ĐANG CHỜ...</p>
                  </div>
                )}
              </div>
            )}

            {submitted && (
              <div className="text-center py-10 bg-white rounded-3xl border border-emerald-100 shadow-sm">
                 <div className="text-4xl mb-4">✅</div>
                 <h3 className="text-xl font-black">Hệ thống đã ghi nhận!</h3>
                 <p className="text-sm text-slate-400 italic">Câu trả lời: {answer}</p>
              </div>
            )}
          </div>
        )}

        {gameState.status === GameStatus.SHOWING_RESULTS && (
          <div className="text-center space-y-6">
             <h2 className="text-2xl font-black">KẾT QUẢ CÂU HỎI</h2>
             <div className="bg-slate-900 text-white p-6 rounded-3xl">
                <p className="text-xs uppercase text-slate-500 mb-1">Đáp án đúng</p>
                <p className="text-xl font-black text-emerald-400">{currentQ?.correctAnswer}</p>
             </div>
             <div className="space-y-3">
                {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => (
                  <div key={p.id} className={`flex justify-between p-4 rounded-2xl ${p.id === myPlayerId ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>
                     <span className="font-bold">{idx + 1}. {p.name}</span>
                     <span className="font-black">{p.score}</span>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PlayerView;
