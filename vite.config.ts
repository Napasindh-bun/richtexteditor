import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const shared = {
  resolve: {
    alias: {
      '@libs': path.resolve(rootDir, 'src/libs/clsx/index.ts'),
      '@utils': path.resolve(rootDir, 'src/utils'),
    },
  },
}

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      ...shared,
      plugins: [react()],
      root: path.resolve(rootDir, 'playground'),
      server: {
        port: 5173,
        open: true,
      },
    }
  }

  return {
    ...shared,
    plugins: [
      react(),
      dts({
        insertTypesEntry: true,
        tsconfigPath: path.resolve(rootDir, 'tsconfig.json'),
      }),
    ],
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
  }
})
