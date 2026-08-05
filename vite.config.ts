import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      tsconfigPath: path.resolve(rootDir, 'tsconfig.json'),
    }),
  ],
  resolve: {
    alias: {
      '@libs': path.resolve(rootDir, 'src/libs/clsx/index.ts'),
      '@utils': path.resolve(rootDir, 'src/utils'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(rootDir, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'styles',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
})
