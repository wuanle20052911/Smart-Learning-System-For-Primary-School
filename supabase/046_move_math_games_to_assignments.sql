update public.lessons
set game_slugs = array(
  select game_slug
  from unnest(game_slugs) with ordinality as lesson_game(game_slug, position)
  where game_slug not in (
    'sap-xep-so-tang-dan',
    'so-sanh-so',
    'giai-ma-hang-so',
    'match-up',
    'gameshow'
  )
  order by position
)
where game_slugs && array[
  'sap-xep-so-tang-dan',
  'so-sanh-so',
  'giai-ma-hang-so',
  'match-up',
  'gameshow'
]::text[];
