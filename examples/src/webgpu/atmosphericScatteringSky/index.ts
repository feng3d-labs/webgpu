import { GUI } from "dat.gui";

import atmosphericScatteringSkyWGSL from "./atmosphericScatteringSky.wgsl";

import { IGPUCanvasContext, IGPUComputeObject, IGPUTexture, WebGPU } from "@feng3d/webgpu-renderer";

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const context: IGPUCanvasContext = {
        canvasId: canvas.id,
        configuration: {
            format: "rgba16float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
        }
    };

    const webgpu = await new WebGPU().init();

    const framebuffer: IGPUTexture = {
        label: "framebuffer",
        size: [canvas.width, canvas.height],
        format: "rgba16float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
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

    const computeObject0: IGPUComputeObject = {
        pipeline: {
            compute: { code: atmosphericScatteringSkyWGSL }
        },
        bindingResources: {
            uniformBuffer: uniformBuffer,
            outTexture: { texture: framebuffer }
        },
        workgroups: { workgroupCountX: Math.ceil(uniformBuffer.width / 64), workgroupCountY: Math.ceil(uniformBuffer.height / 64) },
    };

    let t = 0;
    function frame()
    {
        webgpu.submit({
            commandEncoders: [{ passEncoders: [{ __type: "IGPUComputePass", computeObjects: [computeObject0] }] }]
        });

        ++t;

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
