
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

  useEffect(() => {
    const savedId = localStorage.getItem(`eduquiz_player_id_${routeCode}`);
    const savedName = localStorage.getItem(`eduquiz_player_name_${routeCode}`);
    if (savedId && savedName) {
      setMyPlayerId(savedId);
      setName(savedName);
      setJoined(true);
    }
  }, [routeCode]);

  useEffect(() => {
    if (joined && myPlayerId && gameState?.currentQuestionIndex !== undefined) {
      checkExistingResponse();
    }
  }, [joined, myPlayerId, gameState?.currentQuestionIndex]);

  const checkExistingResponse = async () => {
    if (!gameState?.questions || gameState.currentQuestionIndex < 0) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (!currentQ) return;
    const { data } = await supabase.from('responses').select('answer').eq('player_id', myPlayerId).eq('question_id', currentQ.id).single();
    if (data) { setLocalAnswer(data.answer); setSubmitted(true); } 
    else { setSubmitted(false); setLocalAnswer(''); }
  };

  const joinGame = async () => {
    if (!routeCode || !name || !matchId) return;
    setLoading(true);
    const { data, error } = await supabase.from('players').insert([{ match_id: matchId, name: name, score: 0 }]).select().single();
    if (error) { alert("Lỗi tham gia!"); setLoading(false); return; }
    setMyPlayerId(data.id); setJoined(true);
    localStorage.setItem(`eduquiz_player_id_${routeCode}`, data.id);
    localStorage.setItem(`eduquiz_player_name_${routeCode}`, name);
    setLoading(false);
  };

  const handleConfirmAnswer = async () => {
    if (!gameState || !myPlayerId || submitted || !matchId || !localAnswer) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    const responseTime = Date.now() - (window as any).questionStartTime;
    const isCorrect = localAnswer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();
    let points = isCorrect ? currentQ.points : 0;
    
    setSubmitted(true);
    await supabase.from('responses').upsert({
      match_id: matchId, player_id: myPlayerId, question_id: currentQ.id,
      answer: localAnswer, is_correct: isCorrect, response_time: responseTime, points_earned: points
    });
    const { data: p } = await supabase.from('players').select('score').eq('id', myPlayerId).single();
    await supabase.from('players').update({ score: (p?.score || 0) + points }).eq('id', myPlayerId);
  };

  const handleBuzzer = async () => {
    if (!gameState || !myPlayerId) return;
    const myData = gameState.players.find(p => p.id === myPlayerId);
    if (myData?.buzzer_time) return; // Đã bấm rồi

    await supabase.from('players').update({ buzzer_time: Date.now() }).eq('id', myPlayerId);
  };

  const buzzerRank = useMemo(() => {
    if (!gameState || !myPlayerId) return null;
    const myData = gameState.players.find(p => p.id === myPlayerId);
    if (!myData?.buzzer_time) return null;

    const sorted = gameState.players
      .filter(p => !!p.buzzer_time)
      .sort((a, b) => Number(a.buzzer_time) - Number(b.buzzer_time));
    
    return sorted.findIndex(p => p.id === myPlayerId) + 1;
  }, [gameState?.players, myPlayerId]);

  if (!joined) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-black text-center mb-8">EduQuiz <span className="text-indigo-600">Online</span></h1>
          <input placeholder="Nhập tên..." value={name} onChange={e => setName(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold mb-4" />
          <button onClick={joinGame} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg">VÀO THI ĐẤU</button>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="min-h-screen flex items-center justify-center font-black text-indigo-600">ĐANG TẢI...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];
  const myData = gameState.players.find(p => p.id === myPlayerId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-32">
      <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">{name[0]}</div>
          <span className="font-bold truncate max-w-[100px]">{name}</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-indigo-600">{myData?.score || 0}</span>
          <p className="text-[8px] text-slate-400 font-bold uppercase">Điểm</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {gameState.status === GameStatus.QUESTION_ACTIVE && currentQ && (
          <div className="flex flex-col flex-1">
            <div className="h-[30vh] bg-black/5 border-b">
              <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
            </div>
            
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-bold text-slate-800 text-center">{currentQ.content}</h2>
              
              {!submitted ? (
                <div className="space-y-4">
                  {currentQ.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-1 gap-3">
                      {currentQ.options?.map((opt, i) => (
                        <button 
                          key={i} 
                          onClick={() => setLocalAnswer(opt)}
                          className={`p-4 text-left border-2 rounded-2xl font-bold transition-all ${localAnswer === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white'}`}
                        >
                          <span className="mr-3 opacity-30">{String.fromCharCode(65+i)}.</span> {opt}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {currentQ.type === QuestionType.SHORT_ANSWER && (
                    <input 
                      value={localAnswer} 
                      onChange={e => setLocalAnswer(e.target.value)} 
                      className="w-full p-4 border-2 rounded-2xl font-bold text-center"
                      placeholder="Nhập câu trả lời..."
                    />
                  )}

                  <button 
                    onClick={handleConfirmAnswer}
                    disabled={!localAnswer}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg disabled:opacity-50"
                  >
                    XÁC NHẬN ĐÁP ÁN
                  </button>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl text-center border-2 border-emerald-100">
                  <p className="text-slate-400 font-bold uppercase text-[10px] mb-2">Đã nộp</p>
                  <p className="text-2xl font-black text-indigo-600">{localAnswer}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Buzzer Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t flex items-center justify-between gap-4">
        <button 
          onClick={handleBuzzer}
          disabled={!!buzzerRank || gameState.status !== GameStatus.QUESTION_ACTIVE}
          className={`flex-1 py-4 rounded-2xl font-black text-xl shadow-xl transition-all active:scale-95 ${buzzerRank ? 'bg-slate-200 text-slate-400 shadow-none' : 'bg-rose-600 text-white active:bg-rose-700'}`}
        >
          {buzzerRank ? 'ĐÃ BẤM CHUÔNG' : 'BẤM CHUÔNG!'}
        </button>
        {buzzerRank && (
          <div className="w-20 h-16 bg-yellow-400 rounded-2xl flex flex-col items-center justify-center text-indigo-950 shadow-lg">
            <span className="text-[8px] font-black uppercase">Hạng</span>
            <span className="text-2xl font-black">#{buzzerRank}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerView;
