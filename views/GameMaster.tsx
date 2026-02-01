import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { GameStatus, QuestionType } from '../types';
import { MediaRenderer } from '../components/MediaRenderer';
import { supabase } from '../lib/supabase';

const GameMaster: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gameState, matchId, refresh, questionStartedAt, responses: syncedResponses } = useGameState('MANAGER', code);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (gameState?.status === GameStatus.QUESTION_ACTIVE && questionStartedAt && gameState.currentQuestionIndex >= 0) {
      const start = new Date(questionStartedAt).getTime();
      const currentQ = gameState.questions[gameState.currentQuestionIndex];
      const limit = (currentQ?.timeLimit || 30) * 1000;

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - start;
        const remaining = Math.max(0, Math.ceil((limit - elapsed) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          clearInterval(timerIntervalRef.current);
        }
      }, 500);

      return () => clearInterval(timerIntervalRef.current);
    } else {
      setTimeLeft(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [gameState?.status, questionStartedAt, gameState?.currentQuestionIndex]);

  const jumpToQuestion = async (index: number) => {
    if (!matchId || isProcessing) return;
    setIsProcessing(true);
    try {
      let updateData: any = { is_answer_revealed: false };
      if (index === -1) {
        updateData = { ...updateData, status: GameStatus.LOBBY, current_question_index: -1, question_started_at: null, buzzer_p1_id: null, buzzer_t1: null, buzzer_p2_id: null, buzzer_t2: null };
      } else {
        if (!gameState || index < 0 || index >= gameState.questions.length) return;
        const nextQ = gameState.questions[index];
        updateData = { ...updateData, buzzer_p1_id: null, buzzer_t1: null, buzzer_p2_id: null, buzzer_t2: null, status: GameStatus.QUESTION_ACTIVE, current_question_index: index, timer: nextQ.timeLimit, question_started_at: new Date().toISOString() };
      }
      await supabase.from('matches').update(updateData).eq('id', matchId);
      refresh();
    } catch (err: any) { alert("Lỗi: " + err.message); }
    finally { setIsProcessing(false); }
  };

  const resetBuzzers = async () => {
    if (!matchId) return;
    await supabase.from('matches').update({
      buzzer_p1_id: null, buzzer_t1: null, buzzer_p2_id: null, buzzer_t2: null
    }).eq('id', matchId);
    refresh();
  };

  const clearCurrentResponses = async () => {
    if (!matchId || !gameState || gameState.currentQuestionIndex < 0) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ đáp án của thí sinh ở câu này?")) return;
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    await supabase.from('responses').delete().eq('question_id', currentQ.id);
    refresh();
  };

  const revealAnswerAndScore = async () => {
    if (!matchId || !gameState || gameState.currentQuestionIndex < 0 || gameState.isAnswerRevealed || isProcessing) return;
    setIsProcessing(true);
    try {
      await supabase.from('matches').update({ is_answer_revealed: true, status: GameStatus.SHOWING_RESULTS }).eq('id', matchId);
      for (const resp of syncedResponses) {
        if (resp.is_correct && resp.points_earned > 0) {
          const player = gameState.players.find(p => p.id === resp.player_id);
          if (player) {
            await supabase.from('players').update({ score: player.score + resp.points_earned }).eq('id', player.id);
          }
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsProcessing(false); }
  };

  const updatePlayerScore = async (playerId: string, newScore: number) => {
    await supabase.from('players').update({ score: newScore }).eq('id', playerId);
  };

  if (!gameState) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black">ĐANG KẾT NỐI...</div>;

  const currentQ = gameState.questions[gameState.currentQuestionIndex];

  return (
    // THAY ĐỔI: flex-col cho mobile, lg:flex-row cho desktop
    <div className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row overflow-hidden font-inter">
      
      {/* --- SIDEBAR (DESKTOP ONLY) --- */}
      <div className="hidden lg:flex w-24 bg-slate-900 border-r border-white/5 flex-col items-center py-6 gap-3 overflow-y-auto shrink-0 scrollbar-hide">
        <span className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest text-center">Home</span>
        <button onClick={() => jumpToQuestion(-1)} className={`w-14 h-14 rounded-2xl font-black transition-all flex items-center justify-center text-2xl ${gameState.currentQuestionIndex === -1 ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>🏠</button>
        <div className="w-12 h-px bg-white/10 my-2"></div>
        <span className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest text-center">Câu hỏi</span>
        {gameState.questions.map((_, idx) => (
          <button key={idx} onClick={() => jumpToQuestion(idx)} className={`w-14 h-14 rounded-2xl font-black transition-all shrink-0 text-lg ${gameState.currentQuestionIndex === idx ? 'bg-indigo-600 text-white scale-110 shadow-xl' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>{idx + 1}</button>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen"> {/* THAY ĐỔI: h-screen để quản lý scroll tốt hơn */}
        
        {/* --- HEADER --- */}
        <header className="flex flex-col gap-4 p-4 lg:p-6 bg-slate-900/80 border-b border-white/5 backdrop-blur-md sticky top-0 z-20 shrink-0">
            {/* Hàng 1: Mã phòng & Nút điều hướng */}
            <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3 lg:gap-6">
                    <div className="bg-indigo-600 px-3 py-1.5 lg:px-6 lg:py-2 rounded-xl font-black text-lg lg:text-2xl font-mono">{gameState.matchCode}</div>
                     <button onClick={() => navigate(`/manage/${code}`)} className="bg-slate-800 px-3 py-2 lg:px-6 lg:py-3 rounded-xl font-bold text-xs lg:text-sm hover:bg-slate-700 transition">SỬA</button>
                 </div>

                 <button 
                    onClick={() => jumpToQuestion(gameState.currentQuestionIndex + 1)} 
                    disabled={gameState.currentQuestionIndex >= gameState.questions.length - 1}
                    className="bg-emerald-600 px-4 py-2 lg:px-8 lg:py-3 rounded-xl font-black shadow-lg hover:bg-emerald-500 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-sm lg:text-base"
                 >
                    TIẾP →
                 </button>
            </div>

            {/* --- MOBILE NAVIGATION BAR (Chỉ hiện trên Mobile) --- */}
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 <button onClick={() => jumpToQuestion(-1)} className={`w-10 h-10 rounded-xl font-black shrink-0 flex items-center justify-center ${gameState.currentQuestionIndex === -1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>🏠</button>
                 {gameState.questions.map((_, idx) => (
                  <button key={idx} onClick={() => jumpToQuestion(idx)} className={`w-10 h-10 rounded-xl font-black shrink-0 ${gameState.currentQuestionIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{idx + 1}</button>
                ))}
            </div>

            {/* Hàng 2: Các nút chức năng (Hiện đáp án, Reset...) */}
            {gameState.currentQuestionIndex >= 0 && (
              <div className="flex bg-slate-800/50 p-1 rounded-2xl gap-1.5 border border-white/5 overflow-x-auto">
                <button 
                  onClick={revealAnswerAndScore} 
                  disabled={gameState.isAnswerRevealed}
                  className={`px-3 py-2 lg:px-4 rounded-xl text-[10px] lg:text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap flex-1 justify-center ${gameState.isAnswerRevealed ? 'bg-slate-700 text-slate-500' : 'bg-yellow-500 text-black hover:scale-105 shadow-lg'}`}
                >
                  ✨ {gameState.isAnswerRevealed ? 'ĐÃ HIỆN' : 'HIỆN & CỘNG ĐIỂM'}
                </button>
                <div className="w-px h-6 bg-white/10 my-auto mx-1 shrink-0"></div>
                <button onClick={clearCurrentResponses} className="px-3 py-2 lg:px-4 rounded-xl text-[10px] lg:text-[11px] font-black bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap" title="Xóa đáp án">
                  🧹 XÓA
                </button>
                <button onClick={resetBuzzers} className="px-3 py-2 lg:px-4 rounded-xl text-[10px] lg:text-[11px] font-black bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap" title="Reset chuông">
                  🔔 RESET
                </button>
              </div>
            )}
        </header>

        {/* --- MAIN CONTENT (Scrollable) --- */}
        <main className="flex-1 p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8 overflow-y-auto">
          
          {/* CỘT TRÁI: Nội dung câu hỏi */}
          <div className="lg:col-span-3 space-y-4 lg:space-y-6">
            <div className="bg-slate-900/50 rounded-[32px] lg:rounded-[48px] border border-white/5 overflow-hidden flex flex-col min-h-[400px] lg:min-h-[550px] shadow-2xl relative">
               {currentQ ? (
                 <div className="flex flex-col lg:grid lg:grid-cols-3 flex-1 min-h-0">
                    {/* Media: Chiều cao cố định trên mobile để không chiếm hết màn hình */}
                    <div className="h-48 lg:h-auto lg:col-span-1 bg-black/40 border-b lg:border-b-0 lg:border-r border-white/5 flex items-center justify-center relative overflow-hidden group">
                       <div className="absolute inset-0 flex items-center justify-center">
                            <MediaRenderer url={currentQ.mediaUrl} type={currentQ.mediaType} />
                       </div>
                    </div>

                    {/* Nội dung text */}
                    <div className="col-span-2 p-6 lg:p-12 relative flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-4 lg:absolute lg:top-8 lg:right-12 lg:flex-col lg:items-end lg:mb-0">
                        <span className="bg-white/10 text-indigo-300 px-3 py-1 lg:px-4 lg:py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest order-2 lg:order-1">CÂU {gameState.currentQuestionIndex + 1}</span>
                        <div className="flex flex-col items-end order-1 lg:order-2">
                            <span className="hidden lg:block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Thời gian</span>
                            {/* THAY ĐỔI: Giảm size chữ Timer trên mobile */}
                            <div className={`text-5xl lg:text-8xl font-black font-mono tracking-tighter ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-500'}`}>{timeLeft}</div>
                        </div>
                      </div>
                      
                      {/* THAY ĐỔI: Giảm size chữ câu hỏi */}
                      <h2 className="text-xl lg:text-4xl font-extrabold leading-tight mb-6 lg:mb-10 lg:pr-24 mt-2 lg:mt-0">{currentQ.content}</h2>
                      
                      {/* Khu vực chuông */}
                      <div className="flex gap-2 lg:gap-4 mb-6 lg:mb-10">
                          <div className={`p-3 lg:p-6 rounded-2xl lg:rounded-[32px] border flex-1 text-center transition-all duration-500 ${gameState?.buzzerP1Id ? 'bg-emerald-500/20 border-emerald-500/40 scale-105 shadow-xl' : 'bg-white/5 border-white/5 opacity-50'}`}>
                             <p className="text-[8px] lg:text-[10px] font-black uppercase text-emerald-400 mb-1">🔔 Hạng 1</p>
                             <p className="text-sm lg:text-2xl font-black truncate">{gameState?.players.find(p => p.id === gameState.buzzerP1Id)?.name || "---"}</p>
                          </div>
                          <div className={`p-3 lg:p-6 rounded-2xl lg:rounded-[32px] border flex-1 text-center transition-all duration-500 ${gameState?.buzzerP2Id ? 'bg-amber-500/20 border-amber-500/40 scale-105 shadow-xl' : 'bg-white/5 border-white/5 opacity-50'}`}>
                             <p className="text-[8px] lg:text-[10px] font-black uppercase text-amber-400 mb-1">🔔 Hạng 2</p>
                             <p className="text-sm lg:text-2xl font-black truncate">{gameState?.players.find(p => p.id === gameState.buzzerP2Id)?.name || "---"}</p>
                          </div>
                      </div>
                      
                      {/* Đáp án đúng */}
                      <div className={`p-4 lg:p-8 rounded-2xl lg:rounded-[32px] border transition-all ${gameState.isAnswerRevealed ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-slate-800 border-white/5 grayscale opacity-50'}`}>
                          <p className="text-emerald-400 font-black text-[10px] lg:text-xs mb-1 uppercase opacity-60">Đáp án đúng</p>
                          <p className="text-xl lg:text-3xl font-black text-white">{currentQ.correctAnswer || "Chưa có"}</p>
                      </div>
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 lg:p-12 text-center">
                    <div className="text-6xl lg:text-9xl mb-4 lg:mb-8 opacity-10 animate-bounce">🏠</div>
                    <p className="font-black text-lg lg:text-2xl uppercase text-white/20 tracking-tighter">Màn hình chờ</p>
                    <p className="text-slate-500 mt-2 lg:mt-4 text-xs lg:text-sm font-medium">Đang có <span className="text-indigo-400 font-black">{gameState.players.length}</span> thí sinh sẵn sàng.</p>
                 </div>
               )}
            </div>
          </div>

          {/* CỘT PHẢI: Danh sách thí sinh (Nằm dưới trên mobile) */}
          <div className="flex flex-col min-h-0 lg:h-auto">
            <h3 className="font-black text-[10px] uppercase text-slate-500 mb-2 lg:mb-4 border-b border-white/5 pb-2 tracking-widest sticky top-0 bg-slate-950/90 z-10 backdrop-blur">
              Danh sách thí sinh ({gameState.players.length})
            </h3>
            
            {/* Class 'max-h' trên mobile để không làm trang quá dài, người dùng có thể scroll riêng khu vực này */}
            <div className="space-y-2 lg:space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar max-h-[400px] lg:max-h-none">
              {(() => {
                const sortedByScore = [...gameState.players].sort((a, b) => b.score - a.score);
                return gameState.players.map((p, idx) => {
                  const resp = syncedResponses.find((r) => r.player_id === p.id);
                  const currentRank = sortedByScore.findIndex(sp => sp.id === p.id) + 1;
                  return (
                    <div key={p.id} className="bg-white/5 p-3 lg:p-4 rounded-[20px] lg:rounded-[28px] border border-white/5 transition-all hover:bg-white/[0.08]">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${currentRank === 1 ? "bg-yellow-400 text-indigo-950" : "bg-slate-800 text-slate-400"}`}>
                            {currentRank}
                          </div>
                          <span className="font-black text-xs truncate">
                            <span className="text-slate-500 mr-1">#{currentRank}</span> {p.name}
                          </span>
                        </div>
                        <input type="number" value={p.score} onChange={(e) => updatePlayerScore(p.id, parseInt(e.target.value) || 0)} className="w-10 lg:w-12 bg-transparent text-emerald-400 font-black text-right outline-none text-sm" />
                      </div>
                      
                      {resp ? (
                        <div className={`p-2 rounded-xl border animate-in zoom-in ${gameState.isAnswerRevealed ? (resp.is_correct ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20") : "bg-indigo-500/10 border-indigo-500/20"}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-[6px] font-black px-1.5 py-0.5 rounded-full ${gameState.isAnswerRevealed ? (resp.is_correct ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "bg-indigo-400 text-white"}`}>
                              {gameState.isAnswerRevealed ? (resp.is_correct ? "ĐÚNG" : "SAI") : "ĐÃ NỘP"}
                            </span>
                            <span className="text-[8px] font-mono text-white/30">{resp.response_time}ms</span>
                          </div>
                          <p className="text-xs font-bold text-white truncate">"{resp.answer}"</p>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5 border-dashed text-center opacity-20">
                          <p className="text-[8px] text-slate-500 font-bold uppercase italic">Chờ...</p>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </main>
        
        <footer className="p-4 lg:mt-0 text-slate-400 font-medium text-[10px] text-center shrink-0">
          &copy; 2026 Thầy Tuấn Lý dưới sự trợ giúp của Google.
        </footer>
      </div>
    </div>
  );
};

export default GameMaster;
