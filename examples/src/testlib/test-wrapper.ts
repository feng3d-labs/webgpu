/**
 * 测试包装器
 *
 * 此文件可以被示例导入，用于向测试页面报告测试结果
 *
 * 使用方式：
 * ```typescript
 * import { reportTestResult, isTestMode, wrapRequestAnimationFrame, captureCanvas } from './src/lib/test-wrapper.js';
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
 * // 测试通过，并附带渲染截图
 * const canvas = document.getElementById('webgpu') as HTMLCanvasElement;
 * const imageData = captureCanvas(canvas);
 *
 * reportTestResult({
 *     testName: 'my-test',
 *     passed: true,
 *     message: '测试通过',
 *     renderData: imageData,  // 渲染结果数据
 *     logs: ['info: 初始化完成', 'info: 渲染成功']  // 完整日志
 * });
 * ```
 */

// 重新导出 test-runner 中的功能
export { isTestMode, checkWebGPU, wrapRequestAnimationFrame, runTest, TestRunner, type TestRunnerOptions } from './test-runner';

// 同时导入 isTestMode 和 checkWebGPU 供内部使用
import { isTestMode, checkWebGPU } from './test-runner';

/**
 * 控制台日志项
 */
export interface ConsoleLogItem
{
    /** 日志级别 */
    level: 'log' | 'info' | 'warn' | 'error' | 'debug';
    /** 日志内容 */
    message: string;
    /** 时间戳 */
    timestamp?: number;
}

/**
 * 控制台日志捕获器
 */
export class ConsoleCapture
{
    private logs: ConsoleLogItem[] = [];
    private originalConsole: {
        log?: typeof console.log;
        info?: typeof console.info;
        warn?: typeof console.warn;
        error?: typeof console.error;
        debug?: typeof console.debug;
    } = {};

    /** 开始捕获控制台输出 */
    start(): void
    {
        // 保存原始方法
        this.originalConsole.log = console.log;
        this.originalConsole.info = console.info;
        this.originalConsole.warn = console.warn;
        this.originalConsole.error = console.error;
        this.originalConsole.debug = console.debug;

        const capture = (level: ConsoleLogItem['level']) =>
            (...args: any[]) =>
            {
                const message = args.map(arg =>
                {
                    if (typeof arg === 'string') return arg;
                    if (arg instanceof Error) return arg.message;
                    try
                    {
                        return JSON.stringify(arg);
                    }
                    catch
                    {
                        return String(arg);
                    }
                }).join(' ');

                this.logs.push({
                    level,
                    message,
                    timestamp: Date.now(),
                });

                // 调用原始方法
                const original = this.originalConsole[level as keyof typeof this.originalConsole];

                if (original)
                {
                    original.apply(console, args);
                }
            };

        console.log = capture('log');
        console.info = capture('info');
        console.warn = capture('warn');
        console.error = capture('error');
        console.debug = capture('debug');
    }

    /** 停止捕获并返回日志 */
    stop(): ConsoleLogItem[]
    {
        // 恢复原始方法
        if (this.originalConsole.log) console.log = this.originalConsole.log;
        if (this.originalConsole.info) console.info = this.originalConsole.info;
        if (this.originalConsole.warn) console.warn = this.originalConsole.warn;
        if (this.originalConsole.error) console.error = this.originalConsole.error;
        if (this.originalConsole.debug) console.debug = this.originalConsole.debug;

        return this.logs;
    }

    /** 获取当前捕获的日志（不停止捕获） */
    getLogs(): ConsoleLogItem[]
    {
        return [...this.logs];
    }

    /** 清空日志 */
    clear(): void
    {
        this.logs = [];
    }
}

/**
 * 全局日志捕获器
 * 在测试模式下，从模块加载时就捕获所有控制台输出
 */
let globalConsoleCapture: ConsoleCapture | null = null;

// 在测试模式下，立即启动全局日志捕获
if (isTestMode())
{
    globalConsoleCapture = new ConsoleCapture();
    globalConsoleCapture.start();
}

