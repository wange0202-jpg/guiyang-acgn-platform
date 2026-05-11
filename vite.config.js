import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        strictPort: true,
    },
    build: {
        outDir: 'dist',
    },
    define: {
    // 确保环境变量在客户端可用
    },
});
