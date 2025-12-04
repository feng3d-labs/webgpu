import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { defineConfig } from 'vite';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); // 根目录（配置文件所在目录）
const testWebDir = resolve(__dirname, 'test_web'); // test_web 目录

// 使用 fast-glob 扫描匹配通配符模式的文件
// fast-glob 支持完整的 glob 模式，包括：
//   - * 匹配任意字符（除了路径分隔符）
//   - ** 匹配任意路径（包括路径分隔符，用于跨目录匹配）
//   - ? 匹配单个字符（除了路径分隔符）
//   - {a,b} 匹配 a 或 b
//   - ! 排除模式
//   等等
// @param baseDir - 基准目录（用于计算相对路径，通常是 test_web 目录）
// @param scanDir - 扫描目录（从哪个目录开始扫描，通常是项目根目录）
// @param pattern - 文件匹配模式
// @param excludePatterns - 排除模式数组
function findSpectHtmlFiles(baseDir, scanDir, pattern = '**/*.spect.html', excludePatterns = ['**/node_modules/**'])
{
    // 构建包含和排除模式
    const patterns = [
        pattern,
        ...excludePatterns.map(p => `!${p}`), // fast-glob 使用 ! 前缀表示排除
    ];

    // 使用 fast-glob 同步扫描文件
    const files = fg.sync(patterns, {
        cwd: scanDir,
        absolute: false, // 返回相对路径（相对于 scanDir）
        onlyFiles: true, // 只返回文件
    });

    // 转换为统一格式
    return files.map((file) =>
    {
        const filePath = resolve(scanDir, file);
        const fileName = file.split('/').pop() || file.split('\\').pop() || file;
        // 计算相对于 baseDir 的路径（用于在 vite 中使用）
        const relativeToBase = relative(baseDir, filePath).replace(/\\/g, '/');

        return {
            path: filePath,
            relativePath: file.replace(/\\/g, '/'), // 相对于 scanDir 的路径
            relativeToBase, // 相对于 baseDir 的路径（用于 vite input）
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
    '**/test_dist/**', // 排除 test_dist 目录
    '**/.git/**', // 排除 .git 目录
];

// 自动扫描所有匹配模式的测试文件
// 从根目录开始扫描，包含 test_web 和 packages/webgpu/test_web 中的测试文件
function getSpectHtmlFiles()
{
    const input = {
        main: resolve(__dirname, 'test.html'),
    };

    // 从根目录开始扫描
    const testFiles = findSpectHtmlFiles(testWebDir, __dirname, TEST_FILE_PATTERN, EXCLUDE_PATTERNS);

    testFiles.forEach((file) =>
    {
        // 使用相对路径作为 key，确保唯一性
        // 将路径分隔符和相对路径符号替换为 -，确保 key 不包含路径分隔符
        // 例如：../packages/webgpu/test_web/depth-attachment-canvas-readpixels.spect.html
        // 转换为：packages-webgpu-test_web-depth-attachment-canvas-readpixels
        let key = file.relativePath
            .replace(/^\.\.\//g, '') // 移除开头的 ../
            .replace(/^\.\//g, '') // 移除开头的 ./
            .replace(/\//g, '-') // 将路径分隔符替换为 -
            .replace(/\\/g, '-') // 将 Windows 路径分隔符替换为 -
            .replace(/\.spect\.html$/, ''); // 移除文件扩展名

        // 如果 key 为空或已存在，使用文件名作为后备
        if (!key || input[key])
        {
            key = file.name;
        }

        // 使用绝对路径，因为文件可能在不同的目录中
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
// 从根目录开始扫描，包含所有测试文件
function generateTestConfig()
{
    // 从根目录开始扫描
    const testFiles = findSpectHtmlFiles(testWebDir, __dirname, TEST_FILE_PATTERN, EXCLUDE_PATTERNS);

    // 生成 rollupOptions.input，用于获取每个文件对应的 key
    const input = getSpectHtmlFiles();
    // 创建一个映射：文件路径 -> input key
    const pathToKeyMap = new Map();
    Object.entries(input).forEach(([key, path]) =>
    {
        if (key !== 'main')
        {
            pathToKeyMap.set(resolve(path), key);
        }
    });

    const tests = testFiles.map((file) =>
    {
        const htmlContent = readFileSync(file.path, 'utf-8');
        const fileName = file.relativePath.split('/').pop() || file.name;
        const testInfo = extractTestInfo(htmlContent, fileName);

        // 在 vite 开发模式下，使用相对于 root 的实际文件路径
        // root 现在是根目录，所以我们需要使用相对于根目录的路径
        // 例如：test_web/depth-attachment-canvas-readpixels.spect.html
        // 或者：packages/webgpu/test_web/depth-attachment-canvas-readpixels.spect.html
        let htmlFile = file.relativePath;

        // 确保路径以 / 开头
        if (!htmlFile.startsWith('/'))
        {
            htmlFile = '/' + htmlFile;
        }

        // 提取目录路径（相对于根目录）
        // 例如：test_web/depth-attachment-canvas-readpixels.spect.html -> test_web
        // 例如：packages/webgpu/test_web/depth-attachment-canvas-readpixels.spect.html -> packages/webgpu/test_web
        const dirPath = file.relativePath.split('/').slice(0, -1).join('/') || '.';

        return {
            name: testInfo.name,
            description: testInfo.description,
            htmlFile, // 使用相对于根目录的路径
            testName: testInfo.testName,
            dirPath, // 目录路径
        };
    });

    // 生成 TypeScript 配置文件
    // 将 JSON 字符串转换为使用单引号的格式
    const testsJson = JSON.stringify(tests, null, 4);
    let testsWithSingleQuotes = testsJson
        .replace(/"([^"]+)":/g, '$1:') // 移除属性名的引号
        .replace(/"/g, "'"); // 将字符串值的双引号替换为单引号

    // 确保每个对象的最后一个属性后面都有逗号
    // 匹配格式：属性值后面没有逗号，直接是换行和闭合大括号
    // 先处理所有对象（包括最后一个），然后再处理数组结尾
    testsWithSingleQuotes = testsWithSingleQuotes.replace(/([^,\n])\n {4}\}/g, '$1,\n    }');
    // 在最后一个对象后面确保有尾随逗号（如果还没有的话）
    // 匹配格式：\n    }\n] 并替换为 \n    },\n]
    testsWithSingleQuotes = testsWithSingleQuotes.replace(/(\n {4}\})\n\]/g, '$1,\n]');
    // 清理可能出现的重复分号和多余的逗号行
    testsWithSingleQuotes = testsWithSingleQuotes.replace(/;;/g, ';');
    testsWithSingleQuotes = testsWithSingleQuotes.replace(/\n,\n\]/g, ',\n]');

    const configContent = `// 此文件由构建工具自动生成，请勿手动编辑
// 此文件包含所有 .spect.html 测试文件的配置信息

export interface TestInfo
{
    name: string;
    description: string;
    htmlFile: string;
    testName: string;
    dirPath: string; // 目录路径（相对于根目录）
}

export const tests: TestInfo[] = ${testsWithSingleQuotes};
`;

    const configPath = join(testWebDir, 'test-config.ts');
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
        port: 3001,
        open: '/test.html',
    },
    build: {
        outDir: resolve(__dirname, 'test_dist'),
        rollupOptions: {
            input: getSpectHtmlFiles(),
            output: {
                // 确保输出文件名不包含路径分隔符
                entryFileNames: (chunkInfo) =>
                {
                    // 使用 chunk 的 name 作为文件名，确保不包含路径分隔符
                    const name = chunkInfo.name || 'chunk';

                    return `${name.replace(/[/\\]/g, '-')}.js`;
                },
                chunkFileNames: (chunkInfo) =>
                {
                    const name = chunkInfo.name || 'chunk';

                    return `chunks/${name.replace(/[/\\]/g, '-')}-[hash].js`;
                },
                assetFileNames: (assetInfo) =>
                {
                    // 对于 HTML 文件，使用原始名称（不包含路径分隔符）
                    if (assetInfo.name && assetInfo.name.endsWith('.html'))
                    {
                        const name = assetInfo.name.replace(/[/\\]/g, '-');

                        return name;
                    }

                    // 其他资源文件
                    const name = assetInfo.name || 'asset';

                    return `assets/${name.replace(/[/\\]/g, '-')}-[hash][extname]`;
                },
            },
        },
    },
    // resolve: {
    //     alias: {
    //         '@feng3d/webgl': resolve(__dirname, '../src'),
    //         '@feng3d/render-api': resolve(__dirname, '../packages/render-api/src'),
    //     },
    // },
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

