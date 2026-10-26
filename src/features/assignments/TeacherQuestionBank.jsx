import React, { useEffect, useState } from 'react';
import { getLessonDisplayTitle } from '../../services/learningMaterials.js';

export default function TeacherQuestionBank({ api, onMessage }) {
   const [questions, setQuestions] = useState([]);
   const [lessons, setLessons] = useState([]);
   const [busy, setBusy] = useState(true);
   const load = () => {
     setBusy(true);
     Promise.all([api('/api/questions'), api('/api/lessons/mine')])
       .then(([questionData, lessonData]) => {
         setQuestions(questionData.questions || []);
         setLessons(lessonData.lessons || []);
       })
       .catch((error) => onMessage(`Không thể tải ngân hàng câu hỏi: ${error.message}`))
       .finally(() => setBusy(false));
   };
   useEffect(() => { load(); }, []);
   const remove = async (id) => {
     try {
       await api(`/api/questions/${id}`, { method: 'DELETE' });
       setQuestions((items) => items.filter((item) => item.id !== id));
       onMessage('Đã xóa câu hỏi khỏi ngân hàng.');
     } catch (error) {
       onMessage(`Không thể xóa câu hỏi: ${error.message}`);
     }
   };
   return <section className="teacher-card student-list-panel"><div className="student-list-head"><div><span className="panel-kicker">TÁI SỬ DỤNG CÂU HỎI</span><h2>Ngân hàng câu hỏi</h2><p>Các câu hỏi giáo viên đã lưu để dùng lại cho nhiều bài tập.</p></div><button className="secondary-studio" type="button" onClick={load}>↻ Làm mới</button></div>{busy ? <p className="student-list-empty">Đang tải...</p> : questions.length ? <div className="submission-list">{questions.map((item) => { const lesson = lessons.find((entry) => entry.id === item.lesson_id); return <article className="submission-row" key={item.id}><span><strong>{item.question}</strong><small>{item.type}{lesson ? ` · ${getLessonDisplayTitle(lesson)}` : item.lesson_id ? ` · Lesson ID: ${item.lesson_id}` : ''} · Lưu ngày {new Date(item.created_at).toLocaleDateString('vi-VN')}</small></span><button className="secondary-studio" type="button" onClick={() => remove(item.id)}>Xóa</button></article>; })}</div> : <p className="student-list-empty">Chưa có câu hỏi. Hãy lưu câu hỏi sau khi AI tạo và chỉnh sửa.</p>}</section>;
}
