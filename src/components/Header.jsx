import React, { useEffect, useState } from 'react';

export default function Header({ title = 'MathJoy', children, Brand, readSession, go, logout }) {
  const session = readSession();
  const avatarUrl = session?.profile?.avatar_url || '/public/img/avt/0ccb37e913a1419dc0063d7251243783.jpg';
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeMenu = (event) => {
      if (!event.target.closest('.profile-menu-wrap')) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);
  const menuLink = (path) => (event) => {
    event.preventDefault();
    setMenuOpen(false);
    go(path);
  };
  return <header className="topbar"><Brand href="/learn" go={go} /><div className="top-actions">{children}<div className="profile-menu-wrap" onClick={(event) => event.stopPropagation()}><button className="header-avatar" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Mở menu tài khoản" aria-expanded={menuOpen}><img src={avatarUrl} alt="" /></button>{menuOpen && <div className="profile-dropdown"><a href="/profile" onClick={menuLink('/profile')}>👤 Thông tin cá nhân</a><a href="/history" onClick={menuLink('/history')}>📖 Lịch sử làm bài</a><button type="button" onClick={logout}>🚪 Đăng xuất</button></div>}</div></div></header>;
}
