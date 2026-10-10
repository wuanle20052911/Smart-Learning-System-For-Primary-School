drop function if exists public.match_chatbot_kb_chunks(extensions.vector, text, integer);
drop function if exists public.match_chatbot_kb_chunks(extensions.vector, integer);

create function public.match_chatbot_kb_chunks(
  query_embedding extensions.vector(768),
  match_count integer default 4
)
returns table (
  id text,
  content text,
  source_file text,
  section_number text,
  section_title text,
  chunk_number integer,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    chunks.id,
    chunks.content,
    chunks.source_file,
    chunks.section_number,
    chunks.section_title,
    chunks.chunk_number,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from public.chatbot_kb_chunks as chunks
  where auth.uid() is not null
  order by chunks.embedding <=> query_embedding
  limit greatest(1, least(match_count, 10));
$$;

revoke all on function public.match_chatbot_kb_chunks(extensions.vector, integer) from public, anon;
grant execute on function public.match_chatbot_kb_chunks(extensions.vector, integer) to authenticated;
