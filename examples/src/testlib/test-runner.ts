/**
 * WebGPU 示例测试运行器
 *
 * 用于在测试模式下运行示例，捕获错误并报告结果
 *
 * 使用方式：
 * ```typescript
 * import { TestRunner } from './lib/test-runner.js';
 *
 * const testRunner = new TestRunner({
 *     testName: 'helloTriangle',
 *     renderFrame: async () => {
 *         // 执行一帧渲染
 *         webgpu.submit(submit);
 *     },
 * });
 *
 * testRunner.start();
 * ```
 */

export interface TestRunnerOptions
{
    /** 测试名称（用于报告结果） */
    testName: string;
    /** 渲染一帧的函数（可以是同步或异步） */
    renderFrame?: () => void | Promise<void>;
    /** 渲染多少帧后停止（默认为3帧） */
    frameCount?: number;
    /** 每帧之间的延迟（毫秒） */
    frameDelay?: number;
    /** 完成后的额外延迟（毫秒） */
    finishDelay?: number;
    /** 是否检查 WebGPU 可用性（默认为 true） */
    checkWebGPU?: boolean;
}

export interface TestResult
{
    testName: string;
    passed: boolean;
    message: string;
    details?: {
        errors: string[];
        warnings: string[];
        frameCount: number;
    };
}

/**
 * 检测是否在测试模式下运行
 */
export function isTestMode(): boolean
{
    // 在 Worker 环境中，self 就是全局对象
    const globalObj: any = (typeof window !== 'undefined') ? window : self;

    // 检查是否在 iframe 或 worker 中（通过检查 parent 是否等于自身）
    if (globalObj.parent !== globalObj)
    {
        try
        {
            // 尝试访问父窗口的 location，如果可以访问且是 test.html，则认为是测试模式
            if (globalObj.parent.location.pathname.includes('test.html'))
            {
                return true;
            }
        }
        catch (e)
        {
            // 跨域无法访问，假设是测试模式
            return true;
        }
    }

    // 检查 URL 参数（仅在有 window 对象时）
    if (typeof window !== 'undefined' && window.location)
    {
        const params = new URLSearchParams(window.location.search);

        if (params.get('test') === 'true') return true;
    }

    return false;
}

/**
 * 检查 WebGPU 是否可用
 */
