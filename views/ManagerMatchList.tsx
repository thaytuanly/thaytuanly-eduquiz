
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface MatchInfo {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

const ManagerMatchList: React.FC = () => {
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('is_admin') !== 'true') {
      navigate('/login');
      return;
    }
    fetchMatches();
  }, [navigate]);

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
    setMatches(data || []);
  };

  const createNewMatch = async () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const { data, error } = await supabase.from('matches').insert([
      { code: newCode, name: `Trận đấu ${newCode}` }
    ]).select().single();

    if (error) return alert("Lỗi khi tạo trận đấu");
    navigate(`/manage/${newCode}`);
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
            <h1 className="text-4xl font-black text-slate-900">Danh Sách Trận Đấu (Cloud)</h1>
            <p className="text-slate-500 font-medium">Lưu trữ trực tuyến trên Supabase</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => { sessionStorage.removeItem('is_admin'); navigate('/'); }} className="px-6 py-4 rounded-2xl bg-white text-slate-400 font-bold border border-slate-200">Đăng xuất</button>
            <button onClick={createNewMatch} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-lg">TẠO TRẬN ĐẤU MỚI</button>
          </div>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map(match => (
            <div key={match.id} onClick={() => navigate(`/manage/${match.code}`)} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 hover:border-indigo-300 transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest">MÃ: {match.code}</span>
                <button onClick={(e) => deleteMatch(match.id, e)} className="text-slate-300 hover:text-rose-500 transition">✕</button>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{match.name}</h3>
              <p className="text-slate-400 text-xs">{new Date(match.created_at).toLocaleString('vi-VN')}</p>
              <div className="mt-6 flex gap-2">
                <button className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">Thiết lập</button>
                <button onClick={(e) => { e.stopPropagation(); navigate(`/host/${match.code}`); }} className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold">Vào trận</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManagerMatchList;
