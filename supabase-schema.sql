-- ═══════════════════════════════════════════════════════════════════════
-- ATENEA — esquema de Supabase para el módulo Hospital
--
-- Esto reemplaza el localStorage de cada aparato por una base compartida:
-- lo que carga el celular de un médico lo ve al tiro el computador de
-- recepción. Se pega completo en el Editor SQL de un proyecto de Supabase
-- NUEVO y dedicado a Atenea (no el de mvi-vet: los datos de esta clínica
-- nunca se mezclan con los de Luna).
--
-- Después de correr esto, quedan pendientes solo dos cosas a mano en el
-- panel de Supabase (Authentication → Users → Add user):
--   1. Crear una cuenta por cada persona del equipo (correo + clave).
--   2. Completar su nombre y rol acá abajo, en la sección "PERFILES",
--      cambiando el correo de ejemplo por el que uses de verdad.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Tablas ────────────────────────────────────────────────────────────

create table if not exists public.pacientes (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  especie     text,
  raza        text,
  edad        text,
  peso        text,
  tutor       text,
  telefono    text,
  motivo      text,
  box         text,
  estado      text not null default 'delicado' check (estado in ('estable','delicado','critico')),
  ingreso     timestamptz not null default now(),
  egreso      timestamptz,
  desenlace   text,
  creado_en   timestamptz not null default now()
);

create table if not exists public.eventos (
  id           bigint generated always as identity primary key,
  paciente_id  bigint not null references public.pacientes(id) on delete cascade,
  cuando       timestamptz not null default now(),
  quien        text not null,
  temp         text,
  texto        text not null,
  tutor        text
);

create table if not exists public.cargos (
  id           bigint generated always as identity primary key,
  paciente_id  bigint not null references public.pacientes(id) on delete cascade,
  cuando       timestamptz not null default now(),
  item         text not null,
  cantidad     int not null default 1,
  quien        text not null
);

create table if not exists public.farmacos (
  id           bigint generated always as identity primary key,
  paciente_id  bigint not null references public.pacientes(id) on delete cascade,
  item         text not null,
  agregado     timestamptz not null default now()
);

create table if not exists public.administraciones (
  id           bigint generated always as identity primary key,
  farmaco_id   bigint not null references public.farmacos(id) on delete cascade,
  paciente_id  bigint not null references public.pacientes(id) on delete cascade,
  fecha        date not null,
  hora         int not null check (hora between 0 and 23),
  quien        text not null,
  cuando       timestamptz not null default now(),
  cargo_id     bigint references public.cargos(id) on delete set null
);

-- Consultas: la ficha de una atención común, sin jaula ni internación.
-- Vive aparte de "pacientes" (que es solo para Hospital) — cualquiera del
-- equipo la abre y la llena completa, de principio a fin.
create table if not exists public.consultas (
  id                    bigint generated always as identity primary key,
  fecha                 timestamptz not null default now(),
  quien                 text not null,
  estado                text not null default 'En espera'
    check (estado in ('En espera','Atendiendo','Finalizado','Reagendado','Cancelada')),
  nombre                text not null,
  especie               text,
  raza                  text,
  edad                  text,
  peso                  text,
  esterilizado          text,
  convive_mascotas      text,
  enfermedades_previas  text,
  tutor                 text,
  telefono              text,
  motivo                text,
  anamnesis_remota      text,
  anamnesis_actual      text,
  fc                    text,
  fr                    text,
  temperatura           text,
  examen_fisico         text,
  prediagnosticos       text,
  examenes_solicitados  text,
  orden_medica          text,
  proximo_control       text,
  cobro_categoria       text,
  cobro_monto           integer
);

-- Vacunas aplicadas: una fila por dosis puesta en una Consulta, con su
-- próxima fecha ya calculada (hoy + los meses que corresponda). De acá
-- sale Recordatorios — quién tiene una vacuna vencida o por vencer.
create table if not exists public.vacunas_aplicadas (
  id              bigint generated always as identity primary key,
  consulta_id     bigint references public.consultas(id) on delete set null,
  paciente        text not null,
  tutor           text,
  telefono        text,
  especie         text,
  vacuna          text not null,
  fecha_aplicada  date not null default current_date,
  proxima_fecha   date not null,
  quien           text not null,
  avisado         boolean not null default false
);

create table if not exists public.perfiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text,
  nombre            text not null,
  rol               text not null default 'clinico' check (rol in ('clinico','recepcion')),
  acceso_finanzas   boolean not null default false
);

-- ── Quién puede entrar cuando se crea una cuenta nueva ──────────────────
-- Cuando agregues una persona en Authentication → Users, este disparador
-- le crea un perfil de partida (rol "clinico" por defecto); tú le corriges
-- el nombre y el rol después, con los UPDATE de más abajo.

create or replace function public.manejar_nuevo_usuario()
returns trigger as $$
begin
  insert into public.perfiles (id, email, nombre, rol)
  values (new.id, new.email, split_part(new.email, '@', 1), 'clinico');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.manejar_nuevo_usuario();

