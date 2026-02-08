// 必须首先导入 test-wrapper，以确保在测试模式下能捕获所有日志（包括其他模块导入时的日志）
import { isTestMode, getAndStopGlobalCapture, captureCanvasAsync, isRenderBlack } from '../../testlib/test-wrapper';

const init = async (canvas: HTMLCanvasElement) =>
{
    // The web worker is created by passing a path to the worker's source file, which will then be
    // executed on a separate thread.
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    // The primary way to communicate with the worker is to send and receive messages.
    worker.addEventListener('message', (ev) =>
    {
    // The format of the message can be whatever you'd like, but it's helpful to decide on a
    // consistent convention so that you can tell the message types apart as your apps grow in
    // complexity. Here we establish a convention that all messages to and from the worker will
    // have a `type` field that we can use to determine the content of the message.
        switch (ev.data.type)
        {
            case 'ready': {
                // Worker 已初始化完成，在测试模式下等待一定帧数后捕获结果
                if (isTestMode())
                {
                    // 等待几秒后捕获画布内容
                    setTimeout(async () =>
                    {
                        // 直接从主线程的 canvas 捕获渲染结果
                        // 注意：transferControlToOffscreen 后，主线程的 canvas 会自动显示 offscreenCanvas 的内容
                        const renderData = await captureCanvasAsync(canvas);

                        // 检查渲染结果是否为纯黑色
                        let passed = true;
                        let message = 'Worker 渲染完成';

                        if (renderData)
                        {
                            const blackRender = await isRenderBlack(renderData);

                            if (blackRender)
                            {
                                passed = false;
                                message = '渲染结果为纯黑色，可能存在渲染问题';
                            }
                        }

                        // 获取主线程捕获的日志
                        const logs = getAndStopGlobalCapture();

                        // 发送测试结果到父窗口
                        const testName = new URLSearchParams(window.location.search).get('testName') || 'example-worker';

                        window.parent.postMessage({
                            type: 'test-result',
                            testName,
                            passed,
                            message,
                            renderData: renderData || undefined,
                            renderDataType: 'png',
                            logs,
                        }, '*');
                    }, 2000); // 等待2秒让渲染完成
                }
                break;
            }
            default: {
                console.error(`Unknown Message Type: ${ev.data.type}`);
            }
        }
    });

    // In order for the worker to display anything on the page, an OffscreenCanvas must be used.
    // Here we can create one from our normal canvas by calling transferControlToOffscreen().
    // Anything drawn to the OffscreenCanvas that call returns will automatically be displayed on
    // the source canvas on the page.
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const devicePixelRatio = window.devicePixelRatio;

    offscreenCanvas.width = canvas.clientWidth * devicePixelRatio;
    offscreenCanvas.height = canvas.clientHeight * devicePixelRatio;

    // Send a message to the worker telling it to initialize WebGPU with the OffscreenCanvas. The
    // array passed as the second argument here indicates that the OffscreenCanvas is to be
    // transferred to the worker, meaning this main thread will lose access to it and it will be
    // fully owned by the worker.
    worker.postMessage({ type: 'init', offscreenCanvas }, [offscreenCanvas]);
};

const webgpuCanvas = document.getElementById('webgpu') as HTMLCanvasElement;

init(webgpuCanvas);
