
import React from 'react';
import { useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus, QuestionType } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';

const SpectatorView: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { gameState } = useGameState('SPECTATOR', code);

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black text-2xl">ĐANG KẾT NỐI TRẬN ĐẤU...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-indigo-950 text-white p-8 flex flex-col overflow-hidden font-lexend">
      <header className="flex justify-between items-center mb-10 shrink-0">
        <div className="flex items-center gap-6">
           <h1 className="text-6xl font-black tracking-tighter italic">EduQuiz <span className="text-yellow-400">LIVE</span></h1>
           <div className="h-12 w-px bg-white/10 mx-2"></div>
           <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
              <span className="text-[10px] font-black text-indigo-300 uppercase block mb-1">Mã tham gia</span>
              <span className="text-3xl font-black font-mono tracking-widest text-yellow-400 leading-none">{gameState.matchCode}</span>
           </div>
        </div>
        <div className="text-right">
           <div className="bg-indigo-600/30 border border-indigo-500/50 px-8 py-3 rounded-2xl flex items-center gap-4">
              <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-500/50"></div>
              <span className="font-black text-xl tracking-widest uppercase">TRỰC TIẾP</span>
           </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-10 flex-1 overflow-hidden">
        <div className="lg:col-span-3 flex flex-col min-h-0">
          {(gameState.status === GameStatus.QUESTION_ACTIVE || gameState.status === GameStatus.SHOWING_RESULTS) && currentQ ? (
            <div className="bg-white rounded-[64px] overflow-hidden flex flex-col flex-1 shadow-[0_0_100px_rgba(0,0,0,0.5)] border-8 border-white/5 relative">
              <div className="grid grid-cols-3 flex-1 min-h-0">
                <div className="col-span-1 bg-black flex items-center justify-center relative border-r-4 border-slate-100 min-h-[400px]">
                  <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                </div>
                
                <div className="col-span-2 p-16 flex flex-col justify-center bg-slate-50 relative">
                  <div className="flex justify-between items-center mb-12">
                     <div className="bg-indigo-100 text-indigo-600 px-8 py-3 rounded-full text-lg font-black uppercase tracking-widest">Câu hỏi {gameState.currentQuestionIndex + 1}</div>
                     {gameState.status === GameStatus.QUESTION_ACTIVE && (
                       <div className="flex items-center gap-4">
                          <span className="text-slate-400 font-black uppercase text-sm">Giây còn lại</span>
                          <div className="text-8xl font-black text-indigo-600 font-mono tracking-tighter">{gameState.timer}s</div>
                       </div>
                     )}
                  </div>

                  <h2 className="text-5xl font-black text-slate-800 leading-tight mb-16">{currentQ.content}</h2>
                  
                  {currentQ.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-2 gap-6">
                      {currentQ.options?.map((opt, i) => {
                        const isCorrect = gameState.status === GameStatus.SHOWING_RESULTS && (opt === currentQ.correctAnswer || opt === (currentQ as any).correct_answer);
                        return (
                          <div key={i} className={`p-8 bg-white border-4 rounded-[40px] text-slate-700 font-black text-2xl flex items-center gap-6 shadow-sm transition-all duration-700 ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white scale-110 shadow-emerald-500/40 z-10' : 'border-slate-100 opacity-80'}`}>
                            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg text-3xl ${isCorrect ? 'bg-white text-emerald-600' : 'bg-slate-100 text-indigo-600'}`}>{String.fromCharCode(65+i)}</span>
                            <span className="truncate">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {gameState.status === GameStatus.SHOWING_RESULTS && currentQ.type !== QuestionType.MCQ && (
                    <div className="mt-12 p-12 bg-emerald-500 rounded-[48px] shadow-2xl shadow-emerald-500/40 animate-in zoom-in duration-700 text-center border-8 border-emerald-400/50">
                       <p className="text-lg font-black opacity-80 uppercase tracking-widest mb-4 text-white">Đáp án chính xác</p>
                       <p className="text-6xl font-black text-white italic drop-shadow-lg">"{currentQ.correctAnswer}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : gameState.status === GameStatus.LOBBY ? (
            <div className="bg-white/5 border-4 border-dashed border-white/10 rounded-[64px] p-20 text-center flex-1 flex flex-col justify-center items-center backdrop-blur-3xl">
               <h2 className="text-5xl font-black mb-16 tracking-widest text-white/50 animate-pulse uppercase">Chờ đợi các thí sinh...</h2>
               <div className="flex flex-wrap justify-center gap-6">
                 {gameState.players.map(p => (
                   <div key={p.id} className="bg-white text-indigo-950 px-10 py-5 rounded-[32px] font-black text-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 ring-4 ring-indigo-500/30">
                     {p.name}
                   </div>
                 ))}
               </div>
            </div>
          ) : (
             <div className="bg-white rounded-[64px] p-20 text-center flex-1 flex flex-col justify-center items-center shadow-2xl border-8 border-white/5">
                <h2 className="text-7xl font-black text-indigo-950 mb-8">KẾT THÚC TRẬN ĐẤU</h2>
                <div className="text-[200px] mb-12 animate-bounce drop-shadow-2xl">🏆</div>
                <p className="text-3xl font-bold text-slate-400 italic">Vinh quang dành cho người chiến thắng!</p>
             </div>
          )}
        </div>

        <div className="bg-white/5 rounded-[56px] p-10 border border-white/10 flex flex-col shadow-2xl backdrop-blur-sm min-w-0 shrink-0">
          <h3 className="font-black text-lg uppercase text-indigo-300 mb-8 tracking-widest text-center border-b border-white/10 pb-4">Bảng xếp hạng</h3>
          <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => {
              const isBuzzer1 = gameState.buzzerP1Id === p.id;
              const isBuzzer2 = gameState.buzzerP2Id === p.id;
              
              return (
                <div key={p.id} className={`p-8 rounded-[40px] flex justify-between items-center transition-all duration-500 relative overflow-hidden ${
                  isBuzzer1 ? 'bg-emerald-500 text-white ring-8 ring-emerald-400/50 scale-105 z-10' : 
                  isBuzzer2 ? 'bg-amber-500 text-indigo-950 ring-8 ring-amber-400/50 scale-105 z-10' :
                  idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-indigo-950 scale-105 shadow-xl' : 
                  'bg-white/5 border border-white/10'
                }`}>
                  <div className="flex items-center gap-6 overflow-hidden">
                    <span className={`text-3xl font-black italic ${isBuzzer1 || isBuzzer2 ? 'text-white' : idx === 0 ? 'text-indigo-900' : 'text-indigo-400'}`}>
                      {isBuzzer1 ? '🔔1' : isBuzzer2 ? '🔔2' : `#${idx + 1}`}
                    </span>
                    <span className="font-black text-2xl truncate pr-2 uppercase">{p.name}</span>
                  </div>
                  <span className="font-black text-4xl font-mono">{p.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectatorView;
