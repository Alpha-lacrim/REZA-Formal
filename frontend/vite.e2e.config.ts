import { mergeConfig } from 'vite';
import base from './vite.config';

export default mergeConfig(base, {
  server: {
    host: '127.0.0.1', port: Number(process.env.REZA_E2E_FRONTEND_PORT || 3100), strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:18080', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:18080', changeOrigin: true },
    },
  },
});
