// 此文件由构建工具自动生成，请勿手动编辑
// 此文件包含所有 .spect.html 测试文件的配置信息

export interface TestInfo
{
    name: string;
    description: string;
    htmlFile: string;
    testName: string;
}

export const tests: TestInfo[] = [
    {
        "name": "WebGPU 深度附件和画布颜色读取测试",
        "description": "测试深度附件的正确性以及从画布读取像素颜色的功能。包含两个测试用例：没有深度附件时深度测试被禁用，有深度附件时深度测试启用。",
        "htmlFile": "depth-attachment-canvas-readpixels.spect.html",
        "testName": "depth-attachment-canvas-readpixels"
    }
];