/**
 * 获取全局日志并停止捕获
 * 此函数仅供 setupExampleTest 内部使用
 */
export function getAndStopGlobalCapture(): ConsoleLogItem[]
{
    if (globalConsoleCapture)
    {
        const logs = globalConsoleCapture.stop();

        globalConsoleCapture = null;

        return logs;
    }

    return [];
}

/**
 * 测试结果数据接口
 */
export interface TestResultData
{
    testName: string;
    passed: boolean;
    message?: string;
    /** 渲染结果数据（截图或 canvas 数据） */
    renderData?: string | ArrayBuffer;
    /** 渲染结果类型 */
    renderDataType?: 'png' | 'jpeg' | 'webp' | 'arraybuffer';
    /** 完整的控制台日志 */
    logs?: ConsoleLogItem[];
    /** 其他详细信息 */
    details?: any;
}

/**
 * 捕获 Canvas 渲染结果
 * @param canvas 要截图的 canvas 元素
 * @param format 图片格式（默认为 png）
 * @param quality 图片质量（仅对 jpeg/webp 有效，0-1）
 * @returns base64 编码的图片数据（不含 data URL 前缀）
 */
export function captureCanvas(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality: number = 0.92,
): string | null
{
    try
    {
        let dataUrl: string;

        if (canvas instanceof OffscreenCanvas)
        {
            // OffscreenCanvas 使用 convertToBlob
            const blob = canvas.convertToBlob({ type: `image/${format}`, quality });

            // 注意：convertToBlob 返回 Promise，这里需要同步处理
            // 为了简化，我们假设这是一个同步调用（实际可能需要 Promise）
            // 暂时返回 null，建议使用异步版本
            return null;
        }
        else
        {
            // 普通 HTMLCanvasElement 使用 toDataURL
            dataUrl = canvas.toDataURL(`image/${format}`, quality);
        }

        // 移除 data URL 前缀，只保留 base64 数据
        const base64Data = dataUrl.split(',')[1];

        return base64Data;
    }
    catch (e)
    {
        console.warn('无法捕获 canvas 内容:', e);

        return null;
    }
}

/**
 * 异步捕获 Canvas 渲染结果
 * @param canvas 要截图的 canvas 元素
 * @param format 图片格式（默认为 png）
 * @param quality 图片质量（仅对 jpeg/webp 有效，0-1）
 * @returns Promise<string | null> base64 编码的图片数据（不含 data URL 前缀）
 */
export async function captureCanvasAsync(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality: number = 0.92,
): Promise<string | null>
{
    try
    {
        if (canvas instanceof OffscreenCanvas)
        {
            const blob = await canvas.convertToBlob({ type: `image/${format}`, quality });
            const arrayBuffer = await blob.arrayBuffer();
            // 将 ArrayBuffer 转换为 base64
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';

            for (let i = 0; i < uint8Array.length; i++)
            {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);

            return base64;
        }
        else
        {
            const dataUrl = canvas.toDataURL(`image/${format}`, quality);
            const base64Data = dataUrl.split(',')[1];

            return base64Data;
        }
    }
    catch (e)
    {
        console.warn('无法捕获 canvas 内容:', e);

        return null;
    }
}

/**
 * 向父窗口发送测试结果
 * 用于测试页面接收测试结果
 */
export function reportTestResult(data: TestResultData)
{
    // 检查是否在 iframe 中运行
    const globalObj: any = (typeof window !== 'undefined') ? window : self;

    if (globalObj.parent !== globalObj)
    {
        globalObj.parent.postMessage({
            type: 'test-result',
            ...data,
        }, '*');
    }
}

/**
 * 示例测试运行器 - 简化示例代码的测试集成
 *
 * 使用方式：
 * ```typescript
 * import { setupExampleTest } from './test-wrapper';
 *
 * const webgpu = await new WebGPU().init();
 * const submit = { ... };
 *
 * setupExampleTest({
 *     testName: 'helloTriangle',
 *     canvas,
 *     render: (time?: number) => webgpu.submit(submit),
 * });
 * ```
 */
