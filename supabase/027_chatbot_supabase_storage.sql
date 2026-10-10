create extension if not exists vector with schema extensions;

insert into storage.buckets (id, name, public)
values ('Math4mdfile', 'Math4mdfile', false)
on conflict (id) do update set public = false;

create table if not exists public.chatbot_kb_chunks (
  source_file text not null,
  id text not null,
  content text not null,
  section_number text not null,
  section_title text not null,
  chunk_number integer not null check (chunk_number > 0),
  embedding extensions.vector(768) not null,
  primary key (source_file, id)
);

create index if not exists chatbot_kb_chunks_embedding_idx
  on public.chatbot_kb_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create table if not exists public.chatbot_kb_metadata (
  source_file text primary key,
  source_hash text not null,
  embedding_model text not null,
  chunk_count integer not null check (chunk_count >= 0),
  ingested_at timestamptz not null default timezone('utc', now())
);

alter table public.chatbot_kb_chunks enable row level security;
alter table public.chatbot_kb_metadata enable row level security;

revoke all on public.chatbot_kb_chunks from anon, authenticated;
revoke all on public.chatbot_kb_metadata from anon, authenticated;
grant all on public.chatbot_kb_chunks to service_role;
grant all on public.chatbot_kb_metadata to service_role;

create or replace function public.match_chatbot_kb_chunks(
  query_embedding extensions.vector(768),
  query_source_file text,
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
    and chunks.source_file = query_source_file
  order by chunks.embedding <=> query_embedding
  limit greatest(1, least(match_count, 10));
$$;

revoke all on function public.match_chatbot_kb_chunks(extensions.vector, text, integer) from public, anon;
grant execute on function public.match_chatbot_kb_chunks(extensions.vector, text, integer) to authenticated;
