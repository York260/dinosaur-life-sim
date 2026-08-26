import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/dinosaur-life-sim/',
  plugins: [react()],
})
