import React from 'react';

export default function Brand({ href = '/', go }) { return <a className="brand" href={href} onClick={(e) => { e.preventDefault(); go(href); }}><span className="brand-mark">✦</span><span><strong className="brand-name">MathJoy</strong><small className="brand-subtitle">HỌC TOÁN THẬT VUI</small></span></a>; }
