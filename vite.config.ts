import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages 같은 하위 경로 배포에서도 자산 경로가 깨지지 않게 상대 경로로 빌드한다.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
