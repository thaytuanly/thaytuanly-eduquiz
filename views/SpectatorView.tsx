import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus, QuestionType } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';

// Asset âm thanh công cộng
const SOUNDS = {
  QUESTION: 'https://www.myinstants.com/media/sounds/magic-fairy.mp3', // Tiếng beep bắt đầu
  BUZZER: 'https://www.myinstants.com/media/sounds/taco-bell-bong-sfx.mp3',   // Tiếng chuông
  TIMEUP: 'https://www.myinstants.com/media/sounds/boxing-bell.mp3'    // Tiếng hết giờ
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
  }, [gameState?.currentQuestionIndex, gameState?.status]);

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
  }, [gameState?.status, questionStartedAt, gameState?.currentQuestionIndex, gameState?.questions]);

  if (!gameState) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white font-black text-2xl animate-pulse uppercase">Đang kết nối server...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="h-screen bg-slate-950 text-white p-6 flex flex-col overflow-hidden font-lexend">
      {/* Header cố định */}
      <header className="flex justify-between items-center mb-6 shrink-0 bg-slate-900/50 p-4 rounded-3xl border border-white/5">
        <div className="flex items-center gap-4">
           <h1 className="text-4xl font-black italic tracking-tighter">Hệ thống thi đấu trí tuệ trực tuyến <span className="text-yellow-400">LIVE</span></h1>
           <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
              <span className="text-[8px] font-black text-indigo-300 uppercase block mb-0.5 tracking-widest">Mã tham gia</span>
              <span className="text-xl font-black font-mono text-yellow-400 leading-none">{gameState.matchCode}</span>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-rose-600/20 border border-rose-500/30 px-6 py-2 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
              <span className="font-black text-xs uppercase tracking-widest">Đang trực tiếp</span>
           </div>
        </div>
      </header>

      {/* Container chính */}
      <div className="flex-1 grid lg:grid-cols-4 gap-6 min-h-0">
        
        {/* CỘT TRÁI (3/4): Nội dung chính */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          {(gameState.status === GameStatus.QUESTION_ACTIVE || gameState.status === GameStatus.SHOWING_RESULTS) && currentQ ? (
            /* HIỂN THỊ CÂU HỎI */
            <div className="bg-slate-900 rounded-[48px] overflow-hidden flex flex-col flex-1 shadow-2xl border-4 border-white/5 relative">
              <div className="grid grid-cols-3 h-full">
                <div className="col-span-1 bg-black flex items-center justify-center border-r border-white/5 p-4">
                  <div className="w-full aspect-video lg:aspect-square">
                    <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                  </div>
                </div>
                
                <div className="col-span-2 p-12 flex flex-col justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 relative">
                  <div className="flex justify-between items-center mb-10">
                     <div className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-6 py-2 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg">Câu hỏi số {gameState.currentQuestionIndex + 1}</div>
                     {gameState.status === GameStatus.QUESTION_ACTIVE && (
                       <div className="flex items-center gap-6">
                          <span className="text-slate-500 font-black uppercase text-xs tracking-widest">Thời gian còn lại</span>
                          <div className={`text-7xl font-black font-mono leading-none ${localTimeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>
                            {localTimeLeft.toString().padStart(2, '0')}
                          </div>
                       </div>
                     )}
                  </div>

                  <h2 className="text-4xl font-black text-white leading-tight mb-12 drop-shadow-md">{currentQ.content}</h2>
                  
                  {currentQ.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-2 gap-6">
                      {currentQ.options?.map((opt, i) => {
                        const isCorrect = gameState.isAnswerRevealed && opt === currentQ.correctAnswer;
                        return (
                          <div key={i} className={`p-7 bg-white/5 border-2 rounded-[36px] font-black text-2xl flex items-center gap-6 transition-all duration-700 ${isCorrect ? 'bg-emerald-600 border-emerald-400 text-white scale-105 shadow-[0_0_50px_rgba(16,185,129,0.3)]' : 'border-white/5 opacity-80'}`}>
                            <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${isCorrect ? 'bg-white text-emerald-600' : 'bg-white/10 text-indigo-400'}`}>{String.fromCharCode(65+i)}</span>
                            <span className="truncate">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {gameState.isAnswerRevealed && currentQ.type !== QuestionType.MCQ && (
                    <div className="mt-8 p-12 bg-emerald-600 rounded-[48px] shadow-[0_0_60px_rgba(16,185,129,0.2)] text-center border-4 border-emerald-400/50 animate-in zoom-in duration-500">
                       <p className="text-xs font-black opacity-80 uppercase mb-3 text-white tracking-[0.3em]">Đáp án chính xác</p>
                       <p className="text-6xl font-black text-white italic">"{currentQ.correctAnswer}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : gameState.status === GameStatus.LOBBY ? (
            /* HIỂN THỊ THỂ LỆ & DANH SÁCH THÍ SINH */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="grid lg:grid-cols-5 gap-8 h-full">
                <div className="lg:col-span-3 flex flex-col gap-6">
                  <div className="bg-indigo-600/10 border-4 border-white/5 rounded-[48px] p-10 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-5xl animate-pulse">📜</span>
                      <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Thể lệ cuộc thi</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 flex-1">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white/5 p-6 rounded-[32px] border border-white/10">
                          <h3 className="text-indigo-400 font-black text-xl mb-3 uppercase">1. Trắc nghiệm</h3>
                          <p className="text-slate-300 text-sm font-medium">Chọn 1 đáp án đúng. <br/> Đúng <span className="text-emerald-400 font-black">+100%</span> điểm.</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-[32px] border border-white/10">
                          <h3 className="text-amber-400 font-black text-xl mb-3 uppercase">2. Trả lời ngắn</h3>
                          <p className="text-slate-300 text-sm font-medium">Nhập trực tiếp đáp án. <br/> Đúng <span className="text-emerald-400 font-black">+100%</span> điểm.</p>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-600/20 to-rose-600/10 p-8 rounded-[40px] border-2 border-indigo-500/30 relative overflow-hidden">
                        <div className="absolute top-4 right-6 text-6xl opacity-10">🔔</div>
                        <h3 className="text-rose-400 font-black text-2xl mb-4 uppercase italic">3. Bấm chuông giành quyền</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-black/30 p-5 rounded-3xl border border-white/5">
                            <p className="text-[10px] font-black text-indigo-300 mb-2">Hạng 1: Đúng +100% | Sai -50%</p>
                          </div>
                          <div className="bg-black/30 p-5 rounded-3xl border border-white/5">
                            <p className="text-[10px] font-black text-amber-300 mb-2">Hạng 2: Đúng +50% | Sai -50%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col">
                  <div className="bg-white/5 border-4 border-dashed border-white/10 rounded-[48px] p-8 flex-1 flex flex-col items-center">
                    <h2 className="text-2xl font-black mb-8 text-indigo-300 uppercase tracking-widest flex items-center gap-3">
                       <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
                       Thí sinh ({gameState.players.length})
                    </h2>
                    <div className="flex flex-wrap justify-center gap-3 overflow-y-auto w-full pr-2">
                      {gameState.players.map(p => (
                        <div key={p.id} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-lg animate-in zoom-in">
                          {p.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* HIỂN THỊ KẾT THÚC */
            <div className="bg-slate-900 rounded-[48px] p-12 text-center flex-1 flex flex-col justify-center items-center shadow-2xl border-4 border-white/5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-950">
               <h2 className="text-6xl font-black text-white mb-8 uppercase tracking-tighter">Trận đấu kết thúc</h2>
               <div className="text-[180px] mb-8 animate-bounce drop-shadow-[0_10px_30px_rgba(234,179,8,0.5)]">🏆</div>
               <p className="text-yellow-400 text-3xl font-black uppercase tracking-[0.5em]">Chúc mừng các nhà vô địch!</p>
            </div>
          )}
        </div>

        {/* CỘT PHẢI (1/4): Bảng xếp hạng luôn hiển thị */}
        <div className="flex flex-col min-h-0 h-full">
           <div className="bg-slate-900/60 rounded-[40px] p-8 border border-white/5 flex flex-col shadow-2xl backdrop-blur-md h-full overflow-hidden">
            <div className="flex items-center justify-center gap-3 mb-6 border-b border-white/10 pb-4">
               <span className="text-2xl">📊</span>
               <h3 className="font-black text-sm uppercase text-indigo-300 tracking-[0.2em]">Bảng xếp hạng</h3>
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-3 flex-1 custom-scrollbar">
              {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => {
                  const isBuzzer1 = gameState.buzzerP1Id === p.id;
                  const isBuzzer2 = gameState.buzzerP2Id === p.id;
                  
                  return (
                    <div key={p.id} className={`p-6 rounded-[32px] flex justify-between items-center transition-all duration-500 ${
                      isBuzzer1 ? 'bg-emerald-600 text-white ring-8 ring-emerald-500/20 scale-105 z-10 shadow-lg' : 
                      isBuzzer2 ? 'bg-amber-500 text-slate-900 ring-8 ring-amber-500/20 scale-105 z-10 shadow-lg' :
                      idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-slate-900 scale-105 shadow-xl' : 
                      'bg-white/5 border border-white/5'
                    }`}>
                      <div className="flex items-center gap-4 overflow-hidden">
                        <span className="font-black text-lg uppercase truncate">{p.name}</span>
                      </div>
                      <span className="font-black text-2xl font-mono">{p.score}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

      </div>
       <footer className="p-4 lg:mt-0 text-slate-400 font-medium text-[10px] text-center shrink-0">
          &copy; 2026 Thầy Tuấn Lý dưới sự trợ giúp của Google.
        </footer>
    </div>
  );
};

export default SpectatorView;
