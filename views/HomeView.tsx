
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomeView: React.FC = () => {
  const [matchCode, setMatchCode] = useState('');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-emerald-50">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black text-indigo-950 mb-4 tracking-tight">EduQuiz <span className="text-indigo-600">Pro</span></h1>
        <p className="text-xl text-slate-500 font-medium italic">Nền tảng thi đấu trí tuệ thời gian thực</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl">
        {/* Người Chơi */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl border border-indigo-50 flex flex-col items-center text-center group hover:scale-105 transition-transform">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center text-4xl mb-6">🎮</div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Người Chơi</h2>
          <p className="text-slate-400 text-sm mb-8">Nhập mã trận đấu và họ tên để tham gia trả lời câu hỏi</p>
          <div className="w-full space-y-3 mt-auto">
            <input 
              placeholder="Mã trận đấu..."
              value={matchCode}
              onChange={e => setMatchCode(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 text-center font-bold tracking-widest outline-none"
            />
            <button 
              onClick={() => matchCode && navigate(`/play/${matchCode}`)}
              disabled={!matchCode}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition shadow-lg"
            >
              THAM GIA THI ĐẤU
            </button>
          </div>
        </div>

        {/* Người Xem */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl border border-emerald-50 flex flex-col items-center text-center group hover:scale-105 transition-transform">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center text-4xl mb-6">👁️</div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Người Xem</h2>
          <p className="text-slate-400 text-sm mb-8">Theo dõi diễn biến trận đấu và bảng xếp hạng trực tiếp</p>
          <div className="w-full space-y-3 mt-auto">
             <input 
              placeholder="Mã trận đấu..."
              value={matchCode}
              onChange={e => setMatchCode(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 text-center font-bold tracking-widest outline-none"
            />
            <button 
              onClick={() => matchCode && navigate(`/view/${matchCode}`)}
              disabled={!matchCode}
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl hover:bg-emerald-600 disabled:bg-slate-200 transition shadow-lg"
            >
              XEM TRẬN ĐẤU
            </button>
          </div>
        </div>

        {/* Người Quản Lý */}
        <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl flex flex-col items-center text-center group hover:scale-105 transition-transform">
          <div className="w-20 h-20 bg-white/10 text-white rounded-3xl flex items-center justify-center text-4xl mb-6">🛠️</div>
          <h2 className="text-2xl font-black text-white mb-2">Quản Lý</h2>
          <p className="text-slate-400 text-sm mb-8">Tổ chức trận đấu, quản lý câu hỏi và điều khiển trò chơi</p>
          <div className="w-full mt-auto">
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl hover:bg-slate-100 transition shadow-lg"
            >
              ĐĂNG NHẬP QUẢN TRỊ
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-20 text-slate-400 font-medium">
        &copy; 2026 Thầy Tuấn Lý bằng sự hỗ trợ của Google AI Studio.
      </footer>
    </div>
  );
};

export default HomeView;
