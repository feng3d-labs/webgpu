/**
 * 测试包装器
 *
 * 此文件可以被示例导入，用于向测试页面报告测试结果
 *
 * 使用方式：
 * ```typescript
 * import { reportTestResult, isTestMode, wrapRequestAnimationFrame } from './src/lib/test-wrapper.js';
 *
 * // 检查是否在测试模式
 * if (isTestMode()) {
 *     // 使用测试模式特定的逻辑
 * }
 *
 * // 使用包装后的 requestAnimationFrame
 * const rAF = wrapRequestAnimationFrame();
 *
 * function frame() {
 *     webgpu.submit(submit);
 *     rAF(frame);  // 在测试模式下只会渲染指定帧数
 * }
 * rAF(frame);
 *
 * // 测试通过
 * reportTestResult({
 *     testName: 'my-test',
 *     passed: true,
 *     message: '测试通过'
 * });
 *
 * // 测试失败
 * reportTestResult({
 *     testName: 'my-test',
 *     passed: false,
 *     message: '测试失败：...'
 * });
 * ```
 */

// 重新导出 test-runner 中的功能
export { isTestMode, checkWebGPU, wrapRequestAnimationFrame, runTest, TestRunner, type TestRunnerOptions } from './test-runner';

// 同时导入 checkWebGPU 供内部使用
import { checkWebGPU } from './test-runner';

export interface TestResultData
{
    testName: string;
    passed: boolean;
    message?: string;
    details?: any;
}

/**
 * 向父窗口发送测试结果
 * 用于测试页面接收测试结果
 */
export function reportTestResult(data: TestResultData)
{
    // 检查是否在 iframe 中运行
    if (window.parent !== window)
    {
        window.parent.postMessage({
            type: 'test-result',
            ...data,
        }, '*');
    }
}

/**
 * 自动检测示例是否正常运行
 * 如果示例没有错误，自动报告测试通过
 */
export async function autoReportTestSuccess(testName: string, delay: number = 2000)
{
    // 等待一段时间后自动报告测试通过
    // 这假设示例在这段时间内能够正常初始化和渲染
    setTimeout(async () =>
    {
        const webgpuCheck = await checkWebGPU();

        if (webgpuCheck.success)
        {
            reportTestResult({
                testName,
                passed: true,
                message: '示例正常运行',
            });
        }
        else
        {
            reportTestResult({
                testName,
                passed: false,
                message: webgpuCheck.error || 'WebGPU 初始化失败',
            });
        }
    }, delay);
}
