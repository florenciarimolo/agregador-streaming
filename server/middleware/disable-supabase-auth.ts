import { defineEventHandler } from 'h3';

export default defineEventHandler((event) => {
  // 🔥 Desactivar Supabase SSR auth para endpoints API
  if (event.node.req.url?.startsWith('/api/')) {
    // Esta flag es leída por @nuxtjs/supabase
    console.log('[DISABLE SUPABASE AUTH] API request:', event.node.req.url);
    event.context._supabaseAuthDisabled = true;
  }
});

