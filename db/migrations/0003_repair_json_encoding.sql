-- Repairs json/jsonb values that were double-encoded by the postgres.js
-- driver before the serializer fix (see src/lib/db/index.ts): those rows
-- hold a JSON *string* whose text is the real JSON document, e.g.
--   "{\"size\":7,\"waypoints\":[...]}"   ->   {"size":7,"waypoints":[...]}
-- Only string scalars whose text is itself a JSON object, array or string
-- (what JSON.stringify produced) are unwrapped. Correct rows are untouched,
-- so this is idempotent and preserves all data.

create or replace function gamehub_unwrap_json(v jsonb) returns jsonb
language plpgsql immutable as $$
declare inner_text text;
begin
  if v is null or jsonb_typeof(v) <> 'string' then
    return v;
  end if;
  inner_text := v #>> '{}';
  if left(inner_text, 1) not in ('{', '[', '"') then
    return v;
  end if;
  begin
    return inner_text::jsonb;
  exception when others then
    return v;
  end;
end $$;

update puzzles set data = gamehub_unwrap_json(data), solution = gamehub_unwrap_json(solution)
  where jsonb_typeof(data) = 'string' or jsonb_typeof(solution) = 'string';
update game_sessions set state = gamehub_unwrap_json(state) where jsonb_typeof(state) = 'string';
update completions set result = gamehub_unwrap_json(result) where jsonb_typeof(result) = 'string';
update daily_activity set per_game = gamehub_unwrap_json(per_game) where jsonb_typeof(per_game) = 'string';
update notifications set data = gamehub_unwrap_json(data) where jsonb_typeof(data) = 'string';
update admin_audit_log set details = gamehub_unwrap_json(details) where jsonb_typeof(details) = 'string';

drop function gamehub_unwrap_json(jsonb);