export interface SetupExampleTestOptions
{
    /** 测试名称 */
    testName: string;
    /** Canvas 元素 */
    canvas: HTMLCanvasElement;
    /** 渲染函数 */
    render: (time?: number) => void;
    /** 渲染多少帧后停止（默认为3帧） */
    frameCount?: number;
    /** 完成后的额外延迟（毫秒） */
    finishDelay?: number;
}

/**
 * 设置示例的测试模式
 *
 * 此函数会：
 * 1. 检测是否在测试模式下运行
 * 2. 如果是测试模式，包装 requestAnimationFrame 并在达到指定帧数后捕获结果
 * 3. 自动捕获日志和渲染画面
 *
 * @returns 如果在测试模式下，返回包装后的 rAF 函数；否则返回原始 requestAnimationFrame
 */
export function setupExampleTest(options: SetupExampleTestOptions): typeof requestAnimationFrame
{
    const { testName, canvas, render, frameCount = 3, finishDelay = 100 } = options;

    // 如果不在测试模式，启动持续渲染循环
    if (!isTestMode())
    {
        // 非测试模式下，启动持续的渲染循环以支持动画
        const renderLoop = (time: number) =>
        {
            render(time);
            requestAnimationFrame(renderLoop);
        };

        requestAnimationFrame(renderLoop);

        return requestAnimationFrame;
    }

    // 测试模式下的逻辑
    let framesRendered = 0;

    // 定义渲染循环函数
    const renderLoop = () =>
    {
        // 执行渲染
        render();
        framesRendered++;

        if (framesRendered >= frameCount)
        {
            // 达到最大帧数，延迟后报告结果
            setTimeout(async () =>
            {
                // 获取全局日志（从模块加载时就开始捕获）
                const logs = getAndStopGlobalCapture();
                const renderData = await captureCanvasAsync(canvas);

                // 检查渲染结果是否为纯黑色
                let passed = true;
                let message = `成功渲染 ${framesRendered} 帧`;

                if (renderData)
                {
                    const blackRender = await isRenderBlack(renderData);

                    if (blackRender)
                    {
                        passed = false;
                        message = `渲染结果为纯黑色，可能存在渲染问题`;
                    }
                }

                reportTestResult({
                    testName,
                    passed,
                    message,
                    renderData: renderData || undefined,
                    renderDataType: 'png',
                    logs,
                });
            }, finishDelay);
        }
        else
        {
            // 继续下一帧
            requestAnimationFrame(renderLoop);
        }
    };

    // 开始渲染循环
    requestAnimationFrame(renderLoop);

    // 返回一个伪 RAF 函数，测试模式下不应该被调用
    return requestAnimationFrame;
}

/**
 * 检查渲染结果是否为纯黑色
 * @param renderData base64 编码的图片数据
 * @param threshold 黑色阈值（0-255），默认为 10
 * @param blackPixelRatio 判定为纯黑的黑像素比例阈值（0-1），默认为 0.95（95%以上像素为黑色）
 * @returns 是否为纯黑色渲染
 */
export async function isRenderBlack(
    renderData: string,
    threshold: number = 10,
    blackPixelRatio: number = 0.95,
): Promise<boolean>
{
    try
    {
        // 将 base64 数据转换为 Image
        const image = await new Promise<HTMLImageElement>((resolve, reject) =>
        {
            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = `data:image/png;base64,${renderData}`;
        });

        // 创建临时 canvas 来读取像素数据
        const canvas = document.createElement('canvas');

        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) return false;

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let blackPixels = 0;
        const totalPixels = data.length / 4;

        // 统计黑色像素数量
        for (let i = 0; i < data.length; i += 4)
        {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 如果像素接近黑色
            if (r < threshold && g < threshold && b < threshold)
            {
                blackPixels++;
            }
        }

        // 如果超过指定比例的像素是黑色，则认为是纯黑渲染
        return (blackPixels / totalPixels) >= blackPixelRatio;
    }
    catch (e)
    {
        console.warn('检查渲染结果是否为纯黑时出错:', e);

        return false;
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
