import React, { useEffect, useState } from 'react';
import { completeGoogleSignIn, signInWithGoogle } from '../services/supabaseAuth.js';

function getHomePath(role) {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  if (role === 'parent') return '/parent';
  return '/learn';
}

export default function AuthPage({ api, Brand, go, sessionKey }) {
  const [mode, setMode] = useState('login'); const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' }); const [message, setMessage] = useState({ text: '', type: '' }); const [busy, setBusy] = useState(false);
  const isParentRegistration = mode === 'register-parent';
  const isRegistration = mode !== 'login';
  const isOAuthCallback = window.location.pathname === '/auth/callback';
  const [callbackStatus, setCallbackStatus] = useState(isOAuthCallback ? 'loading' : 'idle');
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setBusy(true); setMessage({ text: '', type: '' });
    try { const endpoint = isParentRegistration ? 'register-parent' : mode; const data = await api(`/api/auth/${endpoint}`, { method: 'POST', body: JSON.stringify(form) });
      if (data.session) localStorage.setItem(sessionKey, JSON.stringify({ ...data.session, user: data.user, profile: data.profile }));
      setMessage({ text: data.message || 'Đăng nhập thành công.', type: 'success' });
      if (mode === 'login') setTimeout(() => go(getHomePath(data.profile?.role)), 400);
    } catch (error) { setMessage({ text: error.message, type: 'error' }); } finally { setBusy(false); }
  };
  const googleLogin = async () => {
    setBusy(true);
    setMessage({ text: '', type: '' });
    try {
      await signInWithGoogle();
    } catch (error) {
      setMessage({ text: error.message || 'Không thể đăng nhập bằng Google.', type: 'error' });
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!isOAuthCallback) return undefined;
    let cancelled = false;
    const finishGoogleSignIn = async () => {
      try {
        const providerError = new URLSearchParams(window.location.search).get('error_description')
          || new URLSearchParams(window.location.search).get('error');
        if (providerError) throw new Error(providerError);
        const session = await completeGoogleSignIn();
        const { profile } = await api('/api/auth/profile', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!profile) throw new Error('Không tải được hồ sơ người dùng sau khi đăng nhập Google.');
        if (cancelled) return;
        localStorage.setItem(sessionKey, JSON.stringify({ ...session, user: session.user, profile }));
        go(getHomePath(profile.role));
      } catch (error) {
        if (cancelled) return;
        setCallbackStatus('error');
        setMessage({ text: error.message || 'Không thể hoàn tất đăng nhập Google.', type: 'error' });
      }
    };
    finishGoogleSignIn();
    return () => { cancelled = true; };
  }, [api, go, isOAuthCallback, sessionKey]);
  if (isOAuthCallback) {
    return <main className="auth-shell"><Brand go={go} /><section className="form-panel oauth-callback"><div className="form-wrap"><h2>{callbackStatus === 'loading' ? 'Đang xác thực tài khoản...' : 'Không thể đăng nhập'}</h2><p className={`message ${message.type}`}>{message.text || 'Vui lòng chờ trong giây lát.'}</p>{callbackStatus === 'error' && <button className="submit" type="button" onClick={() => go('/')}>QUAY LẠI ĐĂNG NHẬP</button>}</div></section></main>;
  }
  return <main className="auth-shell"><Brand go={go} /><a className="help-chip" href="#help">Trợ giúp học tập</a><div className="floating-chip lesson-chip">💡 Học vui hơn mỗi ngày!</div><div className="floating-chip badge-chip">🏆 Nhận 100+ huy hiệu</div><span className="shape shape-one">✦</span><span className="shape shape-two">━</span><span className="shape shape-three">%</span><span className="shape shape-four">÷</span><span className="shape shape-five">+</span><div className="corner-math corner-math-top-left">3 &lt; 5</div><div className="corner-math corner-math-top-right">6 x 4 = 24</div><div className="corner-math corner-math-bottom-left">8 : 2 = 4</div><div className="corner-math corner-math-bottom-right">7 &gt; 2</div><div className="study-math study-math-left">3 + __ = 7</div><div className="study-math study-math-right">2 x 1 = 2<br />2 x 2 = 4<br />2 x 3 = 6</div><span className="study-shape study-triangle" aria-hidden="true" /><span className="study-shape study-rectangle" aria-hidden="true" /><span className="study-shape study-square" aria-hidden="true" /><span className="study-shape study-circle" aria-hidden="true" /><div className="bush bush-left" aria-hidden="true"><i /><i /><i /><b /><b /></div><div className="bush bush-right" aria-hidden="true"><i /><i /><i /><b /><b /></div><div className="fence fence-left" aria-hidden="true"><i /><i /><i /></div><div className="fence fence-right" aria-hidden="true"><i /><i /><i /></div>
    <section className="welcome-banner"><h1>{isParentRegistration ? 'Chào mừng phụ huynh đến với MathJoy! 👋' : 'Chào mừng bạn nhỏ đến với MathJoy! 👋'}</h1><p>{isParentRegistration ? 'Cùng đồng hành và theo dõi hành trình học tập của con.' : 'Cùng khám phá những điều thú vị trong thế giới Toán học nhé.'}</p></section>
    <section className="form-panel"><div className="login-art"><img src="/public/img/default.png" alt="" /></div><div className="form-wrap">    <div className="heading"><h2>{mode === 'login' ? 'Đăng nhập cổng học tập' : isParentRegistration ? 'Đăng ký tài khoản phụ huynh' : 'Đăng ký tài khoản học sinh'}</h2><p>{mode === 'login' ? 'Nhập thông tin tài khoản để tiếp tục' : 'Tạo tài khoản để bắt đầu sử dụng MathJoy'}</p></div>
      <p className="section-label">NHẬP THÔNG TIN TÀI KHOẢN:</p><form onSubmit={submit}>{isRegistration && <div className="field"><label>Họ tên {isParentRegistration ? 'phụ huynh' : 'học sinh'}</label><input value={form.fullName} onChange={update('fullName')} required minLength="2" maxLength="120" placeholder={isParentRegistration ? 'Nguyễn Thị Lan' : 'Nguyễn Văn An'} /></div>}<div className="field"><label>Email</label><input type="email" value={form.email} onChange={update('email')} required placeholder="email@example.com" /></div><div className="field"><label>Mật khẩu bí mật</label><div className="password-input"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} required minLength="6" placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)}>◉</button></div></div><button className="submit" disabled={busy}>{busy ? 'ĐANG XỬ LÝ...' : mode === 'login' ? 'ĐĂNG NHẬP NGAY 🚀' : 'ĐĂNG KÝ NGAY 🚀'}</button></form>
      {!isParentRegistration && <><div className="oauth-divider"><span>hoặc</span></div><button className="google-button" type="button" onClick={googleLogin} disabled={busy}>{busy ? 'ĐANG KẾT NỐI...' : 'G  Tiếp tục với Google'}</button></>}
      <p className={`message ${message.type}`}>{message.text}</p>{mode === 'login' ? <><p className="switch-text">Chưa có tài khoản? <button type="button" onClick={() => { setMode('register'); setMessage({ text: '', type: '' }); }}>Đăng ký học sinh</button></p><p className="switch-text">Phụ huynh mới? <button type="button" onClick={() => { setMode('register-parent'); setMessage({ text: '', type: '' }); }}>Đăng ký phụ huynh</button></p><p className="switch-text">Tài khoản giáo viên được tạo bởi quản lý nhà trường.</p></> : <p className="switch-text">Đã có tài khoản? <button type="button" onClick={() => { setMode('login'); setMessage({ text: '', type: '' }); }}>Đăng nhập</button></p>}</div></section><footer>© 2026 MathJoy Việt Nam. Phát triển bởi những người yêu Toán dành cho trẻ em Việt Nam.</footer></main>;
}
