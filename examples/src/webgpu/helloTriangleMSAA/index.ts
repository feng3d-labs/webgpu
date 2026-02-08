import { RenderPassDescriptor, Submit, RenderObject } from '@feng3d/render-api';
import { WebGPU } from '@feng3d/webgpu';

import { setupExampleTest } from '../../testlib/test-wrapper';

import redFragWGSL from '../../shaders/red.frag.wgsl';
import triangleVertWGSL from '../../shaders/triangle.vert.wgsl';

const init = async (canvas: HTMLCanvasElement) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await new WebGPU().init();

    const renderPassDescriptor: RenderPassDescriptor = {
        colorAttachments: [{
            view: { texture: { context: { canvasId: canvas.id } } },
            clearValue: [0.0, 0.0, 0.0, 1.0],
        }],
        depthStencilAttachment: {
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
        sampleCount: 4, // 设置多重采样数量
    };

    const renderObject: RenderObject = {
        pipeline: {
            vertex: { code: triangleVertWGSL }, fragment: { code: redFragWGSL },
        },
        draw: { __type__: 'DrawVertex', vertexCount: 3 },
    };

    const data: Submit = {
        commandEncoders: [
            {
                passEncoders: [
                    { descriptor: renderPassDescriptor, renderPassObjects: [renderObject] },
                ],
            },
        ],
    };

    // 使用 setupExampleTest 设置测试模式
    setupExampleTest({
        testName: 'example-helloTriangleMSAA',
        canvas,
        render: () => webgpu.submit(data),
    });
};

const webgpuCanvas = document.getElementById('webgpu') as HTMLCanvasElement;

init(webgpuCanvas);
