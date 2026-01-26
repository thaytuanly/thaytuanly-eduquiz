
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus, QuestionType, GameState } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';

const GameMaster: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gameState, broadcastState } = useGameState('MANAGER', code);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<any>(null);

  // Hiệu ứng đếm ngược thời gian
  useEffect(() => {
    if (gameState?.status === GameStatus.QUESTION_ACTIVE && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          // Đồng bộ timer định kỳ mỗi 2 giây để tránh quá tải channel
          if (next % 2 === 0 && gameState) {
            broadcastState({ ...gameState, timer: next });
          }
          if (next <= 0) {
            handleTimeUp();
            return 0;
          }
          return next;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else if (gameState?.status !== GameStatus.QUESTION_ACTIVE) {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameState?.status, timeLeft === 0]); // Lắng nghe sự thay đổi của status

  const handleTimeUp = () => {
    if (!gameState) return;
    broadcastState({ ...gameState, status: GameStatus.SHOWING_RESULTS, timer: 0 });
  };

  const nextQuestion = () => {
    if (!gameState) return;
    const nextIdx = gameState.currentQuestionIndex + 1;
    if (nextIdx >= gameState.questions.length) {
      broadcastState({ ...gameState, status: GameStatus.FINISHED });
    } else {
      const nextQ = gameState.questions[nextIdx];
      const timeLimit = nextQ.timeLimit || 30;
      setTimeLeft(timeLimit);
      
      // Đánh dấu thời điểm bắt đầu câu hỏi cho các thiết bị học sinh
      (window as any).questionStartTime = Date.now();

      broadcastState({
        ...gameState,
        currentQuestionIndex: nextIdx,
        status: GameStatus.QUESTION_ACTIVE,
        timer: timeLimit,
        players: gameState.players.map(p => ({ ...p, lastAnswer: undefined, responseTime: undefined, buzzerTime: undefined })),
        activeBuzzerPlayerId: null
      });
    }
  };

  const handleBuzzerAward = (playerId: string, isCorrect: boolean) => {
    if (!gameState) return;
    const question = gameState.questions[gameState.currentQuestionIndex];
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === playerId) {
        return { ...p, score: p.score + (isCorrect ? question.points : -5) };
      }
      return p;
    });
    
    broadcastState({ 
      ...gameState, 
      players: updatedPlayers, 
      status: isCorrect ? GameStatus.SHOWING_RESULTS : GameStatus.QUESTION_ACTIVE,
      activeBuzzerPlayerId: null 
    });
  };

  if (!gameState) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 font-bold">Đang tải trận đấu {code}...</p>
      <button onClick={() => navigate('/manage-list')} className="mt-6 text-indigo-400 hover:underline">Quay lại danh sách</button>
    </div>
  );

  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-xl">
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Mã tham gia</p>
               <h1 className="text-4xl font-black text-yellow-400 font-mono tracking-tighter">{gameState.matchCode}</h1>
            </div>
            <div>
              <h2 className="text-xl font-bold">Điều Khiển Trận Đấu</h2>
              <p className="text-slate-400 font-medium italic">Học sinh: {gameState.players.length}/4</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate(`/manage/${code}`)} className="bg-slate-800 hover:bg-slate-700 px-6 py-5 rounded-[24px] font-bold transition">CHỈNH SỬA CÂU HỎI</button>
            <button 
              onClick={nextQuestion}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-[24px] font-black text-xl transition-all shadow-2xl shadow-indigo-500/20 active:scale-95"
            >
              {gameState.currentQuestionIndex === -1 ? 'BẮT ĐẦU NGAY' : 'CÂU TIẾP THEO'}
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-slate-900/50 p-10 rounded-[48px] border border-white/5 relative overflow-hidden backdrop-blur-3xl shadow-2xl">
               {gameState.status === GameStatus.QUESTION_ACTIVE && (
                 <div className="absolute top-8 right-10 flex flex-col items-center">
                   <div className="text-6xl font-black text-indigo-500 font-mono drop-shadow-lg">
                     {timeLeft}
                   </div>
                   <span className="text-[10px] font-black text-indigo-400/50 uppercase tracking-widest mt-1">Giây</span>
                 </div>
               )}
               {currentQ ? (
                 <>
                   <div className="flex items-center gap-4 mb-8">
                      <span className="bg-indigo-500/10 text-indigo-400 text-xs font-black px-4 py-2 rounded-full border border-indigo-500/20 uppercase tracking-widest">
                        {currentQ.type}
                      </span>
                      <span className="text-slate-500 font-bold">Câu {gameState.currentQuestionIndex + 1} / {gameState.questions.length}</span>
                   </div>
                   <h2 className="text-4xl font-extrabold mb-10 leading-tight max-w-2xl">{currentQ.content}</h2>
                   
                   <div className="bg-black/20 rounded-3xl p-4 mb-10">
                    <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                   </div>
                   
                   {currentQ.type === QuestionType.MCQ && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {currentQ.options?.map((opt, i) => (
                         <div key={i} className={`p-6 rounded-[24px] border-2 transition-all flex items-center gap-4 ${opt === currentQ.correctAnswer ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5 bg-white/5'}`}>
                           <span className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${opt === currentQ.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                             {String.fromCharCode(65 + i)}
                           </span>
                           <span className="text-lg font-bold">{opt}</span>
                         </div>
                       ))}
                     </div>
                   )}

                   {(currentQ.type === QuestionType.SHORT_ANSWER || currentQ.type === QuestionType.BUZZER) && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl inline-flex items-center gap-4">
                         <span className="text-emerald-500 font-black uppercase tracking-widest text-xs">Đáp án chuẩn:</span>
                         <span className="text-2xl font-black text-emerald-400">{currentQ.correctAnswer}</span>
                      </div>
                   )}
                 </>
               ) : (
                 <div className="text-center py-32 space-y-8">
                    <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
                      👋
                    </div>
                    <div>
                      <h3 className="text-2xl font-black mb-2">Trận đấu đã sẵn sàng!</h3>
                      <p className="text-slate-500 font-medium max-w-sm mx-auto">Chờ các học sinh nhập mã <span className="text-indigo-400 font-bold">{gameState.matchCode}</span> trên thiết bị để tham gia.</p>
                    </div>
                 </div>
               )}
            </div>

            {gameState.activeBuzzerPlayerId && (
              <div className="bg-rose-600 p-8 rounded-[40px] flex flex-col md:flex-row justify-between items-center gap-6 animate-pulse shadow-2xl shadow-rose-500/20 border-b-8 border-rose-800">
                <div className="flex items-center gap-6">
                  <div className="text-5xl">🔔</div>
                  <div>
                    <h3 className="font-black text-3xl text-white">BẤM CHUÔNG!</h3>
                    <p className="text-rose-100 font-bold text-xl">{gameState.players.find(p => p.id === gameState.activeBuzzerPlayerId)?.name} giành quyền trả lời</p>
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <button onClick={() => handleBuzzerAward(gameState.activeBuzzerPlayerId!, true)} className="flex-1 md:flex-none bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black hover:bg-emerald-50 transition active:scale-95 shadow-xl">ĐÚNG</button>
                  <button onClick={() => handleBuzzerAward(gameState.activeBuzzerPlayerId!, false)} className="flex-1 md:flex-none bg-white text-rose-600 px-10 py-4 rounded-2xl font-black hover:bg-rose-50 transition active:scale-95 shadow-xl">SAI</button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 h-fit shadow-2xl">
              <h3 className="font-black text-xl mb-6 flex items-center justify-between">
                Học Sinh
                <span className="text-indigo-500 text-sm font-black">{gameState.players.length}/4</span>
              </h3>
              <div className="space-y-4">
                {gameState.players.map((p, idx) => (
                  <div key={p.id} className="group flex justify-between items-center bg-white/5 hover:bg-white/10 p-5 rounded-2xl border border-white/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-black text-lg">{p.name}</p>
                        {p.lastAnswer && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gửi: {p.lastAnswer}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-yellow-400 drop-shadow-md">{p.score}</p>
                    </div>
                  </div>
                ))}
                {gameState.players.length === 0 && (
                  <div className="text-center py-10 space-y-2">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-xl opacity-20">👤</div>
                    <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">Đang chờ...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameMaster;
