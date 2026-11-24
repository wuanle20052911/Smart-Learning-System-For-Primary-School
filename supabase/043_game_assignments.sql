-- Bài tập dạng trò chơi: giáo viên chọn mẫu trò chơi và tự soạn nội dung.
-- Mỗi dòng assignment_questions vẫn là một mục được chấm điểm; game_type quyết định cách hiển thị.
alter table public.assignments
  add column if not exists game_type text,
  add column if not exists game_settings jsonb not null default '{}'::jsonb;

alter table public.assignments
  drop constraint if exists assignments_game_type_check;

alter table public.assignments
  add constraint assignments_game_type_check
  check (game_type is null or game_type in (
    'quiz', 'match-up', 'group-sort', 'ordering', 'cloze',
    'find-match', 'open-box', 'gameshow', 'digit-arrange'
  ));

-- Thêm hai dạng câu mới: sắp xếp thứ tự và điền vào chỗ trống nhiều ô.
alter table public.assignment_questions
  drop constraint if exists assignment_questions_type_check;

alter table public.assignment_questions
  add constraint assignment_questions_type_check
  check (type in ('multiple-choice', 'true-false', 'fill-blank', 'matching', 'short-answer', 'ordering', 'cloze'));
