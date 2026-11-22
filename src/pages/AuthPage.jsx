import React, { useEffect, useRef, useState } from 'react';
import { completeGoogleSignIn, signInWithGoogle } from '../services/supabaseAuth.js';

function getHomePath(role) {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  if (role === 'parent') return '/parent';
  return '/learn';
}

function Sparkle({ className = '' }) {
  return <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 1c2.7 9.8 5.2 12.3 15 15-9.8 2.7-12.3 5.2-15 15C13.3 21.2 10.8 18.7 1 16 10.8 13.3 13.3 10.8 16 1Z" /></svg>;
}

function Arrow() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
}

function SnowCap({ side }) {
  return <svg className={`mj-snow-cap mj-snow-cap-${side}`} viewBox="0 0 130 76" fill="none" aria-hidden="true"><path d="M7 63C-1 43 11 14 32 10c14-3 21 4 32 2C79 9 88 1 104 5c17 4 25 17 17 26-7 9-20 5-27 9-7 5-7 16-18 17-15 2-16-13-28-12-16 1-15 30-29 28-6 0-10-5-12-10Z" fill="#c8eafd" stroke="#409bdb" strokeWidth="2" /><path d="M13 52c-2-17 7-32 23-33 13-1 18 6 30 3 15-3 26-13 39-9 7 2 12 6 13 10-10 7-18 1-29 10-10 8-10 15-17 14-9-2-15-15-28-10-16 6-17 24-25 26-3 1-5-5-6-11Z" fill="#fff" /><path d="M32 18c14-4 21 5 33 1" stroke="#fff" strokeWidth="5" strokeLinecap="round" /></svg>;
}

function ChristmasStar({ id = 'mj-gold' }) {
  return <svg className="mj-christmas-star" viewBox="0 0 90 90" aria-hidden="true"><defs><linearGradient id={id} x1="20" y1="5" x2="60" y2="85" gradientUnits="userSpaceOnUse"><stop stopColor="#fff49d" /><stop offset=".48" stopColor="#ffd934" /><stop offset="1" stopColor="#ff9c00" /></linearGradient></defs><path d="m45 7 12 24 27 4-20 19 5 27-24-13-24 13 5-27L6 35l27-4Z" fill="#ae5a16" transform="translate(0 3)" stroke="#ae5a16" strokeWidth="5" strokeLinejoin="round" /><path d="m45 7 12 24 27 4-20 19 5 27-24-13-24 13 5-27L6 35l27-4Z" fill={`url(#${id})`} stroke="#ffb31e" strokeWidth="4" strokeLinejoin="round" /><path d="m41 19-9 18-15 3m11 24 4-14" fill="none" stroke="#fff9c4" strokeWidth="5" strokeLinecap="round" /><ellipse cx="42" cy="43" rx="3" ry="4" fill="#a05a19" /><ellipse cx="56" cy="43" rx="3" ry="4" fill="#a05a19" /><path d="M44 54q6 7 12-1" fill="none" stroke="#a05a19" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

function CandyCane() {
  return <svg className="mj-candy-cane" viewBox="0 0 50 100" aria-hidden="true"><defs><pattern id="mj-candy-stripes" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="18" height="18" fill="#fff8ee" /><rect width="8" height="18" fill="#dc3f4b" /></pattern></defs><path d="M14 89V24c0-22 28-22 28 0v9" stroke="#943f3c" strokeOpacity=".3" strokeWidth="14" fill="none" strokeLinecap="round" transform="translate(1 2)" /><path d="M14 89V24c0-22 28-22 28 0v9" stroke="url(#mj-candy-stripes)" strokeWidth="12" fill="none" strokeLinecap="round" /><path d="m17 58-13-6 2 14 11-8 12 9 2-15Z" fill="#e5494d" stroke="#b52d3c" strokeWidth="1.5" /><circle cx="17" cy="58" r="4" fill="#ffcf65" /></svg>;
}

function GoogleLogo() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.4H3a10 10 0 0 0 0 9.2l3.4-2.7Z" /><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7A6 6 0 0 1 12 6Z" /></svg>;
}

const HEADINGS = {
  login: { title: 'Chào mừng bé trở lại!', sub: 'Đăng nhập để tiếp tục hành trình khám phá nhé.', submit: 'Vào học thôi nào!' },
  register: { title: 'Tạo tài khoản cho bé', sub: 'Nhờ ba mẹ cùng điền thông tin để bắt đầu học nhé.', submit: 'Tạo tài khoản!' },
  'register-parent': { title: 'Tài khoản phụ huynh', sub: 'Đồng hành và theo dõi hành trình học tập của con.', submit: 'Đăng ký phụ huynh' }
};

