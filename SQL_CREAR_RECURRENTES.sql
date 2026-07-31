-- Ejecuta este SQL en Supabase SQL Editor para crear los movimientos recurrentes

create table recurrentes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  tipo text check (tipo in ('ingreso','egreso')) not null,
  categoria text not null,
  monto numeric not null,
  descripcion text,
  dia_mes integer not null check (dia_mes >= 1 and dia_mes <= 28),
  activa boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table recurrentes enable row level security;

create policy "usuarios ven sus recurrentes"
  on recurrentes for all
  using (auth.uid() = user_id);

-- Vincula cada movimiento generado automáticamente con su regla de origen
-- (permite saber qué ya se generó este mes y evitar duplicados)
alter table transacciones
  add column if not exists recurrente_id uuid references recurrentes(id) on delete set null;
