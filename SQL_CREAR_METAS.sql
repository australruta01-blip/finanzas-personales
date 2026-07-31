-- Ejecuta este SQL en Supabase SQL Editor para crear las metas de ahorro

create table metas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  nombre text not null,
  monto_objetivo numeric not null,
  monto_actual numeric not null default 0,
  fecha_objetivo date,
  icono text default '🎯',
  color text default '#1D9E75',
  estado text check (estado in ('activa','completada')) not null default 'activa',
  created_at timestamp with time zone default now()
);

alter table metas enable row level security;

create policy "usuarios ven sus metas"
  on metas for all
  using (auth.uid() = user_id);