const DIALOGS = {
  parents: {
    title: 'Góc phụ huynh',
    body: <>
      <p>Ba mẹ có thể <b>đăng ký tài khoản phụ huynh</b> ngay tại trang này, rồi thêm số điện thoại trong <b>Thông tin cá nhân</b>.</p>
      <p>Sau đó bé gửi yêu cầu liên kết tới số điện thoại của ba mẹ (hoặc nhờ nhà trường kết nối). Khi ba mẹ xác nhận, tiến độ học tập, nhận xét của thầy cô và tin nhắn với giáo viên sẽ hiện trong trang phụ huynh.</p>
    </>,
    action: 'register-parent',
    actionLabel: 'Đăng ký phụ huynh'
  },
  forgot: {
    title: 'Bé quên mật khẩu rồi à?',
    body: <>
      <p>Không sao đâu! Bé hãy nhờ ba mẹ <b>liên hệ thầy cô hoặc nhà trường</b> để được hỗ trợ đặt lại mật khẩu nhé.</p>
      <p>Nếu bé từng đăng nhập bằng Google, hãy thử nút <b>Đăng nhập với Google</b>.</p>
    </>
  }
};

export default function AuthPage({ api, go, sessionKey }) {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);
  const isParentRegistration = mode === 'register-parent';
  const isRegistration = mode !== 'login';
  const isOAuthCallback = window.location.pathname === '/auth/callback';
  const [callbackStatus, setCallbackStatus] = useState(isOAuthCallback ? 'loading' : 'idle');
  const heading = HEADINGS[mode];

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const switchMode = (next) => { setMode(next); setMessage({ text: '', type: '' }); };

  useEffect(() => {
    if (dialog) dialogRef.current?.showModal?.();
    else dialogRef.current?.close?.();
  }, [dialog]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage({ text: '', type: '' });
    try {
      const endpoint = isParentRegistration ? 'register-parent' : mode;
      const data = await api(`/api/auth/${endpoint}`, { method: 'POST', body: JSON.stringify(form) });
      if (data.session) localStorage.setItem(sessionKey, JSON.stringify({ ...data.session, user: data.user, profile: data.profile }));
      setMessage({ text: data.message || 'Đăng nhập thành công.', type: 'success' });
      if (mode === 'login') setTimeout(() => go(getHomePath(data.profile?.role)), 400);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setBusy(false);
    }
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
        const params = new URLSearchParams(window.location.search);
        const providerError = params.get('error_description') || params.get('error');
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

  const brand = <a className="mj-brand" href="/" onClick={(event) => { event.preventDefault(); go('/'); }} aria-label="MathJoy - Học toán thật vui"><Sparkle className="mj-brand-sparkle" /><span>MathJoy<small>HỌC TOÁN THẬT VUI</small></span></a>;
  const snow = <div className="mj-snowfall" aria-hidden="true">
    {Array.from({ length: 32 }, (_, i) => <span key={i} className="mj-snowflake" style={{ left: `${(i * 47) % 100}%`, width: `${3 + (i % 5)}px`, height: `${3 + (i % 5)}px`, animationDuration: `${13 + (i % 9)}s`, animationDelay: `${-i * 1.7}s` }} />)}
  </div>;

  if (isOAuthCallback) {
    return <div className="mj-auth">
      {snow}
      <header className="mj-header">{brand}</header>
      <main className="mj-main">
        <section className="mj-card" aria-live="polite">
          <SnowCap side="left" /><SnowCap side="right" />
          <div className="mj-panel mj-callback">
            <ChristmasStar />
            <h2>{callbackStatus === 'loading' ? 'Đang xác thực tài khoản...' : 'Chưa đăng nhập được'}</h2>
            <p className={`mj-notice ${message.type}`}>{message.text || 'Bé chờ một chút nhé!'}</p>
            {callbackStatus === 'error' && <button className="mj-primary" type="button" onClick={() => go('/')}>Quay lại đăng nhập <Arrow /></button>}
          </div>
        </section>
      </main>
    </div>;
  }

  return <div className="mj-auth">
    {snow}

    <header className="mj-header">
      {brand}
      <button className="mj-help-button" type="button" onClick={() => setDialog('parents')}><span className="mj-question-mark">?</span> Góc phụ huynh <Arrow /></button>
    </header>

    <main className="mj-main">
      <div className="mj-welcome">
        <span className="mj-season-label"><Sparkle /> GIÁNG SINH DIỆU KỲ CÙNG MATHJOY <Sparkle /></span>
        <h1>Học thật vui, <span>đón Noel!</span></h1>
        <p>Một thế giới Toán học đầy bất ngờ đang chờ bé khám phá!</p>
      </div>

      <section className="mj-card" aria-labelledby="mj-login-title">
        <SnowCap side="left" /><SnowCap side="right" />
        <Sparkle className="mj-card-sparkle mj-card-sparkle-left" /><Sparkle className="mj-card-sparkle mj-card-sparkle-right" />
        <div className="mj-panel">
          <div className="mj-form-heading"><ChristmasStar /><h2 id="mj-login-title">{heading.title}</h2><p>{heading.sub}</p></div>

          <form className="mj-form" onSubmit={submit}>
            {isRegistration && <>
              <label htmlFor="mj-fullname">Họ tên {isParentRegistration ? 'phụ huynh' : 'của bé'}</label>
              <div className="mj-input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7" /></svg>
                <input id="mj-fullname" value={form.fullName} onChange={update('fullName')} required minLength="2" maxLength="120" placeholder={isParentRegistration ? 'Ví dụ: Nguyễn Thị Lan' : 'Ví dụ: Nguyễn Văn An'} autoComplete="name" />
              </div>
            </>}

            <label htmlFor="mj-email" className={isRegistration ? 'mj-gap' : ''}>Email {isParentRegistration ? 'của ba mẹ' : <>của bé <span>(hoặc của ba mẹ)</span></>}</label>
            <div className="mj-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
              <input id="mj-email" type="email" value={form.email} onChange={update('email')} placeholder="Nhập email" required autoComplete="email" />
            </div>

            <div className="mj-password-label">
              <label htmlFor="mj-password">Mật khẩu bí mật</label>
              {mode === 'login' && <button type="button" className="mj-link mj-forgot" onClick={() => setDialog('forgot')}>Quên mật khẩu?</button>}
            </div>
            <div className="mj-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></svg>
              <input id="mj-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} placeholder={isRegistration ? 'Ít nhất 6 ký tự' : 'Nhập mật khẩu bí mật'} required minLength="6" autoComplete={isRegistration ? 'new-password' : 'current-password'} />
              <button className="mj-eye" type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg></button>
            </div>

            <button type="submit" className="mj-primary" disabled={busy}>{busy ? 'Đang xử lý...' : <>{heading.submit} <Arrow /></>}</button>
          </form>

          {!isParentRegistration && <>
            <div className="mj-divider"><span />hoặc tiếp tục với<span /></div>
            <button className="mj-google" type="button" onClick={googleLogin} disabled={busy}><GoogleLogo />{busy ? 'Đang kết nối...' : 'Đăng nhập với Google'}</button>
          </>}

          {message.text && <p className={`mj-notice ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}

          {mode === 'login' ? <>
            <p className="mj-switch">Bé chưa có tài khoản? <button type="button" className="mj-link" onClick={() => switchMode('register')}>Đăng ký ngay <span aria-hidden="true">↗</span></button></p>
            <p className="mj-switch">Ba mẹ mới? <button type="button" className="mj-link" onClick={() => switchMode('register-parent')}>Đăng ký phụ huynh</button></p>
            <p className="mj-switch mj-muted">Tài khoản giáo viên do nhà trường cấp.</p>
          </> : <p className="mj-switch">Đã có tài khoản? <button type="button" className="mj-link" onClick={() => switchMode('login')}>Đăng nhập</button></p>}

          <div className="mj-safe"><svg width="15" height="17" viewBox="0 0 16 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m8 1 6 2v5c0 4-6 8-6 8S2 12 2 8V3l6-2Z" /><path d="m5 8 2 2 4-4" /></svg>An toàn cho bé · An tâm cho ba mẹ</div>
        </div>
        <CandyCane />
      </section>

      <p className="mj-below"><Sparkle /> Mỗi ngày một điều hay, mỗi ngày thêm giỏi Toán!</p>
    </main>

    <footer className="mj-footer"><span>© {new Date().getFullYear()} MathJoy · Học toán thật vui</span><button type="button" onClick={() => setDialog('parents')}>Ba mẹ cần hỗ trợ?</button></footer>

    <dialog ref={dialogRef} className="mj-dialog" aria-labelledby="mj-dialog-title" onCancel={() => setDialog(null)} onClick={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
      {dialog && <>
        <button type="button" className="mj-close" aria-label="Đóng" onClick={() => setDialog(null)}>×</button>
        <ChristmasStar id="mj-gold-dialog" />
        <h2 id="mj-dialog-title">{DIALOGS[dialog].title}</h2>
        <div className="mj-dialog-body">{DIALOGS[dialog].body}</div>
        {DIALOGS[dialog].action
          ? <button type="button" className="mj-primary" onClick={() => { switchMode(DIALOGS[dialog].action); setDialog(null); }}>{DIALOGS[dialog].actionLabel} <Arrow /></button>
          : <button type="button" className="mj-primary" onClick={() => setDialog(null)}>Mình hiểu rồi! <Arrow /></button>}
      </>}
    </dialog>
  </div>;
}
