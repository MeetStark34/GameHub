-- XP freeze: an admin-controlled, role-independent progression setting.
-- While xp_frozen is true, gameplay rewards add no XP (enforced in the
-- server's single XP gate, awardXp); manual admin adjustments still apply.
-- The two "changed" columns record who last switched it and when; the full
-- history is in admin_audit_log (actions xp-freeze / xp-unfreeze).
alter table user_stats add column xp_frozen boolean not null default false;
alter table user_stats add column xp_freeze_changed_at timestamptz;
alter table user_stats add column xp_freeze_changed_by uuid references users (id) on delete set null;
