// Isolated local PostgreSQL checks. Never points at the live Supabase project.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const bootstrap = `create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`;
export function sql(container, input) {
  return execFileSync(
    'docker',
    ['exec', '-i', container, 'psql', '-q', '-t', '-A', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  ).trim();
}
export async function startDatabase(name) {
  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '-d',
      '--name',
      name,
      '-e',
      'POSTGRES_HOST_AUTH_METHOD=trust',
      'postgres:16-alpine',
    ],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 30; i++) {
    try {
      execFileSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres'], { stdio: 'ignore' });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  sql(name, bootstrap);
  sql(
    name,
    readdirSync(path.join(root, 'supabase/migrations'))
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => readFileSync(path.join(root, 'supabase/migrations', file), 'utf8'))
      .join('\n'),
  );
}
export function stopDatabase(name) {
  try {
    execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
  } catch {}
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const name = 'jastip-db-tests-' + process.pid;
  try {
    await startDatabase(name);
    const result = sql(
      name,
      readFileSync(path.join(root, 'supabase/tests/security-and-workflows.sql'), 'utf8'),
    );
    console.log(result.split('\n').at(-1));
  } catch (e) {
    console.error(e.stderr?.toString() || e.message);
    process.exitCode = 1;
  } finally {
    stopDatabase(name);
  }
}
