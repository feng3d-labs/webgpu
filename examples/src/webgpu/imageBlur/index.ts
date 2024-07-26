import { GUI } from "dat.gui";

import fullscreenTexturedQuadWGSL from "../../shaders/fullscreenTexturedQuad.wgsl";
import blurWGSL from "./blur.wgsl";

import { IBindingResources, IGPUBuffer, IComputePassEncoder, IComputePipeline, IRenderPass, IRenderPassEncoder, IRenderPipeline, ISampler, ISubmit, ITexture, WebGPU } from "webgpu-renderer";

// Contants from the blur.wgsl shader.
const tileDim = 128;
const batch = [4, 4];

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await WebGPU.init();

    const blurPipeline: IComputePipeline = {
        compute: {
            code: blurWGSL,
        },
    };

    const fullscreenQuadPipeline1: IRenderPipeline = {
        vertex: {
            code: fullscreenTexturedQuadWGSL,
        },
        fragment: {
            code: fullscreenTexturedQuadWGSL,
        },
    };

    const sampler: ISampler = {
        magFilter: "linear",
        minFilter: "linear",
    };

    const img = document.createElement("img");
    img.src = new URL(
        "../../../assets/img/Di-3d.png",
        import.meta.url
    ).toString();
    await img.decode();
    const imageBitmap = await createImageBitmap(img);

    const [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];
    const cubeTexture1: ITexture = {
        size: [srcWidth, srcHeight, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        source: [{ source: { source: imageBitmap }, destination: {}, copySize: { width: imageBitmap.width, height: imageBitmap.height } }],
    };

    const textures: ITexture[] = [0, 1].map(() =>
    ({
        size: [srcWidth, srcHeight],
        format: "rgba8unorm",
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    } as ITexture));

    const buffer0 = (() =>
    {
        const buffer: IGPUBuffer = {
            size: 4,
            usage: GPUBufferUsage.UNIFORM,
            data: new Uint32Array([0]),
        };

        return buffer;
    })();

    const buffer1 = (() =>
    {
        const buffer: IGPUBuffer = {
            size: 4,
            usage: GPUBufferUsage.UNIFORM,
            data: new Uint32Array([1]),
        };

        return buffer;
    })();

    const blurParamsBuffer: IGPUBuffer = {
        size: 8,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    };

    const computeConstants: IBindingResources = {
        samp: sampler,
        params: {
            buffer: blurParamsBuffer,
        },
    };

    const computeBindGroup0: IBindingResources = {
        inputTex: { texture: cubeTexture1 },
        outputTex: { texture: textures[0] },
        flip: {
            buffer: buffer0,
        }
    };

    const computeBindGroup1: IBindingResources = {
        inputTex: { texture: textures[0] },
        outputTex: { texture: textures[1] },
        flip: {
            buffer: buffer1,
        },
    };

    const computeBindGroup2: IBindingResources = {
        inputTex: { texture: textures[1] },
        outputTex: { texture: textures[0] },
        flip: {
            buffer: buffer0,
        },
    };

    const showResultBindGroup1: IBindingResources = {
        mySampler: sampler,
        myTexture: { texture: textures[1] },
    };

    const settings = {
        filterSize: 15,
        iterations: 2,
    };

    // 是否需要更新编码器。
    let needUpdateEncoder = true;
    let blockDim: number;
    const updateSettings = () =>
    {
        blockDim = tileDim - (settings.filterSize - 1);
        if (blurParamsBuffer.writeBuffers)
        {
            blurParamsBuffer.writeBuffers.push({ data: new Uint32Array([settings.filterSize, blockDim]) });
        }
        else
        {
            blurParamsBuffer.writeBuffers = [{ data: new Uint32Array([settings.filterSize, blockDim]) }];
        }
        needUpdateEncoder = true;
    };
    gui.add(settings, "filterSize", 1, 33).step(2).onChange(updateSettings);
    gui.add(settings, "iterations", 1, 10).step(1).onChange(() =>
    {
        needUpdateEncoder = true;
    });

    updateSettings();

    const renderPassDescriptor: IRenderPass = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            }
        ],
    };

    const gpuRenderPassEncoder: IRenderPassEncoder = {
        renderPass: renderPassDescriptor,
        renderObjects: [{
            pipeline: fullscreenQuadPipeline1,
            bindingResources: showResultBindGroup1,
            draw: { vertexCount: 6, instanceCount: 1, firstVertex: 0, firstInstance: 0 },
        }],
    };

    const gpuComputePassEncoder: IComputePassEncoder = { computeObjects: [] };
    const submit: ISubmit = {
        commandEncoders: [
            {
                passEncoders: [
                    gpuComputePassEncoder,
                    gpuRenderPassEncoder,
                ],
            }
        ]
    };

    const bindingResources0: IBindingResources = {
        ...computeConstants,
        ...computeBindGroup0,
    };
    const bindingResources1: IBindingResources = {
        ...computeConstants,
        ...computeBindGroup1,
    };
    const bindingResources2: IBindingResources = {
        ...computeConstants,
        ...computeBindGroup2,
    };

    function updateComputePassEncoder()
    {
        if (!gpuComputePassEncoder) return;

        gpuComputePassEncoder.computeObjects = [
            {
                pipeline: blurPipeline,
                bindingResources: bindingResources0,
                workgroups: { workgroupCountX: Math.ceil(srcWidth / blockDim), workgroupCountY: Math.ceil(srcHeight / batch[1]) }
            },
            {
                pipeline: blurPipeline,
                bindingResources: bindingResources1,
                workgroups: { workgroupCountX: Math.ceil(srcHeight / blockDim), workgroupCountY: Math.ceil(srcWidth / batch[1]) }
            },
        ];

        for (let i = 0; i < settings.iterations - 1; ++i)
        {
            gpuComputePassEncoder.computeObjects.push(
                {
                    pipeline: blurPipeline,
                    bindingResources: bindingResources2,
                    workgroups: { workgroupCountX: Math.ceil(srcWidth / blockDim), workgroupCountY: Math.ceil(srcHeight / batch[1]) }
                }
            );

            gpuComputePassEncoder.computeObjects.push(
                {
                    pipeline: blurPipeline,
                    bindingResources: bindingResources1,
                    workgroups: { workgroupCountX: Math.ceil(srcHeight / blockDim), workgroupCountY: Math.ceil(srcWidth / batch[1]) }
                }
            );
        }
    }

    function frame()
    {
        if (needUpdateEncoder)
        {
            updateComputePassEncoder();
        }

        webgpu.submit(submit);

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
