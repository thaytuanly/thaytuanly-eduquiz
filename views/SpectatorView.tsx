
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
    <div className="min-h-screen bg-indigo-950 text-white p-8 flex flex-col overflow-hidden">
      <header className="flex justify-between items-center mb-10 shrink-0">
        <div className="flex items-center gap-6">
           <h1 className="text-6xl font-black tracking-tighter italic">EduQuiz <span className="text-yellow-400">LIVE</span></h1>
           <div className="h-12 w-px bg-white/10 mx-2"></div>
           <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
              <span className="text-[10px] font-black text-indigo-300 uppercase block mb-1">Mã phòng</span>
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
        {/* Main Content Area */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          {(gameState.status === GameStatus.QUESTION_ACTIVE || gameState.status === GameStatus.SHOWING_RESULTS) && currentQ ? (
            <div className="bg-white rounded-[64px] overflow-hidden flex flex-col flex-1 shadow-[0_0_100px_rgba(0,0,0,0.5)] border-8 border-white/5">
              <div className="grid grid-cols-3 flex-1 min-h-0">
                {/* 1/3 Media Section */}
                <div className="col-span-1 bg-black flex items-center justify-center relative border-r-4 border-slate-100">
                  <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                  <div className="absolute top-8 left-8 bg-indigo-600/90 backdrop-blur-md text-white px-5 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-xl">Media Frame</div>
                </div>
                
                {/* 2/3 Question Section */}
                <div className="col-span-2 p-16 flex flex-col justify-center bg-slate-50 relative">
                  <div className="flex justify-between items-center mb-12">
                     <div className="bg-indigo-100 text-indigo-600 px-8 py-3 rounded-full text-lg font-black uppercase tracking-widest">Câu hỏi {gameState.currentQuestionIndex + 1}</div>
                     {gameState.status === GameStatus.QUESTION_ACTIVE && (
                       <div className="flex items-center gap-4">
                          <span className="text-slate-400 font-black uppercase text-sm">Thời gian còn lại</span>
                          <div className="text-8xl font-black text-indigo-600 font-mono tracking-tighter">{gameState.timer}s</div>
                       </div>
                     )}
                  </div>

                  <h2 className="text-5xl font-black text-slate-800 leading-tight mb-16">{currentQ.content}</h2>
                  
                  {currentQ.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-2 gap-6">
                      {currentQ.options?.map((opt, i) => (
                        <div key={i} className={`p-8 bg-white border-4 border-slate-100 rounded-[40px] text-slate-700 font-black text-2xl flex items-center gap-6 shadow-sm transition-all ${gameState.status === GameStatus.SHOWING_RESULTS && opt === currentQ.correctAnswer ? 'bg-emerald-500 border-emerald-400 text-white scale-105 shadow-emerald-500/20' : ''}`}>
                          <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg text-3xl ${gameState.status === GameStatus.SHOWING_RESULTS && opt === currentQ.correctAnswer ? 'bg-white text-emerald-600' : 'bg-slate-100 text-indigo-600'}`}>{String.fromCharCode(65+i)}</span>
                          <span className="truncate">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {gameState.status === GameStatus.SHOWING_RESULTS && (
                    <div className="mt-12 p-10 bg-emerald-500 rounded-[48px] shadow-2xl shadow-emerald-500/20 animate-in zoom-in duration-500 text-center">
                       <p className="text-sm font-black opacity-70 uppercase tracking-widest mb-3">Đáp án chính xác là</p>
                       <p className="text-5xl font-black">{currentQ.correctAnswer}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : gameState.status === GameStatus.LOBBY ? (
            <div className="bg-white/5 border-4 border-dashed border-white/10 rounded-[64px] p-20 text-center flex-1 flex flex-col justify-center items-center backdrop-blur-3xl">
               <h2 className="text-5xl font-black mb-16 tracking-widest text-white/50 animate-pulse">CHỜ ĐỢI CÁC THÍ SINH...</h2>
               <div className="flex flex-wrap justify-center gap-6">
                 {gameState.players.map(p => (
                   <div key={p.id} className="bg-white text-indigo-950 px-10 py-5 rounded-[32px] font-black text-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                     {p.name}
                   </div>
                 ))}
               </div>
               {gameState.players.length === 0 && <p className="text-xl font-medium text-slate-500 mt-8 italic">Đang chờ người chơi đầu tiên kết nối</p>}
            </div>
          ) : (
             <div className="bg-white rounded-[64px] p-20 text-center flex-1 flex flex-col justify-center items-center shadow-2xl border-8 border-white/5">
                <h2 className="text-6xl font-black text-indigo-950 mb-4">TRẬN ĐẤU KẾT THÚC</h2>
                <div className="w-40 h-1 bg-indigo-100 mb-12"></div>
                <div className="text-9xl mb-12">🏆</div>
                <p className="text-2xl font-bold text-slate-400">Chúc mừng các thí sinh đã hoàn thành xuất sắc!</p>
             </div>
          )}
        </div>

        {/* Sidebar Leaderboard */}
        <div className="bg-white/5 rounded-[56px] p-10 border border-white/10 flex flex-col shadow-2xl backdrop-blur-sm min-w-0 shrink-0">
          <h3 className="font-black text-lg uppercase text-indigo-300 mb-8 tracking-widest text-center border-b border-white/10 pb-4">Bảng xếp hạng</h3>
          <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => (
              <div key={p.id} className={`p-8 rounded-[40px] flex justify-between items-center transition-all duration-500 ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-indigo-950 scale-110 shadow-2xl shadow-yellow-500/20 ring-4 ring-yellow-300/50' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                <div className="flex items-center gap-6 overflow-hidden">
                  <span className={`text-3xl font-black italic ${idx === 0 ? 'text-indigo-900' : 'text-indigo-400'}`}>#{idx + 1}</span>
                  <span className="font-black text-2xl truncate pr-2">{p.name}</span>
                </div>
                <span className="font-black text-4xl font-mono">{p.score}</span>
              </div>
            ))}
            {gameState.players.length === 0 && <p className="text-center text-slate-600 font-bold italic mt-20">Chưa có dữ liệu</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectatorView;
