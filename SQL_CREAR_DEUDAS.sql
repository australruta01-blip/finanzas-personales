-- Ejecuta este SQL en Supabase SQL Editor para crear la tabla de deudas

create table deudas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  nombre_persona text not null,
  monto numeric not null,
  monto_pagado numeric default 0,
  fecha_inicio date not null,
  fecha_vencimiento date,
  estado text check (estado in ('pendiente','pagado')) default 'pendiente',
  direccion text check (direccion in ('debo','me deben')) not null,
  notas text,
  created_at timestamp with time zone default now()
);

alter table deudas enable row level security;

create policy "usuarios ven sus deudas"
  on deudas for all
  using (auth.uid() = user_id);
