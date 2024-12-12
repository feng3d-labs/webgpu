import { GUI } from "dat.gui";

import spriteWGSL from "./sprite.wgsl";
import updateSpritesWGSL from "./updateSprites.wgsl";

import { IRenderPassDescriptor, ISubmit } from "@feng3d/render-api";
import { IGPUComputeObject, IGPURenderObject, WebGPU } from "@feng3d/webgpu";

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

    const particleBuffers: Float32Array[] = new Array(2);
    for (let i = 0; i < 2; ++i)
    {
        particleBuffers[i] = initialParticleData.slice();
    }

    const computeObject0: IGPUComputeObject = {
        pipeline: {
            compute: { code: updateSpritesWGSL }
        },
        bindingResources: {
            params: simParams,
            particlesA: {
                bufferView: particleBuffers[0],
            },
            particlesB: {
                bufferView: particleBuffers[1],
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
                bufferView: particleBuffers[1],
            },
            particlesB: {
                ...computeObject0.bindingResources.particlesA,
                bufferView: particleBuffers[0],
            },
        },
    };

    const renderPass: IRenderPassDescriptor = {
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
            a_particlePos: { data: particleBuffers[0], format: "float32x2", offset: 0, arrayStride: 4 * 4, stepMode: "instance" },
            a_particleVel: { data: particleBuffers[0], format: "float32x2", offset: 2 * 4, arrayStride: 4 * 4, stepMode: "instance" },
            a_pos: { data: vertexBufferData, format: "float32x2" },
        },
        drawVertex: { vertexCount: 3, instanceCount: numParticles }
    };

    const renderObject1: IGPURenderObject = {
        ...renderObject,
        vertices: {
            ...renderObject.vertices,
            a_particlePos: {
                ...renderObject.vertices.a_particlePos,
                data: particleBuffers[1],
            },
            a_particleVel: {
                ...renderObject.vertices.a_particleVel,
                data: particleBuffers[1],
            },
        },
    };

    let t = 0;
    function frame()
    {
        const data: ISubmit = {
            commandEncoders: [
                {
                    passEncoders: [
                        { __type: "ComputePass", computeObjects: [[computeObject0, computeObject1][t % 2]] },
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
