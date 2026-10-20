import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { rollupOptions: { output: { manualChunks: { supabase: ['@supabase/supabase-js'] } } } },
  server: { host: '0.0.0.0', port: 3000 },
});
