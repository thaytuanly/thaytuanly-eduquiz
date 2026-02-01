
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';

const LoginView: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Đăng ký giáo viên mới
        const { data: existing } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
        if (existing) {
          setError('Tên đăng nhập đã tồn tại!');
          setLoading(false);
          return;
        }

        const { data, error: regError } = await supabase.from('users').insert([{
          username,
          password,
          role: 'teacher',
          full_name: fullName || username
        }]).select().single();

        if (regError) throw regError;
        
        // Tự động đăng nhập sau khi đăng ký
        sessionStorage.setItem('is_admin', data.role === 'admin' ? 'true' : 'false');
        sessionStorage.setItem('user_id', data.id);
        sessionStorage.setItem('user_role', data.role);
        sessionStorage.setItem('user_name', data.full_name || data.username);
        navigate('/manage-list');
      } else {
        // Đăng nhập
        const { data, error: loginError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .eq('password', password)
          .maybeSingle();

        if (!data) {
          setError('Sai tên đăng nhập hoặc mật khẩu!');
          setLoading(false);
          return;
        }

        sessionStorage.setItem('is_admin', data.role === 'admin' ? 'true' : 'false');
        sessionStorage.setItem('user_id', data.id);
        sessionStorage.setItem('user_role', data.role);
        sessionStorage.setItem('user_name', data.full_name || data.username);
        navigate('/manage-list');
      }
    } catch (err: any) {
      setError('Lỗi hệ thống: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-indigo-200">
            {isRegister ? '📝' : '🔐'}
          </div>
          <h1 className="text-3xl font-black text-slate-900">{isRegister ? 'Đăng Ký Giáo Viên' : 'Đăng Nhập Quản Trị'}</h1>
          <p className="text-slate-500 font-medium">{isRegister ? 'Tạo tài khoản để tổ chức trận đấu' : 'Vui lòng đăng nhập để tiếp tục'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="bg-rose-50 text-rose-500 p-3 rounded-xl text-sm font-bold text-center border border-rose-100">{error}</p>}
          
          {isRegister && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Họ và Tên</label>
              <input 
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>
          )}

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
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? 'ĐANG XỬ LÝ...' : (isRegister ? 'ĐĂNG KÝ NGAY' : 'ĐĂNG NHẬP')}
          </button>
          
          <div className="text-center">
            <button 
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-indigo-600 font-bold text-sm hover:underline"
            >
              {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký giáo viên'}
            </button>
          </div>

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
