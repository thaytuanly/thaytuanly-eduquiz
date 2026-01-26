
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Giả lập đăng nhập đơn giản cho môi trường demo
    if (username === 'admin' && password === 'admin123') {
      sessionStorage.setItem('is_admin', 'true');
      navigate('/manage-list');
    } else {
      setError('Sai tên đăng nhập hoặc mật khẩu!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-indigo-200">🔐</div>
          <h1 className="text-3xl font-black text-slate-900">Quản Trị Viên</h1>
          <p className="text-slate-500 font-medium">Vui lòng đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && <p className="bg-rose-50 text-rose-500 p-3 rounded-xl text-sm font-bold text-center border border-rose-100">{error}</p>}
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">User Name</label>
            <input 
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Password</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition shadow-xl active:scale-95"
          >
            ĐĂNG NHẬP
          </button>
          
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="w-full text-slate-400 font-bold py-2 text-sm hover:text-slate-600 transition"
          >
            Quay lại trang chủ
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
