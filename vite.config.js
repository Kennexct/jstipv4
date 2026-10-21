import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Link previews (WhatsApp, etc.) need an absolute og:image URL. When VITE_PUBLIC_APP_URL is set,
// rewrite the relative path in index.html to an absolute one (ADR-005).
function absoluteOgImage(appUrl) {
  return {
    name: 'absolute-og-image',
    transformIndexHtml(html) {
      if (!appUrl) return html;
      const base = appUrl.endsWith('/') ? appUrl : appUrl + '/';
      return html.replace(
        /<meta property="og:image" content="[^"]*"/,
        `<meta property="og:image" content="${base}og-image.png"`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), absoluteOgImage(env.VITE_PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL)],
    base: './',
    build: { rollupOptions: { output: { manualChunks: { supabase: ['@supabase/supabase-js'] } } } },
    server: { host: '0.0.0.0', port: 3000 },
  };
});
