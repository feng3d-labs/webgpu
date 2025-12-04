import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { defineConfig } from 'vite';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 使用 fast-glob 扫描匹配通配符模式的文件
// fast-glob 支持完整的 glob 模式，包括：
//   - * 匹配任意字符（除了路径分隔符）
//   - ** 匹配任意路径（包括路径分隔符，用于跨目录匹配）
//   - ? 匹配单个字符（除了路径分隔符）
//   - {a,b} 匹配 a 或 b
//   - ! 排除模式
//   等等
function findSpectHtmlFiles(dir, pattern = '**/*.spect.html', excludePatterns = ['**/node_modules/**'])
{
    // 构建包含和排除模式
    const patterns = [
        pattern,
        ...excludePatterns.map(p => `!${p}`), // fast-glob 使用 ! 前缀表示排除
    ];

    // 使用 fast-glob 同步扫描文件
    const files = fg.sync(patterns, {
        cwd: dir,
        absolute: false, // 返回相对路径
        onlyFiles: true, // 只返回文件
    });

    // 转换为统一格式
    return files.map((file) =>
    {
        const filePath = resolve(dir, file);
        const fileName = file.split('/').pop() || file.split('\\').pop() || file;

        return {
            path: filePath,
            relativePath: file.replace(/\\/g, '/'), // 统一使用正斜杠
            name: fileName.replace(/\.spect\.html$/, ''),
        };
    });
}

// 测试文件匹配模式配置
// 使用 fast-glob 库进行文件扫描，支持完整的 glob 模式：
//   - * 匹配任意字符（除了路径分隔符）
//   - ** 匹配任意路径（包括路径分隔符，用于跨目录匹配）
//   - ? 匹配单个字符（除了路径分隔符）
//   - {a,b} 匹配 a 或 b（例如：{test,spec}.html）
//   - [abc] 匹配 a、b 或 c 中的任意一个字符
//   - ! 排除模式（在 patterns 数组中使用）
//
// 示例模式：
//   - '**/*.spect.html' - 匹配所有子目录中的 .spect.html 文件（默认）
//   - '*.spect.html' - 只匹配根目录中的 .spect.html 文件
//   - 'tests/**/*.spect.html' - 只匹配 tests 目录及其子目录中的文件
//   - '**/test-*.spect.html' - 匹配所有以 test- 开头的 .spect.html 文件
//   - '**/*.{test,spec}.spect.html' - 匹配包含 .test. 或 .spec. 的文件
//   - '**/features/**/*.spect.html' - 只匹配 features 目录下的文件
const TEST_FILE_PATTERN = '**/*.spect.html'; // 默认匹配所有子目录中的 .spect.html 文件
const EXCLUDE_PATTERNS = [
    '**/node_modules/**', // 排除 node_modules 目录
    '**/dist/**', // 排除 dist 目录
    '**/.git/**', // 排除 .git 目录
];

// 自动扫描所有匹配模式的测试文件
function getSpectHtmlFiles()
{
    const input = {
        main: resolve(__dirname, 'index.html'),
    };

    const testFiles = findSpectHtmlFiles(__dirname, TEST_FILE_PATTERN, EXCLUDE_PATTERNS);

    testFiles.forEach((file) =>
    {
        // 使用相对路径作为 key，确保唯一性
        // 如果文件在根目录，直接使用文件名；否则使用相对路径（将路径分隔符替换为 -）
        const key = file.relativePath.includes('/')
            ? file.relativePath.replace(/\//g, '-').replace(/\.spect\.html$/, '')
            : file.name;
        input[key] = resolve(file.path);
    });

    return input;
}

// 从 HTML 文件中提取测试信息
function extractTestInfo(htmlContent, fileName)
{
    // 提取 title
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : fileName.replace('.spect.html', '');

    // 提取 meta 标签中的测试描述
    const descriptionMatch = htmlContent.match(/<meta\s+name=["']test-description["']\s+content=["'](.*?)["']/i);
    const description = descriptionMatch ? descriptionMatch[1].trim() : `测试：${title}`;

    // 提取 test-name（如果存在）
    const testNameMatch = htmlContent.match(/<meta\s+name=["']test-name["']\s+content=["'](.*?)["']/i);
    const testName = testNameMatch ? testNameMatch[1].trim() : fileName.replace('.spect.html', '');

    return {
        name: title,
        description,
        testName,
    };
}

// 生成测试配置文件
function generateTestConfig()
{
    const testFiles = findSpectHtmlFiles(__dirname, TEST_FILE_PATTERN, EXCLUDE_PATTERNS);

    const tests = testFiles.map((file) =>
    {
        const htmlContent = readFileSync(file.path, 'utf-8');
        const fileName = file.relativePath.split('/').pop() || file.name;
        const testInfo = extractTestInfo(htmlContent, fileName);

        return {
            name: testInfo.name,
            description: testInfo.description,
            htmlFile: file.relativePath, // 使用相对路径，支持子目录
            testName: testInfo.testName,
        };
    });

    // 生成 TypeScript 配置文件
    const configContent = `// 此文件由构建工具自动生成，请勿手动编辑
// 此文件包含所有 .spect.html 测试文件的配置信息

export interface TestInfo
{
    name: string;
    description: string;
    htmlFile: string;
    testName: string;
}

export const tests: TestInfo[] = ${JSON.stringify(tests, null, 4)};
`;

    const configPath = join(__dirname, 'test-config.ts');
    writeFileSync(configPath, configContent, 'utf-8');

    return tests;
}

// Vite 插件：生成测试配置
function generateTestConfigPlugin()
{
    return {
        name: 'generate-test-config',
        buildStart()
        {
            // 在构建开始时生成配置文件
            generateTestConfig();
        },
        configureServer()
        {
            // 在开发服务器启动时也生成配置文件
            generateTestConfig();
        },
    };
}

export default defineConfig({
    root: __dirname,
    publicDir: false,
    server: {
        port: 3002,
        open: true,
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: getSpectHtmlFiles(),
        },
    },
    resolve: {
        alias: {
            '@feng3d/webgpu': resolve(__dirname, '../src'),
            '@feng3d/render-api': resolve(__dirname, '../../render-api/src'),
        },
    },
    plugins: [
        shaderToString(),
        generateTestConfigPlugin(),
    ],
});

function shaderToString()
{
    return {
        name: 'vite-plugin-string',
        async transform(source, id)
        {
            if (!['glsl', 'wgsl', 'vert', 'frag', 'vs', 'fs'].includes(id.split('.').pop())) return;

            const esm = `export default \`${source}\`;`;

            return { code: esm, map: { mappings: '' } };
        },
    };
}

