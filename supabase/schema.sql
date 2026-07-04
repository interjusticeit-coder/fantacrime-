-- Schema Fantacrime per Supabase (Postgres)
-- Incolla questo nell'SQL Editor di Supabase per creare le tabelle.

create table if not exists casi (
  id uuid primary key default gen_random_uuid(),
  ambientazione text not null,
  metodo text not null,
  titolo text not null,
  scena text not null,
  indizi jsonb not null,
  ruoli jsonb not null,
  settimana date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists squadre (
  id uuid primary key default gen_random_uuid(),
  nome_utente text not null,
  caso_id uuid references casi(id) on delete cascade,
  personaggi jsonb not null,        -- array di {ruolo, nome, descrizione}
  colpevole text not null,          -- nome del personaggio colpevole (segreto)
  movente text not null,
  indizi_disseminati jsonb not null, -- indizi scritti dalla squadra per gli altri
  approvato boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists indovinelli (
  id uuid primary key default gen_random_uuid(),
  squadra_id uuid references squadre(id) on delete cascade,
  utente_che_indovina text not null,
  personaggio_indicato text not null,
  corretto boolean,
  created_at timestamptz not null default now(),
  unique (squadra_id, utente_che_indovina)
);

create table if not exists punteggi (
  utente text primary key,
  punti integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Row Level Security: per iniziare in modo semplice, permettiamo
-- lettura pubblica e scrittura pubblica (da stringere più avanti
-- con autenticazione utenti quando l'app cresce).
alter table casi enable row level security;
alter table squadre enable row level security;
alter table indovinelli enable row level security;
alter table punteggi enable row level security;

create policy "lettura pubblica casi" on casi for select using (true);
create policy "scrittura pubblica casi" on casi for insert with check (true);

create policy "lettura pubblica squadre" on squadre for select using (true);
create policy "scrittura pubblica squadre" on squadre for insert with check (true);

create policy "lettura pubblica indovinelli" on indovinelli for select using (true);
create policy "scrittura pubblica indovinelli" on indovinelli for insert with check (true);

create policy "lettura pubblica punteggi" on punteggi for select using (true);
create policy "scrittura pubblica punteggi" on punteggi for all using (true) with check (true);
