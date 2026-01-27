
import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';

const SpectatorView: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { gameState } = useGameState('SPECTATOR', code);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hiệu ứng âm thanh
  useEffect(() => {
    if (!gameState) return;
    
    if (gameState.status === GameStatus.QUESTION_ACTIVE) {
      playSound('https://cdn.pixabay.com/audio/2022/03/15/audio_731478144b.mp3'); // Sound start
    } else if (gameState.status === GameStatus.SHOWING_RESULTS) {
      playSound('https://cdn.pixabay.com/audio/2021/08/04/audio_c976d8b948.mp3'); // Sound result
    }
  }, [gameState?.status, gameState?.currentQuestionIndex]);

  const playSound = (url: string) => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.warn("Audio play blocked by browser");
    }
  };

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black">Mã trận đấu không hợp lệ...</div>;

  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-indigo-950 text-white p-8 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-6xl font-black tracking-tighter mb-2">EduQuiz <span className="text-yellow-400 italic">LIVE</span></h1>
            <p className="text-indigo-200 font-bold uppercase tracking-[0.3em] text-xs">MÃ PHÒNG: {gameState.matchCode}</p>
          </div>
          <div className="bg-white/10 p-5 rounded-[24px] backdrop-blur-xl border border-white/10 text-center">
            <p className="text-indigo-300 text-[10px] font-black uppercase mb-1">Tham gia tại:</p>
            <p className="text-3xl font-black text-white font-mono">eduquiz.pro</p>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-10 flex-1">
          <div className="lg:col-span-3 flex flex-col">
             {gameState.status === GameStatus.LOBBY && (
               <div className="bg-white/5 border border-white/10 rounded-[56px] p-20 text-center flex-1 flex flex-col justify-center shadow-2xl">
                  <h2 className="text-5xl font-black mb-12 text-white/90">ĐANG ĐỢI THÍ SINH...</h2>
                  <div className="flex flex-wrap justify-center gap-8">
                    {gameState.players.map(p => (
                      <div key={p.id} className="bg-white text-indigo-950 p-10 rounded-[32px] w-56 shadow-2xl transform hover:scale-105 transition duration-500">
                         <div className="w-20 h-20 bg-indigo-50 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl shadow-inner">👤</div>
                         <p className="font-black text-2xl truncate">{p.name}</p>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - gameState.players.length) }).map((_, i) => (
                      <div key={i} className="bg-white/5 border-4 border-dashed border-white/10 p-10 rounded-[32px] w-56 flex items-center justify-center">
                        <p className="text-white/10 font-black text-2xl uppercase tracking-widest">Trống</p>
                      </div>
                    ))}
                  </div>
               </div>
             )}

             {gameState.status === GameStatus.QUESTION_ACTIVE && currentQ && (
               <div className="bg-white rounded-[64px] p-16 text-slate-900 shadow-2xl relative flex-1 flex flex-col justify-center">
                  <div className="absolute top-10 right-10 w-24 h-24 bg-indigo-600 rounded-full flex flex-col items-center justify-center text-white shadow-xl ring-8 ring-indigo-100">
                     <span className="text-4xl font-black font-mono">{gameState.timer}</span>
                     <span className="text-[10px] font-black uppercase">s</span>
                  </div>
                  <div className="max-w-3xl">
                    <span className="bg-indigo-600 text-white px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-6 inline-block">CÂU HỎI {gameState.currentQuestionIndex + 1}</span>
                    <h2 className="text-5xl font-black leading-tight mb-10 text-slate-800">{currentQ.content}</h2>
                  </div>
                  <div className="flex-1 min-h-[300px] flex items-center justify-center bg-slate-50 rounded-[48px] overflow-hidden">
                    <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                  </div>
               </div>
             )}

             {gameState.status === GameStatus.SHOWING_RESULTS && (
               <div className="bg-white rounded-[64px] p-16 text-slate-900 shadow-2xl flex-1">
                  <h2 className="text-4xl font-black text-center mb-12 text-indigo-950">PHÂN TÍCH KẾT QUẢ</h2>
                  
                  <div className="bg-slate-900 text-white p-10 rounded-[40px] mb-12 shadow-xl border-b-8 border-slate-800">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Đáp án đúng là:</p>
                    <p className="text-5xl font-black text-emerald-400">{currentQ?.correctAnswer}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {gameState.players.map((p: any) => (
                      <div key={p.id} className="flex justify-between items-center bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                         <div>
                            <span className="text-2xl font-black text-slate-800">{p.name}</span>
                            <p className={`text-sm font-bold mt-1 ${p.last_answer === currentQ.correctAnswer ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {p.last_answer ? `Đã chọn: ${p.last_answer}` : 'Không trả lời'}
                              <span className="text-slate-400 ml-2">({p.response_time ? (p.response_time/1000).toFixed(1) : '0'}s)</span>
                            </p>
                         </div>
                         <span className="text-4xl font-black text-indigo-600">{p.score}</span>
                      </div>
                    ))}
                  </div>
               </div>
             )}
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-widest text-indigo-300 ml-4">Bảng Xếp Hạng</h3>
            <div className="space-y-4">
               {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => (
                 <div key={p.id} className={`p-8 rounded-[32px] flex items-center justify-between border-2 transition-all duration-500 ${idx === 0 ? 'bg-yellow-400 border-yellow-200 text-indigo-950 scale-105 shadow-xl' : 'bg-white/5 border-white/10 text-white'}`}>
                    <div className="flex items-center gap-6">
                       <span className="font-black text-4xl opacity-50">{idx + 1}</span>
                       <span className="font-black text-2xl truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <span className="font-black text-3xl">{p.score}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectatorView;
