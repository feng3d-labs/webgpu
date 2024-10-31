import { GUI } from "dat.gui";

import spriteWGSL from "./sprite.wgsl";
import updateSpritesWGSL from "./updateSprites.wgsl";

import { IGPUBuffer, IGPUComputeObject, IGPURenderObject, IGPURenderPassDescriptor, IGPUSubmit, WebGPU } from "@feng3d/webgpu-renderer";

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await new WebGPU().init();

    // prettier-ignore
    const vertexBufferData = new Float32Array([
        -0.01, -0.02, 0.01,
        -0.02, 0.0, 0.02,
    ]);

    const simParams = {
        deltaT: 0.04,
        rule1Distance: 0.1,
        rule2Distance: 0.025,
        rule3Distance: 0.025,
        rule1Scale: 0.02,
        rule2Scale: 0.05,
        rule3Scale: 0.005,
    };

    const simParamBufferSize = 7 * Float32Array.BYTES_PER_ELEMENT;
    const simParamBuffer: IGPUBuffer = {
        size: simParamBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };

    Object.keys(simParams).forEach((k) =>
    {
        gui.add(simParams, k as any);
    });

    const numParticles = 1500;
    const initialParticleData = new Float32Array(numParticles * 4);
    for (let i = 0; i < numParticles; ++i)
    {
        initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
        initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
        initialParticleData[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.1;
        initialParticleData[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.1;
    }

    const particleBuffers: IGPUBuffer[] = new Array(2);
    for (let i = 0; i < 2; ++i)
    {
        particleBuffers[i] = {
            size: initialParticleData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
            data: initialParticleData,
        };
    }

    const computeObject0: IGPUComputeObject = {
        pipeline: {
            compute: { code: updateSpritesWGSL }
        },
        bindingResources: {
            params: {
                buffer: simParamBuffer,
                map: simParams,
            },
            particlesA: {
                buffer: particleBuffers[0],
            },
            particlesB: {
                buffer: particleBuffers[1],
            },
        },
        workgroups: { workgroupCountX: Math.ceil(numParticles / 64) },
    };

    const computeObject1: IGPUComputeObject = {
        ...computeObject0,
        bindingResources: {
            ...computeObject0.bindingResources,
            particlesA: {
                ...computeObject0.bindingResources.particlesA,
                buffer: particleBuffers[1],
            },
            particlesB: {
                ...computeObject0.bindingResources.particlesA,
                buffer: particleBuffers[0],
            },
        },
    };

    const renderPass: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },
                clearValue: [0.0, 0.0, 0.0, 1.0],
            }
        ],
    };

    const renderObject: IGPURenderObject = {
        pipeline: {
            vertex: { code: spriteWGSL }, fragment: { code: spriteWGSL },
            primitive: {
                cullMode: "back",
            },
        },
        vertices: {
            a_particlePos: { buffer: particleBuffers[0], offset: 0, vertexSize: 4 * 4, stepMode: "instance" },
            a_particleVel: { buffer: particleBuffers[0], offset: 2 * 4, vertexSize: 4 * 4, stepMode: "instance" },
            a_pos: { buffer: { data: vertexBufferData } },
        },
        draw: { vertexCount: 3, instanceCount: numParticles }
    };

    const renderObject1: IGPURenderObject = {
        ...renderObject,
        vertices: {
            ...renderObject.vertices,
            a_particlePos: {
                ...renderObject.vertices.a_particlePos,
                buffer: particleBuffers[1],
            },
            a_particleVel: {
                ...renderObject.vertices.a_particleVel,
                buffer: particleBuffers[1],
            },
        },
    };

    let t = 0;
    function frame()
    {
        const data: IGPUSubmit = {
            commandEncoders: [
                {
                    passEncoders: [
                        { computeObjects: [[computeObject0, computeObject1][t % 2]] },
                        { descriptor: renderPass, renderObjects: [[renderObject, renderObject1][(t + 1) % 2]] },
                    ]
                }
            ],
        };

        webgpu.submit(data);

        ++t;

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