export async function checkWebGPU(): Promise<{ success: boolean; error?: string }>
{
    try
    {
        const gpu = (navigator as any).gpu;

        if (!gpu)
        {
            return { success: false, error: 'WebGPU 不受支持' };
        }
        const adapter = await gpu.requestAdapter();

        if (!adapter)
        {
            return { success: false, error: '没有可用的 WebGPU 适配器' };
        }
        adapter.dispose();

        return { success: true };
    }
    catch (e)
    {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * 测试运行器类
 */
export class TestRunner
{
    private options: Required<TestRunnerOptions>;
    private frameCount = 0;
    private errors: string[] = [];
    private warnings: string[] = [];
    private consoleError?: () => void;
    private consoleWarn?: () => void;
    private animationFrameId?: number;
    private isRunning = false;

    constructor(options: TestRunnerOptions)
    {
        this.options = {
            testName: options.testName,
            renderFrame: options.renderFrame || (() =>
            { }),
            frameCount: options.frameCount ?? 3,
            frameDelay: options.frameDelay ?? 100,
            finishDelay: options.finishDelay ?? 500,
            checkWebGPU: options.checkWebGPU ?? true,
        };
    }

    /**
     * 开始测试
     */
    async start(): Promise<void>
    {
        if (this.isRunning) return;
        this.isRunning = true;

        // 捕获控制台输出
        this.setupConsoleCapture();

        // 检查 WebGPU
        if (this.options.checkWebGPU)
        {
            const gpuCheck = await checkWebGPU();

            if (!gpuCheck.success)
            {
                this.reportResult(false, gpuCheck.error || 'WebGPU 初始化失败');

                return;
            }
        }

        // 运行测试帧
        await this.runTestFrames();
    }

    /**
     * 停止测试
     */
    stop(): void
    {
        this.isRunning = false;
        if (this.animationFrameId !== undefined)
        {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }
        this.restoreConsole();
    }

    /**
     * 设置控制台捕获
     */
    private setupConsoleCapture(): void
    {
        const originalError = console.error;
        const originalWarn = console.warn;

        this.consoleError = () =>
        {
            console.error = originalError;
        };
        this.consoleWarn = () =>
        {
            console.warn = originalWarn;
        };

        console.error = (...args: any[]) =>
        {
            const message = args.map(arg =>
                typeof arg === 'string' ? arg : JSON.stringify(arg),
            ).join(' ');

            this.errors.push(message);
            originalError.apply(console, args);
        };

        console.warn = (...args: any[]) =>
        {
            const message = args.map(arg =>
                typeof arg === 'string' ? arg : JSON.stringify(arg),
            ).join(' ');

            this.warnings.push(message);
            originalWarn.apply(console, args);
        };
    }

    /**
     * 恢复控制台
     */
    private restoreConsole(): void
    {
        if (this.consoleError) this.consoleError();
        if (this.consoleWarn) this.consoleWarn();
    }

    /**
     * 运行测试帧
     */
    private async runTestFrames(): Promise<void>
    {
        const runFrame = async (): Promise<void> =>
        {
            if (!this.isRunning || this.frameCount >= this.options.frameCount)
            {
                // 完成测试
                setTimeout(() =>
                {
                    this.finishTest();
                }, this.options.finishDelay);

                return;
            }

            try
            {
                await this.options.renderFrame();
                this.frameCount++;
            }
            catch (error)
            {
                const errorMessage = error instanceof Error ? error.message : String(error);

                this.errors.push(`渲染错误: ${errorMessage}`);
            }

            // 等待指定延迟后继续下一帧
            setTimeout(() =>
            {
                if (this.isRunning)
                {
                    this.animationFrameId = requestAnimationFrame(runFrame);
                }
            }, this.options.frameDelay);
        };

        runFrame();
    }

    /**
     * 完成测试并报告结果
     */
    private finishTest(): void
    {
        this.stop();

        const hasErrors = this.errors.length > 0;
        const passed = !hasErrors;

        let message = '';

        if (passed)
        {
            message = `成功渲染 ${this.frameCount} 帧`;
            if (this.warnings.length > 0)
            {
                message += `（有 ${this.warnings.length} 个警告）`;
            }
        }
        else
        {
            message = `发现 ${this.errors.length} 个错误`;
            if (this.errors.length > 0)
            {
                message += `: ${this.errors[0]}`;
            }
        }

        const result: TestResult = {
            testName: this.options.testName,
            passed,
            message,
            details: {
                errors: this.errors,
                warnings: this.warnings,
                frameCount: this.frameCount,
            },
        };

        this.sendResult(result);
    }

    /**
     * 发送测试结果
     */
    private sendResult(result: TestResult): void
    {
        // 获取全局对象（window 或 self for Workers）
        const globalObj: any = (typeof window !== 'undefined') ? window : self;

        // 如果在 iframe 或 worker 中，向父窗口发送结果
        if (globalObj.parent !== globalObj)
        {
            globalObj.parent.postMessage({
                type: 'test-result',
                testName: result.testName,
                passed: result.passed,
                message: result.message,
                details: result.details,
            }, '*');
        }
    }

    /**
     * 手动报告测试结果
     */
    reportResult(passed: boolean, message: string, details?: any): void
    {
        this.stop();
        const result: TestResult = {
            testName: this.options.testName,
            passed,
            message,
            details: {
                errors: passed ? [] : [message],
                warnings: this.warnings,
                frameCount: this.frameCount,
                ...details,
            },
        };

        this.sendResult(result);
    }
}

/**
 * 快捷函数：创建并启动测试运行器
 */
export async function runTest(options: TestRunnerOptions): Promise<void>
{
    if (!isTestMode())
    {
        // 不在测试模式下，不启动测试运行器
        return;
    }

    const runner = new TestRunner(options);

    await runner.start();
}

/**
 * 替换 requestAnimationFrame 以支持测试模式
 *
 * 使用方式：
 * ```typescript
 * import { wrapRequestAnimationFrame } from './lib/test-runner.js';
 *
 * const rAF = wrapRequestAnimationFrame();
 *
 * function frame() {
 *     // 渲染逻辑
 *     webgpu.submit(submit);
 *     rAF(frame);
 * }
 * rAF(frame);
 * ```
 */
export function wrapRequestAnimationFrame(maxFrames: number = 3): typeof requestAnimationFrame
{
    if (!isTestMode())
    {
        return requestAnimationFrame;
    }

    let frameCount = 0;
    let reported = false;

    // 获取全局对象（window 或 self for Workers）
    const globalObj: any = (typeof window !== 'undefined') ? window : self;

    // 获取测试名称
    let testName = 'example-worker'; // Worker 的默认测试名称

    // 如果有 window 对象，尝试从 URL 参数或 pathname 推断
    if (typeof window !== 'undefined' && window.location)
    {
        // 首先尝试从 URL 参数获取
        const params = new URLSearchParams(window.location.search);

        testName = params.get('testName') || testName;

        // 如果没有，尝试从 pathname 推断（例如 /sky/index.html -> example-sky）
        if (testName === 'example-worker')
        {
            const pathParts = window.location.pathname.split('/');
            const dirName = pathParts[pathParts.length - 2]; // 获取倒数第二部分（目录名）

            if (dirName && dirName !== 'src' && dirName !== 'webgpu')
            {
                testName = `example-${dirName}`;
            }
            else
            {
                testName = `example-${pathParts[pathParts.length - 1] || 'unknown'}`;
            }
        }
    }

    return (callback: FrameRequestCallback) =>
    {
        if (frameCount >= maxFrames && !reported)
        {
            reported = true;

            // 达到最大帧数，停止渲染并报告成功
            setTimeout(() =>
            {
                const result: TestResult = {
                    testName,
                    passed: true,
                    message: `成功渲染 ${frameCount} 帧`,
                    details: {
                        errors: [],
                        warnings: [],
                        frameCount,
                    },
                };

                if (globalObj.parent !== globalObj)
                {
                    globalObj.parent.postMessage({
                        type: 'test-result',
                        ...result,
                    }, '*');
                }
            }, 500);

            return 0;
        }

        frameCount++;

        return requestAnimationFrame(callback);
    };
}
