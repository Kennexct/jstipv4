import { createClient } from '@supabase/supabase-js';
if (new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery')
  sessionStorage.setItem('jastip-password-recovery', 'true');
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const demoMode = import.meta.env.VITE_ENABLE_DEMO === 'true';
export const supabase =
  !demoMode && url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
export async function rpc(name, args = {}) {
  if (!supabase) throw Error('Configure the Supabase project URL and publishable key first.');
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883')
      throw Error(
        'The database migration has not been applied. Run the supplied Supabase migration, then retry.',
      );
    throw Error(error.message);
  }
  return data;
}
export const publicSlug = () => decodeURIComponent(location.hash.split('/')[1] || '');
