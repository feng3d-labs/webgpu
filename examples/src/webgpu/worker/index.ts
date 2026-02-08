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
            case 'test-result': {
                // 转发 Worker 的测试结果到父窗口（测试页面）
                if (window.parent !== window)
                {
                    window.parent.postMessage(ev.data, '*');
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

    // 获取测试名称，用于在测试模式下正确报告结果
    const testName = (typeof window !== 'undefined' && window.location)
        ? new URLSearchParams(window.location.search).get('testName') || 'example-worker'
        : 'example-worker';

    // Send a message to the worker telling it to initialize WebGPU with the OffscreenCanvas. The
    // array passed as the second argument here indicates that the OffscreenCanvas is to be
    // transferred to the worker, meaning this main thread will lose access to it and it will be
    // fully owned by the worker.
    worker.postMessage({ type: 'init', offscreenCanvas, testName }, [offscreenCanvas]);
};

const webgpuCanvas = document.getElementById('webgpu') as HTMLCanvasElement;

init(webgpuCanvas);