-- ── Seguridad: cualquiera con sesión iniciada ve y edita todo ──────────
-- Es una sola clínica con un equipo chico, no una cadena con varios
-- dueños — no hace falta separar por owner como en mvi-vet. Lo único que
-- importa es que nadie SIN sesión pueda leer ni escribir nada.

alter table public.pacientes       enable row level security;
alter table public.eventos         enable row level security;
alter table public.cargos          enable row level security;
alter table public.farmacos        enable row level security;
alter table public.administraciones enable row level security;
alter table public.consultas       enable row level security;
alter table public.vacunas_aplicadas enable row level security;
alter table public.perfiles        enable row level security;

create policy "equipo autenticado, todo" on public.pacientes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado, todo" on public.eventos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado, todo" on public.cargos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado, todo" on public.farmacos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado, todo" on public.administraciones
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado, todo" on public.consultas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado, todo" on public.vacunas_aplicadas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "equipo autenticado lee perfiles" on public.perfiles
  for select using (auth.role() = 'authenticated');

-- ── Para que un cambio en un aparato se vea al tiro en los demás ───────
alter publication supabase_realtime add table
  public.pacientes, public.eventos, public.cargos, public.farmacos, public.administraciones,
  public.consultas, public.vacunas_aplicadas;

-- ═══════════════════════════════════════════════════════════════════════
-- DATOS DE EJEMPLO — los mismos tres pacientes que ya se le mostraron:
-- Maya (estable), Nico (crítico) y Rita (delicado). Bórralos con el botón
-- "Empezar de cero" de Ajustes cuando quieras cargar pacientes reales.
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  v_maya bigint; v_nico bigint; v_rita bigint;
  v_f_meloxicam bigint; v_f_metadona bigint; v_f_buprenor bigint;
  v_c231 bigint; v_c232 bigint; v_c233 bigint;
