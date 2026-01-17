import { defineEventHandler } from 'h3';
import { devLog } from '@/server/utils/logger';

export default defineEventHandler((event) => {
  // 🔥 Desactivar Supabase SSR auth para endpoints API
  if (event.node.req.url?.startsWith('/api/')) {
    // Esta flag es leída por @nuxtjs/supabase
    devLog('[DISABLE SUPABASE AUTH] API request:', event.node.req.url);
    event.context._supabaseAuthDisabled = true;
  }
});
