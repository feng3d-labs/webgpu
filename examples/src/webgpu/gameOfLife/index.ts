import { GUI } from "dat.gui";

import computeWGSL from "./compute.wgsl";
import fragWGSL from "./frag.wgsl";
import vertWGSL from "./vert.wgsl";

import { IGPUBindingResources, IGPUBuffer, IGPUComputePassEncoder, IGPUComputePipeline, IGPURenderPassDescriptor, IGPURenderPass, IGPURenderPipeline, IGPUSubmit, IGPUVertexAttributes, WebGPU } from "@feng3d/webgpu-renderer";

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await new WebGPU().init();

    const GameOptions = {
        width: 128,
        height: 128,
        timestep: 4,
        workgroupSize: 8,
    };

    const squareVertices = new Uint32Array([0, 0, 0, 1, 1, 0, 1, 1]);
    const verticesSquareBuffer: IGPUVertexAttributes = {
        pos: { buffer: { data: squareVertices } }
    };

    function addGUI()
    {
        gui.add(GameOptions, "timestep", 1, 60, 1);
        gui.add(GameOptions, "width", 16, 1024, 16).onFinishChange(resetGameData);
        gui.add(GameOptions, "height", 16, 1024, 16).onFinishChange(resetGameData);
        gui
            .add(GameOptions, "workgroupSize", [4, 8, 16])
            .onFinishChange(resetGameData);
    }

    let wholeTime = 0;
    let loopTimes = 0;
    let buffer0: IGPUBuffer;
    let verticesBuffer0: IGPUVertexAttributes;
    let buffer1: IGPUBuffer;
    let verticesBuffer1: IGPUVertexAttributes;
    let render: () => void;
    function resetGameData()
    {
        // compute pipeline
        const computePipeline: IGPUComputePipeline = {
            compute: {
                code: computeWGSL,
                constants: {
                    blockSize: GameOptions.workgroupSize,
                },
            },
        };
        const sizeBuffer: IGPUBuffer = {
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
            data: new Uint32Array([GameOptions.width, GameOptions.height]),
        };
        const length = GameOptions.width * GameOptions.height;
        const cells = new Uint32Array(length);
        for (let i = 0; i < length; i++)
        {
            cells[i] = Math.random() < 0.25 ? 1 : 0;
        }

        buffer0 = {
            size: cells.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
            data: cells,
        };

        verticesBuffer0 = {
            cell: { buffer: buffer0, stepMode: "instance" }
        };

        buffer1 = {
            size: cells.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
        };
        verticesBuffer1 = {
            cell: { buffer: buffer1, stepMode: "instance" }
        };

        const bindGroup0: IGPUBindingResources = {
            size: { buffer: sizeBuffer },
            current: { buffer: buffer0 },
            next: { buffer: buffer1 },
        };

        const bindGroup1: IGPUBindingResources = {
            size: { buffer: sizeBuffer },
            current: { buffer: buffer1 },
            next: { buffer: buffer0 },
        };

        const renderPipeline: IGPURenderPipeline = {
            primitive: {
                topology: "triangle-strip",
            },
            vertex: {
                code: vertWGSL,
            },
            fragment: {
                code: fragWGSL,
            },
        };

        const uniformBindGroup: IGPUBindingResources = {
            size: {
                buffer: sizeBuffer,
                offset: 0,
                size: 2 * Uint32Array.BYTES_PER_ELEMENT,
            },
        };

        const renderPass: IGPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: { texture: { context: { canvasId: canvas.id } } },
                },
            ],
        };

        const passEncodersArray: (IGPUComputePassEncoder | IGPURenderPass)[][] = [];
        for (let i = 0; i < 2; i++)
        {
            const vertices1: IGPUVertexAttributes = {};
            Object.assign(vertices1, i ? verticesBuffer1 : verticesBuffer0, verticesSquareBuffer);

            passEncodersArray[i] = [
                {
                    computeObjects: [{
                        pipeline: computePipeline,
                        bindingResources: i ? bindGroup1 : bindGroup0,
                        workgroups: {
                            workgroupCountX: GameOptions.width / GameOptions.workgroupSize,
                            workgroupCountY: GameOptions.height / GameOptions.workgroupSize
                        },
                    }]
                },
                {
                    descriptor: renderPass,
                    renderObjects: [
                        {
                            pipeline: renderPipeline,
                            bindingResources: uniformBindGroup,
                            vertices: vertices1,
                            draw: { vertexCount: 4, instanceCount: length },
                        }
                    ],
                }
            ];
        }

        loopTimes = 0;
        render = () =>
        {
            const submit: IGPUSubmit = {
                commandEncoders: [
                    {
                        passEncoders: passEncodersArray[loopTimes],
                    }
                ]
            };

            webgpu.submit(submit);
        };
    }

    addGUI();
    resetGameData();

    (function loop()
    {
        if (GameOptions.timestep)
        {
            wholeTime++;
            if (wholeTime >= GameOptions.timestep)
            {
                render();
                wholeTime -= GameOptions.timestep;
                loopTimes = 1 - loopTimes;
            }
        }

        requestAnimationFrame(loop);
    })();
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
