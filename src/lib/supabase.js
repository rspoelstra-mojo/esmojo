let clientPromise;

export function validateSupabaseConfig(env = {}) {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('De Supabase-project-URL en Publishable key zijn nog niet ingesteld.');
  }
  let parsed;
  try { parsed = new URL(url); } catch {
    throw new Error('De Supabase-project-URL is ongeldig.');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Gebruik de HTTPS-project-URL uit Supabase, zonder pad of inloggegevens.');
  }
  if (!key.startsWith('sb_publishable_')) {
    throw new Error('Gebruik uitsluitend de Supabase Publishable key in de website.');
  }
  return { url: parsed.origin, key };
}

// Pas aanroepen zodra een pagina daadwerkelijk databasegegevens nodig heeft.
// Geen gegevensverzoeken of sessieopslag tijdens het laden van het menu.
export function getSupabase() {
  if (!clientPromise) {
    const { url, key } = validateSupabaseConfig(import.meta.env);
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }))
      .catch(error => { clientPromise = undefined; throw error; });
  }
  return clientPromise;
}
