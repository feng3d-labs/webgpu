import { RenderObject, RenderPassDescriptor, Sampler, Submit } from '@feng3d/render-api';
import { WebGPU } from '@feng3d/webgpu';

import { wrapRequestAnimationFrame } from '../../testlib/test-wrapper';

import fullscreenTexturedQuadWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import sampleExternalTextureWGSL from '../../shaders/sampleExternalTexture.frag.wgsl';

const init = async (canvas: HTMLCanvasElement) =>
{
    // Set video element
    const video = document.createElement('video');

    video.loop = true;
    video.autoplay = true;
    video.muted = true;
    video.src = new URL(
        '../../../assets/video/pano.webm',
        import.meta.url,
    ).toString();
    await video.play();

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

    // 测试模式下使用 requestAnimationFrame 替代 requestVideoFrameCallback
    // 因为 requestVideoFrameCallback 需要视频实际播放，在测试环境中可能导致超时
    const isTestMode = (typeof window !== 'undefined') && (
        window.location.search.includes('test=true') ||
        (window.parent !== window && window.parent.location.pathname.includes('test.html'))
    );

    let frameCount = 0;
    const maxFrames = isTestMode ? 3 : Infinity;

    function frame()
    {
        webgpu.submit(data);

        frameCount++;

        // 测试模式下限制帧数
        if (isTestMode && frameCount >= maxFrames)
        {
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
