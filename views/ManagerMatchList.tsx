
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';

interface MatchInfo {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

const ManagerMatchList: React.FC = () => {
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
      navigate('/login');
      return;
    }
    fetchMatches();
  }, [navigate]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error("Fetch error:", error);
        // Nếu lỗi do bảng chưa tồn tại
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
          console.error("Bảng 'matches' chưa tồn tại. Hãy chạy database.sql");
        }
      }
      setMatches(data || []);
    } catch (err) {
      console.error("Hệ thống chưa kết nối được Supabase:", err);
    }
  };

  const createNewMatch = async () => {
    setLoading(true);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      // Thử chèn một dòng mới vào bảng matches
      const { data, error } = await supabase.from('matches').insert([
        { 
          code: newCode, 
          name: `Trận đấu ${newCode}`, 
          status: 'LOBBY',
          current_question_index: -1,
          timer: 0
        }
      ]).select();

      if (error) {
        console.error("Supabase Error Details:", error);
        alert(`LỖI DATABASE: ${error.message}\n\nLưu ý: Bạn cần vào SQL Editor của Supabase và chạy file database.sql để tạo bảng trước khi sử dụng.`);
        setLoading(false);
        return;
      }
      
      if (data && data.length > 0) {
        navigate(`/manage/${newCode}`);
      } else {
        alert("Không nhận được phản hồi từ database sau khi tạo.");
      }
    } catch (err: any) {
      alert(`LỖI HỆ THỐNG: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteMatch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc muốn xóa trận đấu này?`)) {
      await supabase.from('matches').delete().eq('id', id);
      fetchMatches();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900">Danh Sách Trận Đấu</h1>
            <p className="text-slate-500 font-medium">Hệ thống quản lý trực tuyến</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => { sessionStorage.removeItem('is_admin'); navigate('/'); }} className="px-6 py-4 rounded-2xl bg-white text-slate-400 font-bold border border-slate-200">Đăng xuất</button>
            <button 
              onClick={createNewMatch} 
              disabled={loading}
              className={`bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'ĐANG TẠO...' : 'TẠO TRẬN ĐẤU MỚI'}
            </button>
          </div>
        </header>

        {matches.length === 0 && !loading ? (
          <div className="bg-white rounded-[40px] p-20 text-center border-4 border-dashed border-slate-100">
             <div className="text-6xl mb-4">📭</div>
             <h3 className="text-xl font-bold text-slate-400">Chưa có trận đấu nào</h3>
             <p className="text-slate-300 mt-2">Hãy kiểm tra xem bạn đã chạy file database.sql trong Supabase chưa.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map(match => (
              <div key={match.id} onClick={() => navigate(`/manage/${match.code}`)} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest">MÃ: {match.code}</span>
                  <button onClick={(e) => deleteMatch(match.id, e)} className="text-slate-200 hover:text-rose-500 transition">✕</button>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{match.name}</h3>
                <p className="text-slate-400 text-xs">{new Date(match.created_at).toLocaleString('vi-VN')}</p>
                <div className="mt-6 flex gap-2">
                  <button className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-slate-800">Thiết lập</button>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/host/${match.code}`); }} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold hover:bg-emerald-600">Vào trận</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerMatchList;
