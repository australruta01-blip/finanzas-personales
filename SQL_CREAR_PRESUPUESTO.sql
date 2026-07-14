-- Ejecuta este SQL en Supabase SQL Editor para crear la tabla de presupuestos
-- (previsto vs real por categoría y mes)

create table presupuestos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  categoria text not null,
  tipo text check (tipo in ('ingreso','egreso')) not null,
  monto_previsto numeric not null default 0,
  mes integer not null check (mes >= 0 and mes <= 11),
  anio integer not null,
  created_at timestamp with time zone default now(),
  unique (user_id, categoria, tipo, mes, anio)
);

alter table presupuestos enable row level security;

create policy "usuarios ven sus presupuestos"
  on presupuestos for all
  using (auth.uid() = user_id);
