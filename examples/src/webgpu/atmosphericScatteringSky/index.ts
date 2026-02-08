// 必须首先导入 test-wrapper，以确保在测试模式下能捕获所有日志（包括其他模块导入时的日志）
import { setupExampleTest } from '../../testlib/test-wrapper';
import { GUI } from 'dat.gui';

import atmosphericScatteringSkyWGSL from './atmosphericScatteringSky.wgsl';

import { CanvasContext, Texture } from '@feng3d/render-api';
import { ComputeObject, WebGPU } from '@feng3d/webgpu';

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const context: CanvasContext = {
        canvasId: canvas.id,
        configuration: {
            format: 'rgba16float',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
        },
    };

    const webgpu = await new WebGPU().init();

    const framebuffer: Texture = {
        descriptor: {
            label: 'framebuffer',
            size: [canvas.width, canvas.height],
            format: 'rgba16float',
        },
    };

    const uniformBuffer = {
        width: 1024,
        height: 512,
        sunRadius: 500.0,
        sunRadiance: 11.0,
        mieG: 0.76,
        mieHeight: 1200,
        eyePos: 1500,
        sunU: 0.71,
        sunV: 0.56,
        sunBrightness: 1.0,
        displaySun: 1,
        defaultTextureCubeSize: 512,
        defaultTexture2DSize: 1024,
        skyColor: [1, 1, 1, 1],
    };

    const computeObject0: ComputeObject = {
        pipeline: {
            compute: { code: atmosphericScatteringSkyWGSL },
        },
        bindingResources: {
            uniformBuffer: { value: uniformBuffer },
            outTexture: { texture: framebuffer },
        },
        workgroups: { workgroupCountX: Math.ceil(uniformBuffer.width / 64), workgroupCountY: Math.ceil(uniformBuffer.height / 64) },
    };

    // 使用 setupExampleTest 设置测试模式
    setupExampleTest({
        testName: 'example-atmosphericScatteringSky',
        canvas,
        render: () => webgpu.submit({
            commandEncoders: [{ passEncoders: [{ __type__: 'ComputePass', computeObjects: [computeObject0] }] }],
        }),
    });
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById('webgpu') as HTMLCanvasElement;

init(webgpuCanvas, panel);
