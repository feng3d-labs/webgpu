import { defineConfig } from 'vitest/config';

// 配置 Vitest 以适配项目
export default defineConfig({
    define: {
        __DEV__: true,
    },
    test: {
        globals: true,
    },
});

