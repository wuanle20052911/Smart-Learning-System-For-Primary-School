drop function if exists public.save_chatbot_exchange(uuid, text, text, jsonb, jsonb);

do $$
begin
  if to_regclass('public.chatbot_conversations') is not null then
    execute 'revoke all on table public.chatbot_conversations from anon, authenticated';
  end if;
  if to_regclass('public.chatbot_conversation_messages') is not null then
    execute 'revoke all on table public.chatbot_conversation_messages from anon, authenticated';
  end if;
  if to_regclass('public.chatbot_conversation_messages_id_seq') is not null then
    execute 'revoke all on sequence public.chatbot_conversation_messages_id_seq from anon, authenticated';
  end if;
end;
$$;
