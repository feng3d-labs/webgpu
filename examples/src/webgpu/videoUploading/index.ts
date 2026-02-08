import { RenderObject, RenderPassDescriptor, Sampler, Submit } from '@feng3d/render-api';
import { WebGPU } from '@feng3d/webgpu';

import { wrapRequestAnimationFrame } from '../../testlib/test-wrapper';

import fullscreenTexturedQuadWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import sampleExternalTextureWGSL from '../../shaders/sampleExternalTexture.frag.wgsl';

const init = async (canvas: HTMLCanvasElement) =>
{
    // 检测测试模式（需要在 await video.play() 之前）
    const isTestMode = (typeof window !== 'undefined') && (
        window.location.search.includes('test=true') ||
        (window.parent !== window && window.parent.location.pathname.includes('test.html'))
    );

    // Set video element
    const video = document.createElement('video');

    video.loop = true;
    video.autoplay = true;
    video.muted = true;
    video.src = new URL(
        '../../../assets/video/pano.webm',
        import.meta.url,
    ).toString();

    // 测试模式下跳过等待视频播放，避免阻塞
    if (!isTestMode)
    {
        await video.play();
    }

    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await new WebGPU().init();

    const sampler: Sampler = {
        magFilter: 'linear',
        minFilter: 'linear',
    };

    const renderPass: RenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },
                clearValue: [0.0, 0.0, 0.0, 1.0],
            },
        ],
    };

    const renderObject: RenderObject = {
        pipeline: {
            vertex: { code: fullscreenTexturedQuadWGSL }, fragment: { code: sampleExternalTextureWGSL },
        },
        bindingResources: {
            mySampler: sampler,
            myTexture: {
                source: video,
            },
        },
        draw: { __type__: 'DrawVertex', vertexCount: 6 },
    };

    const data: Submit = {
        commandEncoders: [
            {
                passEncoders: [
                    { descriptor: renderPass, renderPassObjects: [renderObject] },
                ],
            },
        ],
    };

    // 使用包装后的 requestAnimationFrame，测试模式下只会渲染指定帧数
    const rAF = wrapRequestAnimationFrame();

    let frameCount = 0;
    const maxFrames = isTestMode ? 3 : Infinity;

    function frame()
    {
        webgpu.submit(data);

        frameCount++;

        // 测试模式下限制帧数
        if (isTestMode && frameCount >= maxFrames)
        {
            // 再调用一次 rAF 以触发 wrapRequestAnimationFrame 的结果报告
            rAF(frame);

            return; // 停止渲染
        }

        if (!isTestMode && 'requestVideoFrameCallback' in video)
        {
            // 只在非测试模式下使用 requestVideoFrameCallback
            video.requestVideoFrameCallback(frame);
        }
        else
        {
            rAF(frame);
        }
    }

    if (!isTestMode && 'requestVideoFrameCallback' in video)
    {
        video.requestVideoFrameCallback(frame);
    }
    else
    {
        rAF(frame);
    }
};

const webgpuCanvas = document.getElementById('webgpu') as HTMLCanvasElement;

init(webgpuCanvas);
