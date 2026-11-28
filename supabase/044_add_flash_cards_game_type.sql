-- Allow assignments to use the flash-card study game.
alter table public.assignments
  drop constraint if exists assignments_game_type_check;

alter table public.assignments
  add constraint assignments_game_type_check
  check (game_type is null or game_type in (
    'quiz', 'match-up', 'group-sort', 'ordering', 'cloze',
    'find-match', 'open-box', 'gameshow', 'digit-arrange', 'flash-cards'
  ));