begin
  -- Maya
  insert into public.pacientes (nombre, especie, raza, edad, peso, tutor, telefono, motivo, box, estado, ingreso)
  values ('Maya','Canina','Mestiza','4 años','18,4 kg','Sra. Carrasco','+56 9 0000 0001',
          'Enterotomía por cuerpo extraño','Canino · Jaula 1','estable', now() - interval '3 days')
  returning id into v_maya;

  insert into public.eventos (paciente_id, cuando, quien, temp, texto, tutor) values
    (v_maya, now() - interval '3 days',  'Dr. Sergio',   '37.9', 'Entró de madrugada por cuerpo extraño. Enterotomía a las 4:10, salió un calcetín. Despertó bien. Con vía y fluidos, aún sin comer.', 'Le expliqué a la Sra. Carrasco que la cirugía salió bien y que las primeras 48 horas son las importantes.'),
    (v_maya, now() - interval '2 days',  'Dra. Javiera', '38.1', 'Comió papilla sin vomitar. Herida limpia, sin secreción.', 'Le mandé foto a la señora.'),
    (v_maya, now() - interval '14 hours','Dra. Javiera', '38.4', 'Sin novedades. Comió dos veces. Deposiciones normales.', null),
    (v_maya, now() - interval '2 hours', 'Dr. Sergio',   '38.0', 'Le saqué la vía. Camina sola, herida seca. Si amanece así, mañana se va de alta.', 'Le dije a la señora que mañana la damos de alta si amanece bien.');

  insert into public.cargos (paciente_id, cuando, item, cantidad, quien) values
    (v_maya, now() - interval '3 days', 'pab-hora',   1, 'Dr. Sergio'),
    (v_maya, now() - interval '3 days', 'anestesia',  1, 'Dr. Sergio'),
    (v_maya, now() - interval '3 days', 'cateter',    1, 'Dr. Sergio'),
    (v_maya, now() - interval '3 days', 'ringer',     3, 'Dr. Sergio'),
    (v_maya, now() - interval '3 days', 'metadona',   4, 'Dr. Sergio'),
    (v_maya, now() - interval '2 days', 'cefazolina', 3, 'Dra. Javiera'),
    (v_maya, now() - interval '2 days', 'hosp-dia',   3, 'Norely (recepción)'),
    (v_maya, now() - interval '1 day',  'meloxicam',  2, 'Dra. Javiera'),
    (v_maya, now() - interval '1 day',  'isabelino',  1, 'Dr. Sergio');

  insert into public.cargos (paciente_id, item, cantidad, quien) values (v_maya, 'meloxicam', 1, 'Dra. Javiera') returning id into v_c231;
  insert into public.cargos (paciente_id, item, cantidad, quien) values (v_maya, 'metadona', 1, 'Dr. Sergio') returning id into v_c232;

  insert into public.farmacos (paciente_id, item, agregado) values (v_maya, 'meloxicam', now() - interval '1 day') returning id into v_f_meloxicam;
  insert into public.farmacos (paciente_id, item, agregado) values (v_maya, 'metadona', now() - interval '3 days') returning id into v_f_metadona;

  insert into public.administraciones (farmaco_id, paciente_id, fecha, hora, quien, cargo_id) values
    (v_f_meloxicam, v_maya, current_date, 8, 'Dra. Javiera', v_c231),
    (v_f_metadona,  v_maya, current_date, 9, 'Dr. Sergio',   v_c232);

  -- Nico
  insert into public.pacientes (nombre, especie, raza, edad, peso, tutor, telefono, motivo, box, estado, ingreso)
  values ('Nico','Felino','Común europeo','7 años','5,2 kg','Sr. Peña','+56 9 0000 0002',
          'Obstrucción uretral con azotemia','Felinos · 2° piso · Jaula 1','critico', now() - interval '2 days')
  returning id into v_nico;

  insert into public.eventos (paciente_id, cuando, quien, temp, texto, tutor) values
    (v_nico, now() - interval '2 days', 'Dra. Javiera', '37.6', 'Ingresó obstruido, globo vesical grande. Se desobstruyó, quedó con sonda uretral. Potasio alto, creatinina 4.8. Con fluidos.', 'Le expliqué al Sr. Peña que las próximas 24 horas dicen mucho. Quedó preocupado.'),
    (v_nico, now() - interval '1 day',  'Dra. Javiera', '38.0', 'Orinó por sonda toda la noche, buen volumen. Creatinina bajó a 3.1. Comió un poco de papilla renal.', 'Le dije al Sr. Peña que iba mejor pero que la sonda se saca recién en 48 horas.'),
    (v_nico, now() - interval '9 hours','Dra. Javiera', '37.2', 'Se reobstruyó a las 22h. Se desobstruyó de nuevo y quedó con sonda otra vez. Muy decaído.', null);

  insert into public.cargos (paciente_id, cuando, item, cantidad, quien) values
    (v_nico, now() - interval '2 days', 'sonda-uret',  2, 'Dra. Javiera'),
    (v_nico, now() - interval '2 days', 'sonda-foley', 2, 'Dra. Javiera'),
    (v_nico, now() - interval '2 days', 'perfil',      2, 'Dra. Javiera'),
    (v_nico, now() - interval '2 days', 'fisiologico', 4, 'Dr. Sergio'),
    (v_nico, now() - interval '2 days', 'calcio',      2, 'Dra. Javiera'),
    (v_nico, now() - interval '1 day',  'buprenor',    5, 'Dra. Javiera'),
    (v_nico, now() - interval '1 day',  'hosp-uci',    2, 'Norely (recepción)');

  insert into public.cargos (paciente_id, item, cantidad, quien) values (v_nico, 'buprenor', 1, 'Dra. Javiera') returning id into v_c233;
  insert into public.farmacos (paciente_id, item, agregado) values (v_nico, 'buprenor', now() - interval '2 days') returning id into v_f_buprenor;
  insert into public.administraciones (farmaco_id, paciente_id, fecha, hora, quien, cargo_id) values
    (v_f_buprenor, v_nico, current_date, 6, 'Dra. Javiera', v_c233);

  -- Rita
  insert into public.pacientes (nombre, especie, raza, edad, peso, tutor, telefono, motivo, box, estado, ingreso)
  values ('Rita','Canina','Beagle','9 años','12,0 kg','Sr. Ibáñez','+56 9 0000 0003',
          'Pancreatitis aguda','Canino · Jaula 2','delicado', now() - interval '1 day')
  returning id into v_rita;

  insert into public.eventos (paciente_id, cuando, quien, temp, texto, tutor) values
    (v_rita, now() - interval '1 day',  'Dra. Javiera', '39.1', 'Ingresó con vómitos de dos días y dolor abdominal marcado. Ecografía compatible con pancreatitis. Se deja en ayuno con fluidos y analgesia.', 'Le expliqué al Sr. Ibáñez que hay que esperar 48 horas para ver cómo responde.'),
    (v_rita, now() - interval '5 hours','Dr. Sergio',   '38.7', 'Menos dolor a la palpación. No ha vomitado desde anoche. Sigue en ayuno.', null);

  insert into public.cargos (paciente_id, cuando, item, cantidad, quien) values
    (v_rita, now() - interval '1 day', 'eco',      1, 'Dra. Javiera'),
    (v_rita, now() - interval '1 day', 'perfil',   1, 'Dra. Javiera'),
    (v_rita, now() - interval '1 day', 'cateter',  1, 'Dr. Sergio'),
    (v_rita, now() - interval '1 day', 'ringer',   2, 'Dr. Sergio'),
    (v_rita, now() - interval '1 day', 'hosp-dia', 1, 'Norely (recepción)');

  insert into public.farmacos (paciente_id, item, agregado) values (v_rita, 'meloxicam', now() - interval '1 day');
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- PERFILES — corre esto DESPUÉS de crear las 3 cuentas en Authentication →
-- Users (con el correo y clave que tú elijas para cada uno). Cambia el
-- correo de ejemplo por el que hayas usado en cada cuenta.
-- ═══════════════════════════════════════════════════════════════════════

-- update public.perfiles set nombre = 'Dr. Sergio',         rol = 'clinico'   where email = 'sergio@atenea.cl';
-- update public.perfiles set nombre = 'Dra. Javiera',       rol = 'clinico'   where email = 'javiera@atenea.cl';
-- update public.perfiles set nombre = 'Norely (recepción)', rol = 'recepcion' where email = 'norely@atenea.cl';
