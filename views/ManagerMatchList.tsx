
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';

interface MatchInfo {
  id: string;
  code: string;
  name: string;
  created_at: string;
  owner_id?: string;
}

const ManagerMatchList: React.FC = () => {
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  const userId = sessionStorage.getItem('user_id');
  const userRole = sessionStorage.getItem('user_role');

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    setUserName(sessionStorage.getItem('user_name') || '');
    fetchMatches();
  }, [navigate, userId]);

  const fetchMatches = async () => {
    try {
      let query = supabase.from('matches').select('*');
      
      // Nếu không phải admin, chỉ lấy trận đấu của chính mình
      if (userRole !== 'admin') {
        query = query.eq('owner_id', userId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error("Fetch error:", error);
      }
      setMatches(data || []);
    } catch (err) {
      console.error("Hệ thống chưa kết nối được Supabase:", err);
    }
  };

  const createNewMatch = async () => {
    if (!userId) return;
    setLoading(true);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      const { data, error } = await supabase.from('matches').insert([
        { 
          code: newCode, 
          name: `Trận đấu của ${userName} - ${newCode}`, 
          status: 'LOBBY',
          current_question_index: -1,
          timer: 0,
          owner_id: userId // Gán chủ sở hữu
        }
      ]).select();

      if (error) {
        alert(`LỖI DATABASE: ${error.message}`);
        setLoading(false);
        return;
      }
      
      if (data && data.length > 0) {
        navigate(`/manage/${newCode}`);
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

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900">Chào, {userName}</h1>
            <p className="text-slate-500 font-medium">Vai trò: <span className="uppercase text-indigo-600">{userRole === 'admin' ? 'Quản trị viên toàn hệ thống' : 'Giáo viên'}</span></p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleLogout} className="px-6 py-4 rounded-2xl bg-white text-slate-400 font-bold border border-slate-200">Đăng xuất</button>
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
             <h3 className="text-xl font-bold text-slate-400">Bạn chưa tạo trận đấu nào</h3>
             <p className="text-slate-300 mt-2">Nhấn nút "Tạo trận đấu mới" để bắt đầu tổ chức thi đấu.</p>
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
