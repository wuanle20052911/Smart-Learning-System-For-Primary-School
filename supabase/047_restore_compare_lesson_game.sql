update public.lessons
set game_slugs = array(
  select game_slug
  from unnest(game_slugs) with ordinality as lesson_game(game_slug, position)
  where game_slug not in (
    'sap-xep-so-tang-dan',
    'giai-ma-hang-so',
    'match-up',
    'gameshow',
    'open-box',
    'digit-arrange',
    'flash-cards'
  )
  order by position
)
where game_slugs && array[
  'sap-xep-so-tang-dan',
  'giai-ma-hang-so',
  'match-up',
  'gameshow',
  'open-box',
  'digit-arrange',
  'flash-cards'
]::text[];

update public.lessons
set game_slugs = array_append(game_slugs, 'so-sanh-so')
where concat_ws(' ', title, topic, description, content) ~* '100[[:space:].]?000|trăm[[:space:]]+nghìn'
  and not ('so-sanh-so' = any(game_slugs));
