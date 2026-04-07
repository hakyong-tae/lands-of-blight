import { defineConfig } from 'vite'

export default defineConfig({
  // Vite 가이드 기준: index.html이 루트에 위치, publicDir은 기본값 'public'
  publicDir: 'public',

  server: {
    port: 3002,
    // Defold WASM + SharedArrayBuffer 필수 헤더
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },

  preview: {
    port: 3002,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },

  build: {
    outDir: 'dist',
    // 게임 바이너리(.wasm 등) 크기 경고 비활성화
    chunkSizeWarningLimit: 5000,
    // public/ 파일은 빌드 시 dist/에 그대로 복사됨 (Vite 기본 동작)
  },

  // JS에서 import 시 Vite가 바이너리 파일을 asset으로 처리하도록 등록
  assetsInclude: [
    '**/*.wasm',
    '**/*.arcd0',
    '**/*.arci0',
    '**/*.dmanifest0',
    '**/*.projectc0',
    '**/*.der0',
  ],
})
