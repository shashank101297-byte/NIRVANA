grant delete on table public.prescription_items to authenticated;

drop policy if exists prescription_items_delete_permission on public.prescription_items;

create policy prescription_items_delete_permission
on public.prescription_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.prescriptions p
    where p.id = prescription_items.prescription_id
      and (select private.has_org_permission(p.organization_id, 'prescription.update'))
  )
);
