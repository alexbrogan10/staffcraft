/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    // svg2pdf's UMD build cannot see jsPDF under Node; bundle its ES build instead.
    server: { deps: { inline: ['svg2pdf.js'] } },
  },
});
