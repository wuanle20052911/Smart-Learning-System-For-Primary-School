import React, { useEffect, useMemo, useRef, useState } from 'react';
import ParentIcon from './ParentIcons.jsx';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HEAT_STEPS = [
  { min: 0, label: 'Chưa học' },
  { min: 1, label: '1 hoạt động' },
  { min: 2, label: '2–3 hoạt động' },
  { min: 4, label: 'Từ 4 hoạt động' }
];

function shiftDay(key, delta) {
  return new Date(new Date(`${key}T00:00:00Z`).getTime() + delta * 86400000).toISOString().slice(0, 10);
}

function weekdayIndex(key) {
  return (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function shortDate(key) {
  const [, month, day] = key.split('-');
  return `${Number(day)}/${Number(month)}`;
}

function heatLevel(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  return count <= 3 ? 2 : 3;
}

function describeDay(day) {
  if (!day || !day.activities) return `${shortDate(day?.date || '')}: chưa có hoạt động`;
  const parts = [];
  if (day.attempts) parts.push(`${day.attempts} lượt luyện tập`);
  if (day.submissions) parts.push(`${day.submissions} bài nộp`);
  if (day.lessons) parts.push(`${day.lessons} bài học`);
  const accuracy = day.accuracy === null ? '' : ` · đúng ${day.accuracy}%`;
  return `${shortDate(day.date)}: ${parts.join(', ')}${accuracy}`;
}

function topRoundedBar(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height);
  return `M${x} ${y + height}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${y + height}Z`;
}

function useElementWidth(fallback) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const update = () => setWidth(Math.max(240, Math.round(element.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function AccuracyChart({ days, onHover, hovered, width }) {
  const height = 180;
  const pad = { top: 12, right: 8, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const slot = plotW / days.length;
  const barW = Math.max(4, Math.min(28, slot - 4));
  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(plotW / 44))));
  const y = (value) => pad.top + plotH - (value / 100) * plotH;

  return <svg className="parent-activity-chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ độ chính xác luyện tập theo ngày" onMouseLeave={() => onHover(null)}>
    {[0, 50, 100].map((tick) => <g key={tick}>
      <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? 'baseline' : 'grid'} />
      <text x={pad.left - 6} y={y(tick) + 3.5} textAnchor="end" className="axis">{tick}%</text>
    </g>)}
    {days.map((day, index) => {
      const cx = pad.left + slot * index + slot / 2;
      const isHovered = hovered?.date === day.date;
      const show = labelEvery === 1 || index % labelEvery === (days.length - 1) % labelEvery;
      return <g key={day.date}>
        {day.accuracy === null
          ? <circle cx={cx} cy={y(0) - 3} r="2.2" className="empty" />
          : <path d={topRoundedBar(cx - barW / 2, y(Math.max(day.accuracy, 2)), barW, y(0) - y(Math.max(day.accuracy, 2)), 4)} className={`bar${isHovered ? ' hovered' : ''}`} />}
        {show && <text x={cx} y={height - 8} textAnchor="middle" className="axis">{shortDate(day.date)}</text>}
        <rect
          x={pad.left + slot * index}
          y={pad.top}
          width={slot}
          height={plotH}
          className="hit"
          tabIndex="0"
          aria-label={describeDay(day)}
          onMouseEnter={() => onHover(day, (cx / width) * 100)}
          onFocus={() => onHover(day, (cx / width) * 100)}
          onBlur={() => onHover(null)}
        />
      </g>;
    })}
  </svg>;
}

function ActivityCalendar({ days, today, onHover, hovered }) {
  const dayByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const start = shiftDay(today, -weekdayIndex(today) - 28);
  const cells = Array.from({ length: 35 }, (_, index) => {
    const date = shiftDay(start, index);
    return { date, day: dayByDate.get(date) || { date, activities: 0, attempts: 0, submissions: 0, lessons: 0, accuracy: null }, future: date > today };
  });

  return <div className="parent-calendar" role="grid" aria-label="Lịch học 5 tuần gần đây">
    <div className="parent-calendar-row parent-calendar-head" role="row">
      {WEEKDAYS.map((label) => <span key={label} role="columnheader">{label}</span>)}
    </div>
    {[0, 1, 2, 3, 4].map((week) => <div className="parent-calendar-row" role="row" key={week}>
      {cells.slice(week * 7, week * 7 + 7).map(({ date, day, future }) => <span
        key={date}
        role="gridcell"
        tabIndex={future ? -1 : 0}
        aria-label={future ? `${shortDate(date)}: chưa tới` : describeDay(day)}
        className={`parent-calendar-cell level-${future ? 'future' : heatLevel(day.activities)}${date === today ? ' today' : ''}${hovered?.date === date ? ' hovered' : ''}`}
        onMouseEnter={() => !future && onHover(day)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => !future && onHover(day)}
        onBlur={() => onHover(null)}
      >{Number(date.slice(8))}</span>)}
    </div>)}
  </div>;
}

export default function ParentActivity({ activity }) {
  const [range, setRange] = useState(7);
  const [chartHover, setChartHover] = useState(null);
  const [calendarHover, setCalendarHover] = useState(null);
  const [chartRef, chartWidth] = useElementWidth(560);
  if (!activity) return null;

  const days = activity.days.slice(-range);
  const activeDays = range === 7 ? activity.active_days_7 : activity.active_days_30;
  const totals = days.reduce((sum, day) => ({ correct: sum.correct + day.correct, total: sum.total + day.total }), { correct: 0, total: 0 });
  const rangeAccuracy = totals.total ? Math.round((totals.correct / totals.total) * 100) : null;
  const { streak } = activity;

  return <>
    <div className="parent-streaks">
      <article className="parent-streak-main">
        <ParentIcon name="flame" size={40} />
        <div>
          <strong>{streak.current} ngày</strong>
          <small>Chuỗi ngày học liên tục</small>
          <em>{streak.current
            ? streak.active_today ? 'Hôm nay con đã học rồi!' : 'Hôm nay con học tiếp để giữ chuỗi nhé!'
            : 'Cùng con bắt đầu chuỗi mới hôm nay nhé!'}</em>
        </div>
      </article>
      <article><strong>{streak.longest} ngày</strong><small>Chuỗi dài nhất</small></article>
      <article><strong>{activeDays}/{range} ngày</strong><small>Có học trong {range} ngày qua</small></article>
      <article><strong>{rangeAccuracy === null ? '—' : `${rangeAccuracy}%`}</strong><small>Độ chính xác {range} ngày qua</small></article>
    </div>

    <div className="parent-activity-grid">
      <div className="parent-activity-panel">
        <div className="parent-activity-panel-head">
          <h4>Độ chính xác luyện tập mỗi ngày</h4>
          <div className="parent-range" role="group" aria-label="Chọn khoảng thời gian">
            {[7, 30].map((value) => <button key={value} type="button" className={range === value ? 'active' : ''} aria-pressed={range === value} onClick={() => { setRange(value); setChartHover(null); }}>{value} ngày</button>)}
          </div>
        </div>
        <div className="parent-chart-wrap" ref={chartRef}>
          <AccuracyChart width={chartWidth} days={days} hovered={chartHover?.day} onHover={(day, left) => setChartHover(day ? { day, left } : null)} />
          {chartHover && <div className="parent-chart-tooltip" style={{ left: `${Math.min(Math.max(chartHover.left, 18), 82)}%` }} role="status">{describeDay(chartHover.day)}</div>}
        </div>
        <p className="parent-chart-note"><i className="dot" /> Ngày không có lượt luyện tập</p>
      </div>

      <div className="parent-activity-panel">
        <div className="parent-activity-panel-head"><h4>Lịch học 5 tuần gần đây</h4></div>
        <ActivityCalendar days={activity.days} today={activity.today} hovered={calendarHover} onHover={setCalendarHover} />
        <p className="parent-calendar-status" aria-live="polite">{calendarHover ? describeDay(calendarHover) : 'Rê chuột hoặc chạm vào một ngày để xem chi tiết.'}</p>
        <div className="parent-heat-legend" aria-label="Chú thích màu">
          <span>Ít</span>
          {HEAT_STEPS.map((step, index) => <i key={step.label} className={`level-${index}`} title={step.label} />)}
          <span>Nhiều</span>
        </div>
      </div>
    </div>

    <details className="parent-activity-table">
      <summary>Xem dạng bảng</summary>
      <table>
        <thead><tr><th>Ngày</th><th>Luyện tập</th><th>Bài nộp</th><th>Bài học</th><th>Độ chính xác</th></tr></thead>
        <tbody>{[...days].reverse().map((day) => <tr key={day.date}>
          <td>{shortDate(day.date)}</td><td>{day.attempts}</td><td>{day.submissions}</td><td>{day.lessons}</td><td>{day.accuracy === null ? '—' : `${day.accuracy}%`}</td>
        </tr>)}</tbody>
      </table>
    </details>
  </>;
}
