import { defineConfig } from 'vitest/config';

// 配置Vitest以适配项目
export default defineConfig({
    define: {
        __DEV__: true,
    },
    // 设置测试环境
    test: {
        globals: true,
        // 设置测试文件匹配模式
        include: ['test/**/*.{test,spec}.{js,ts}'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/lib/**'],
        // 配置测试超时
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});
