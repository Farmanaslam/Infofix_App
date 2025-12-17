
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '')
  
  return {
    plugins: [react()],
    // Ensure public assets (like .htaccess) are copied to dist
    publicDir: 'public',
    define: {
      // Polyfill process.env for the browser
      'process.env': env
    },
    // Removed optimizeDeps and build.rollupOptions to force bundling of all dependencies
    // This ensures the app works on hosting providers without relying on external CDNs
  }
})