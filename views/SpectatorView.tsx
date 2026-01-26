
import React from 'react';
import { useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';

const SpectatorView: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { gameState } = useGameState('SPECTATOR', code);

  if (!gameState) return <div className="min-h-screen bg-slate-900 text-white p-10 text-center">Nhập mã trận đấu để xem...</div>;

  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-indigo-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tight mb-2">EduQuiz <span className="text-yellow-400 italic">LIVE</span></h1>
            <p className="text-indigo-200 font-bold uppercase tracking-widest text-sm">Trận đấu: {gameState.matchCode}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
            <span className="text-indigo-300 mr-4 font-bold">THAM GIA TẠI:</span>
            <span className="text-3xl font-mono font-bold text-yellow-400">eduquiz.pro</span>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
             {gameState.status === GameStatus.LOBBY && (
               <div className="bg-white/5 border border-white/10 rounded-[40px] p-20 text-center">
                  <h2 className="text-4xl font-bold mb-8">ĐANG CHỜ THÍ SINH...</h2>
                  <div className="flex justify-center gap-8">
                    {gameState.players.map(p => (
                      <div key={p.id} className="bg-white text-indigo-900 p-8 rounded-3xl w-48 shadow-xl animate-pulse">
                         <div className="w-16 h-16 bg-indigo-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">👤</div>
                         <p className="font-black text-xl">{p.name}</p>
                      </div>
                    ))}
                    {Array.from({ length: 4 - gameState.players.length }).map((_, i) => (
                      <div key={i} className="bg-white/5 border-4 border-dashed border-white/10 p-8 rounded-3xl w-48 flex items-center justify-center">
                        <p className="text-white/20 font-black text-2xl uppercase">Trống</p>
                      </div>
                    ))}
                  </div>
               </div>
             )}

             {gameState.status === GameStatus.QUESTION_ACTIVE && currentQ && (
               <div className="bg-white rounded-[40px] p-12 text-gray-900 shadow-2xl relative">
                  <div className="absolute top-8 right-8 w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-black">
                     {gameState.timer}s
                  </div>
                  <span className="text-indigo-500 font-black tracking-widest uppercase mb-4 block">CÂU HỎI {gameState.currentQuestionIndex + 1}</span>
                  <h2 className="text-4xl font-bold leading-tight mb-8">{currentQ.content}</h2>
                  <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
               </div>
             )}

             {gameState.status === GameStatus.SHOWING_RESULTS && (
               <div className="bg-white rounded-[40px] p-12 text-gray-900 shadow-2xl">
                  <h2 className="text-4xl font-black text-center mb-10 text-indigo-900">KẾT QUẢ</h2>
                  <div className="space-y-4">
                    {gameState.players.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl">
                         <span className="text-2xl font-bold">{p.name}</span>
                         <span className="text-4xl font-black text-indigo-600">{p.score}</span>
                      </div>
                    ))}
                  </div>
               </div>
             )}
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-widest text-indigo-300">Bảng Xếp Hạng</h3>
            <div className="space-y-4">
               {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => (
                 <div key={p.id} className={`p-6 rounded-3xl flex items-center justify-between border-2 ${idx === 0 ? 'bg-yellow-400 border-yellow-200 text-indigo-900' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center gap-4">
                       <span className="font-black text-3xl opacity-50">{idx + 1}</span>
                       <span className="font-bold text-xl">{p.name}</span>
                    </div>
                    <span className="font-black text-2xl">{p.score}</span>
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
