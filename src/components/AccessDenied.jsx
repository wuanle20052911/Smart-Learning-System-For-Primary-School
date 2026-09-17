import React, { useEffect } from 'react';

export default function AccessDenied({ destination, go }) {
  useEffect(() => {
    const timer = window.setTimeout(() => go(destination), 900);
    return () => window.clearTimeout(timer);
  }, [destination]);
  return <main className="access-denied"><div className="access-denied-card"><div className="access-denied-icon">🔒</div><h1>Bạn không có quyền truy cập</h1><p>Trang này chỉ dành cho tài khoản có quyền phù hợp.</p><small>Đang chuyển bạn về khu vực được phép...</small></div></main>;
}
