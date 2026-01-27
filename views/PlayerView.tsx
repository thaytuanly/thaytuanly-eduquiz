
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem(`eduquiz_player_id_${routeCode}`);
    const savedName = localStorage.getItem(`eduquiz_player_name_${routeCode}`);
    if (savedId && savedName) {
      setMyPlayerId(savedId);
      setName(savedName);
      setJoined(true);
    }
  }, [routeCode]);

  // Kiểm tra xem đã trả lời câu hỏi hiện tại chưa (Khi reconnect)
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
      setAnswer(data.answer);
      setSubmitted(true);
    } else {
      setSubmitted(false);
      setAnswer('');
    }
  };

  const joinGame = async () => {
    if (!routeCode || !name || !matchId) return;
    setLoading(true);
    const { data, error } = await supabase.from('players').insert([{ match_id: matchId, name: name, score: 0 }]).select().single();
    if (error) {
      alert("Lỗi tham gia!");
      setLoading(false);
      return;
    }
    setMyPlayerId(data.id);
    setJoined(true);
    localStorage.setItem(`eduquiz_player_id_${routeCode}`, data.id);
    localStorage.setItem(`eduquiz_player_name_${routeCode}`, name);
    setLoading(false);
  };

  const handleAnswerSubmit = async (value: string) => {
    if (!gameState || !myPlayerId || submitted || !matchId) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (!currentQ) return;

    const responseTime = Date.now() - (window as any).questionStartTime;
    const isCorrect = value.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();
    let points = isCorrect ? currentQ.points : 0;
    
    // Thưởng tốc độ
    if (isCorrect && responseTime < (currentQ.timeLimit * 1000)) {
       points += Math.floor(((currentQ.timeLimit * 1000 - responseTime) / 1000) * 0.1);
    }

    setSubmitted(true);
    setAnswer(value);

    // 1. Lưu vào lịch sử responses
    await supabase.from('responses').upsert({
      match_id: matchId,
      player_id: myPlayerId,
      question_id: currentQ.id,
      answer: value,
      is_correct: isCorrect,
      response_time: responseTime,
      points_earned: points
    });

    // 2. Cập nhật tổng điểm trong bảng players
    const { data: p } = await supabase.from('players').select('score').eq('id', myPlayerId).single();
    await supabase.from('players').update({ score: (p?.score || 0) + points }).eq('id', myPlayerId);
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-black text-center mb-8">EduQuiz <span className="text-indigo-600">Online</span></h1>
          <div className="space-y-4">
            <input placeholder="Nhập tên..." value={name} onChange={e => setName(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold" />
            <button onClick={joinGame} disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg transition">
              {loading ? 'ĐANG VÀO...' : 'VÀO THI ĐẤU'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="min-h-screen flex items-center justify-center font-black text-indigo-600">ĐANG TẢI...</div>;

  const currentQ = gameState.questions[gameState.currentQuestionIndex];
  const myData = gameState.players.find(p => p.id === myPlayerId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">{name[0]?.toUpperCase()}</div>
          <span className="font-black text-slate-900">{name}</span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-indigo-600">{myData?.score || 0}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Điểm</p>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col justify-center max-w-lg mx-auto w-full">
        {gameState.status === GameStatus.LOBBY && (
          <div className="text-center bg-white p-12 rounded-[48px] shadow-sm border border-slate-100">
             <div className="text-7xl mb-6">🏁</div>
             <h2 className="text-2xl font-black mb-2">Đang chờ bắt đầu...</h2>
          </div>
        )}

        {gameState.status === GameStatus.QUESTION_ACTIVE && currentQ && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-slate-800 leading-tight mb-6">{currentQ.content}</h2>
              <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
            </div>
            {currentQ.type === QuestionType.MCQ && !submitted && (
              <div className="grid gap-4">
                {currentQ.options?.map((opt, i) => (
                  <button key={i} onClick={() => handleAnswerSubmit(opt)} className="p-5 text-left bg-white border-2 border-slate-100 rounded-3xl font-bold flex items-center gap-4 active:scale-95 transition-all">
                    <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black">{String.fromCharCode(65 + i)}</span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            )}
            {submitted && (
              <div className="text-center py-16 bg-white rounded-[40px] border border-emerald-100 shadow-sm">
                 <div className="text-6xl mb-6">✅</div>
                 <h3 className="text-2xl font-black text-slate-800">Đã gửi đáp án</h3>
                 <p className="text-slate-400 font-medium">Bạn đã chọn: <span className="text-indigo-600 font-bold">{answer}</span></p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlayerView;
