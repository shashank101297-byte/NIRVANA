-- Preserve existing clinical encounters while reconciling duplicate appointment links.
-- For any appointment linked to multiple encounters, retain the most recently
-- created encounter and detach older links rather than deleting clinical data.
with ranked_duplicates as (
  select
    id,
    row_number() over (
      partition by appointment_id
      order by created_at desc, id desc
    ) as rn
  from public.clinical_encounters
  where appointment_id is not null
)
update public.clinical_encounters ce
set appointment_id = null
from ranked_duplicates rd
where ce.id = rd.id
  and rd.rn > 1;

-- Enforce one appointment-linked encounter at the database layer.
create unique index if not exists clinical_encounters_one_appointment_idx
  on public.clinical_encounters (appointment_id)
  where appointment_id is not null;
