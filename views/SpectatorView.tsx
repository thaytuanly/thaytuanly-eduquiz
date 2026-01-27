
import React from 'react';
import { useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus, QuestionType } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';

const SpectatorView: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { gameState } = useGameState('SPECTATOR', code);

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black">Mã trận đấu không hợp lệ...</div>;
  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-indigo-950 text-white p-8 overflow-hidden flex flex-col">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-5xl font-black tracking-tighter">EduQuiz <span className="text-yellow-400">LIVE</span></h1>
        <div className="text-right">
          <p className="text-indigo-300 text-[10px] font-black uppercase">Mã phòng:</p>
          <p className="text-3xl font-black font-mono">{gameState.matchCode}</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-8 flex-1 overflow-hidden">
        <div className="lg:col-span-3 flex flex-col">
          {gameState.status === GameStatus.QUESTION_ACTIVE && currentQ && (
            <div className="bg-white rounded-[48px] overflow-hidden flex flex-col flex-1 shadow-2xl">
              <div className="grid grid-cols-3 flex-1">
                <div className="col-span-1 bg-black/5 border-r p-4">
                  <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                </div>
                <div className="col-span-2 p-12 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-8">
                     <span className="bg-indigo-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase">Câu {gameState.currentQuestionIndex + 1}</span>
                     <div className="text-6xl font-black text-indigo-600 font-mono">{gameState.timer}s</div>
                  </div>
                  <h2 className="text-4xl font-black text-slate-800 leading-tight mb-12">{currentQ.content}</h2>
                  
                  {currentQ.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-2 gap-4">
                      {currentQ.options?.map((opt, i) => (
                        <div key={i} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-slate-700 font-bold text-xl flex items-center gap-4">
                          <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-600">{String.fromCharCode(65+i)}</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {gameState.status === GameStatus.LOBBY && (
            <div className="bg-white/5 border border-white/10 rounded-[48px] p-20 text-center flex-1 flex flex-col justify-center items-center">
               <h2 className="text-4xl font-black mb-12">CHỜ ĐỢI CÁC THÍ SINH...</h2>
               <div className="flex flex-wrap justify-center gap-4">
                 {gameState.players.map(p => (
                   <div key={p.id} className="bg-white text-indigo-950 px-8 py-4 rounded-2xl font-black text-xl shadow-lg animate-bounce">
                     {p.name}
                   </div>
                 ))}
               </div>
            </div>
          )}

          {gameState.status === GameStatus.SHOWING_RESULTS && (
             <div className="bg-white rounded-[48px] p-16 text-slate-800 shadow-2xl flex-1 flex flex-col justify-center text-center">
                <h2 className="text-3xl font-black mb-8 uppercase text-slate-400">Kết quả câu hỏi</h2>
                <div className="bg-emerald-500 text-white p-10 rounded-[40px] mb-12 inline-block mx-auto">
                   <p className="text-sm font-black opacity-60 uppercase mb-2">Đáp án đúng</p>
                   <p className="text-5xl font-black">{currentQ?.correctAnswer}</p>
                </div>
             </div>
          )}
        </div>

        <div className="bg-white/5 rounded-[40px] p-8 border border-white/10 overflow-y-auto">
          <h3 className="font-black text-sm uppercase text-indigo-300 mb-6">Xếp hạng trực tiếp</h3>
          <div className="space-y-4">
            {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => (
              <div key={p.id} className={`p-6 rounded-3xl flex justify-between items-center ${idx === 0 ? 'bg-yellow-400 text-indigo-950 scale-105' : 'bg-white/5 border border-white/10'}`}>
                <span className="font-black truncate max-w-[120px]">{idx + 1}. {p.name}</span>
                <span className="font-black text-2xl">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectatorView;
