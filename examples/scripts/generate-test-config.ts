/**
 * 生成测试配置文件
 *
 * 从 files.json 读取所有示例，生成 test-config.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface FilesJson {
    [category: string]: string[];
}

interface TestInfo {
    name: string;
    description: string;
    htmlFile: string;
    testName: string;
    dirPath: string;
    type: 'spectest' | 'example';
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读取 files.json
const filesJsonPath = join(__dirname, 'resources', 'files.json');
const filesJson: FilesJson = JSON.parse(readFileSync(filesJsonPath, 'utf-8'));

// Spec 测试列表（手动维护）
const specTests: TestInfo[] = [
    {
        name: 'WebGPU 深度附件和画布颜色读取测试',
        description: '测试深度附件的正确性以及从画布读取像素颜色的功能。包含两个测试用例：没有深度附件时深度测试被禁用，有深度附件时深度测试启用。',
        htmlFile: './src/tests/depth-attachment-canvas-readpixels.spect.html',
        testName: 'depth-attachment-canvas-readpixels',
        dirPath: 'src/tests',
        type: 'spectest',
    },
];

// 从 files.json 生成示例测试列表
const exampleTests: TestInfo[] = [];

for (const category in filesJson)
{
    const examples = filesJson[category];

    for (const example of examples)
    {
        if (!example) continue; // 跳过空字符串

        exampleTests.push({
            name: example,
            description: `${category} 示例`,
            htmlFile: `./src/webgpu/${example}/index.html`,
            testName: `example-${example}`,
            dirPath: category,
            type: 'example',
        });
    }
}

// 合并所有测试
const allTests: TestInfo[] = [...specTests, ...exampleTests];

// 生成 TypeScript 代码
const output = `// 此文件由 generate-test-config.ts 自动生成，请勿手动编辑
// 此文件包含所有 .spect.html 测试文件和示例的配置信息

export interface TestInfo
{
    name: string;
    description: string;
    htmlFile: string;
    testName: string;
    dirPath: string; // 目录路径（相对于根目录）
    type: 'spectest' | 'example'; // 测试类型
}

export const tests: TestInfo[] = ${JSON.stringify(allTests, null, 4)};
`;

// 写入 test-config.ts
const outputPath = join(__dirname, 'test-config.ts');

writeFileSync(outputPath, output, 'utf-8');

console.log(`已生成测试配置文件: ${outputPath}`);
console.log(`总计 ${allTests.length} 个测试 (${specTests.length} 个 spectest, ${exampleTests.length} 个 example)`);
