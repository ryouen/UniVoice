import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './', // Electronで動作するよう相対パスに設定
  server: {
    // ポートは自動的に使用可能なものを選択させる
    // strictPortを削除して柔軟に対応
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // メモリ使用量を削減
    sourcemap: false,  // ソースマップを無効化してメモリ節約
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // プロダクションでconsole.logを削除
      },
    },
    // チャンク分割の最適化
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          openai: ['openai'],
          deepgram: ['@deepgram/sdk'],
        },
      },
    },
  },
})