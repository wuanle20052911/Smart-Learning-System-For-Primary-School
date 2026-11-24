-- Gắn trò chơi sau bài học (HTML tĩnh hoặc mẫu game trong ứng dụng) vào từng bài học.
-- Cột này chỉ lưu slug theo danh mục services/lessonGames.json.
alter table public.lessons
  add column if not exists game_slugs text[] not null default '{}';

alter table public.lessons
  drop constraint if exists lessons_game_slugs_limit;

alter table public.lessons
  add constraint lessons_game_slugs_limit
  check (cardinality(game_slugs) <= 6);

-- Trước đây ba trò chơi số đến 100 000 được mở bằng cách dò tiêu đề/nội dung bài.
-- Gắn sẵn cho các bài đó để học sinh không mất trò chơi khi chuyển sang cột mới.
update public.lessons
set game_slugs = array['sap-xep-so-tang-dan', 'so-sanh-so', 'giai-ma-hang-so']
where cardinality(game_slugs) = 0
  and concat_ws(' ', title, topic, description, content) ~* '100[[:space:].]?000|trăm[[:space:]]+nghìn';
