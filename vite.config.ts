import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist', target: 'es2020',
    rollupOptions: mode === 'single' ? undefined : { input: { main: 'index.html', audition: 'audition.html' } },
  },
}))
