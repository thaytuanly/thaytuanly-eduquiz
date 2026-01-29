
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus, QuestionType } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';

// Asset âm thanh công cộng
const SOUNDS = {
  QUESTION: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Tiếng beep bắt đầu
  BUZZER: 'https://assets.mixkit.co/active_storage/sfx/1075/1075-preview.mp3',   // Tiếng chuông
  TIMEUP: 'https://assets.mixkit.co/active_storage/sfx/1073/1073-preview.mp3'    // Tiếng hết giờ
};

const SpectatorView: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { gameState, questionStartedAt } = useGameState('SPECTATOR', code);
  const [localTimeLeft, setLocalTimeLeft] = useState(0);
  const timerIntervalRef = useRef<any>(null);
  
  // Audio refs
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    // Load âm thanh
    Object.entries(SOUNDS).forEach(([key, url]) => {
      audioRefs.current[key] = new Audio(url);
    });
  }, []);

  const playSound = (key: string) => {
    const audio = audioRefs.current[key];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {}); // Chặn lỗi autoplay browser
    }
  };

  // Theo dõi âm thanh
  useEffect(() => {
    if (gameState?.status === GameStatus.QUESTION_ACTIVE) {
       playSound('QUESTION');
    }
  }, [gameState?.currentQuestionIndex]);

  useEffect(() => {
    if (gameState?.buzzerP1Id) {
      playSound('BUZZER');
    }
  }, [gameState?.buzzerP1Id]);

  useEffect(() => {
    if (gameState?.status === GameStatus.QUESTION_ACTIVE && questionStartedAt) {
      const start = new Date(questionStartedAt).getTime();
      const limit = (gameState.questions[gameState.currentQuestionIndex]?.timeLimit || 30) * 1000;

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - start;
        const remaining = Math.max(0, Math.ceil((limit - elapsed) / 1000));
        setLocalTimeLeft(remaining);
        
        if (remaining === 0) {
          playSound('TIMEUP');
          clearInterval(timerIntervalRef.current);
        }
      }, 500);

      return () => clearInterval(timerIntervalRef.current);
    } else {
      setLocalTimeLeft(0);
    }
  }, [gameState?.status, questionStartedAt, gameState?.currentQuestionIndex]);

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black text-2xl animate-pulse">ĐANG KẾT NỐI...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col overflow-hidden font-lexend">
      <header className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-4">
           <h1 className="text-4xl font-black italic">EduQuiz <span className="text-yellow-400">LIVE</span></h1>
           <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
              <span className="text-[8px] font-black text-indigo-300 uppercase block mb-0.5">Mã tham gia</span>
              <span className="text-xl font-black font-mono text-yellow-400 leading-none">{gameState.matchCode}</span>
           </div>
        </div>
        <div className="bg-rose-600/20 border border-rose-500/30 px-6 py-2 rounded-xl flex items-center gap-3">
           <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
           <span className="font-black text-sm uppercase">TRỰC TIẾP</span>
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
        <div className="lg:col-span-3 flex flex-col min-h-0">
          {(gameState.status === GameStatus.QUESTION_ACTIVE || gameState.status === GameStatus.SHOWING_RESULTS) && currentQ ? (
            <div className="bg-slate-900 rounded-[48px] overflow-hidden flex flex-col flex-1 shadow-2xl border-4 border-white/5 relative">
              <div className="grid grid-cols-3 flex-1 min-h-0">
                <div className="col-span-1 bg-black flex items-center justify-center border-r border-white/5">
                  <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                </div>
                
                <div className="col-span-2 p-12 flex flex-col justify-center bg-slate-900/50 relative">
                  <div className="flex justify-between items-center mb-8">
                     <div className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-6 py-2 rounded-full text-sm font-black uppercase">Câu {gameState.currentQuestionIndex + 1}</div>
                     {gameState.status === GameStatus.QUESTION_ACTIVE && (
                       <div className="flex items-center gap-4">
                          <span className="text-slate-500 font-black uppercase text-xs">Thời gian</span>
                          <div className={`text-6xl font-black font-mono ${localTimeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>{localTimeLeft}s</div>
                       </div>
                     )}
                  </div>

                  <h2 className="text-4xl font-black text-white leading-tight mb-12">{currentQ.content}</h2>
                  
                  {currentQ.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-2 gap-4">
                      {currentQ.options?.map((opt, i) => {
                        const isCorrect = gameState.isAnswerRevealed && opt === currentQ.correctAnswer;
                        return (
                          <div key={i} className={`p-6 bg-white/5 border-2 rounded-[32px] font-black text-xl flex items-center gap-4 transition-all duration-700 ${isCorrect ? 'bg-emerald-600 border-emerald-400 text-white scale-105 shadow-2xl' : 'border-white/5 opacity-80'}`}>
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isCorrect ? 'bg-white text-emerald-600' : 'bg-white/10 text-indigo-400'}`}>{String.fromCharCode(65+i)}</span>
                            <span className="truncate">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {gameState.isAnswerRevealed && currentQ.type !== QuestionType.MCQ && (
                    <div className="mt-8 p-10 bg-emerald-600 rounded-[40px] shadow-2xl text-center border-4 border-emerald-400/50 animate-in zoom-in duration-500">
                       <p className="text-xs font-black opacity-80 uppercase mb-2 text-white tracking-widest">Đáp án chính xác</p>
                       <p className="text-5xl font-black text-white italic drop-shadow-lg">"{currentQ.correctAnswer}"</p>
                    </div>
                  )}

                  {!gameState.isAnswerRevealed && gameState.status === GameStatus.SHOWING_RESULTS && (
                    <div className="mt-8 p-10 bg-indigo-600/20 border-2 border-indigo-500/30 rounded-[40px] text-center animate-pulse">
                        <p className="text-indigo-400 font-black text-xl uppercase italic">Chờ người điều khiển hiện đáp án...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : gameState.status === GameStatus.LOBBY ? (
            <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-[48px] p-12 text-center flex-1 flex flex-col justify-center items-center backdrop-blur-3xl">
               <h2 className="text-3xl font-black mb-12 text-white/30 animate-pulse uppercase">Chờ đợi các thí sinh...</h2>
               <div className="flex flex-wrap justify-center gap-4">
                 {gameState.players.map(p => (
                   <div key={p.id} className="bg-white text-indigo-950 px-6 py-3 rounded-[24px] font-black text-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 ring-2 ring-indigo-500/20">
                     {p.name}
                   </div>
                 ))}
               </div>
            </div>
          ) : (
             <div className="bg-slate-900 rounded-[48px] p-12 text-center flex-1 flex flex-col justify-center items-center shadow-2xl border-4 border-white/5">
                <h2 className="text-5xl font-black text-white mb-6 uppercase">Kết thúc trận đấu</h2>
                <div className="text-[150px] mb-8 animate-bounce">🏆</div>
             </div>
          )}
        </div>

        <div className="bg-slate-900/50 rounded-[40px] p-8 border border-white/5 flex flex-col shadow-2xl backdrop-blur-sm">
          <h3 className="font-black text-xs uppercase text-indigo-400 mb-6 tracking-widest text-center border-b border-white/5 pb-3">Bảng xếp hạng</h3>
          <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar flex-1">
            {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => {
              const isBuzzer1 = gameState.buzzerP1Id === p.id;
              const isBuzzer2 = gameState.buzzerP2Id === p.id;
              
              return (
                <div key={p.id} className={`p-6 rounded-[32px] flex justify-between items-center transition-all duration-500 ${
                  isBuzzer1 ? 'bg-emerald-600 text-white ring-4 ring-emerald-400/50 scale-105 z-10' : 
                  isBuzzer2 ? 'bg-amber-600 text-black ring-4 ring-amber-400/50 scale-105 z-10' :
                  idx === 0 ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-black scale-105 shadow-xl' : 
                  'bg-white/5 border border-white/5'
                }`}>
                  <div className="flex items-center gap-4 overflow-hidden">
                    <span className={`text-xl font-black italic ${isBuzzer1 || isBuzzer2 ? 'text-white' : idx === 0 ? 'text-black' : 'text-indigo-400'}`}>
                      {isBuzzer1 ? '🔔' : isBuzzer2 ? '🔔' : `#${idx + 1}`}
                    </span>
                    <span className="font-black text-lg truncate uppercase">{p.name}</span>
                  </div>
                  <span className="font-black text-2xl font-mono">{p.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
          <footer className="mt-20 text-slate-400 font-medium">
        &copy; 2026 Thầy Tuấn Lý với hỗ trợ của Google AI Studio.
      </footer>
  );
};

export default SpectatorView;
