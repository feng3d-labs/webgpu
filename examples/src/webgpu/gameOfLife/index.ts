import { GUI } from "dat.gui";

import computeWGSL from "./compute.wgsl";
import fragWGSL from "./frag.wgsl";
import vertWGSL from "./vert.wgsl";

import { getIGPUBuffer, IGPUBindingResources, IGPUBuffer, IGPUComputePass, IGPUComputePipeline, IGPURenderPass, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSubmit, IGPUVertexAttributes, WebGPU } from "@feng3d/webgpu-renderer";

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
        pos: { data: squareVertices }
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
    let buffer0: Uint32Array;
    let verticesBuffer0: IGPUVertexAttributes;
    let buffer1: Uint32Array;
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
        const sizeBuffer = new Uint32Array([GameOptions.width, GameOptions.height]);
        const length = GameOptions.width * GameOptions.height;
        const cells = new Uint32Array(length);
        for (let i = 0; i < length; i++)
        {
            cells[i] = Math.random() < 0.25 ? 1 : 0;
        }

        buffer0 = cells;

        verticesBuffer0 = {
            cell: { data: buffer0, stepMode: "instance" }
        };

        buffer1 = new Uint32Array(cells.byteLength);
        verticesBuffer1 = {
            cell: { data: buffer1, stepMode: "instance" }
        };

        const bindGroup0: IGPUBindingResources = {
            size: { bufferView: sizeBuffer },
            current: { bufferView: buffer0 },
            next: { bufferView: buffer1 },
        };

        const bindGroup1: IGPUBindingResources = {
            size: { bufferView: sizeBuffer },
            current: { bufferView: buffer1 },
            next: { bufferView: buffer0 },
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
                bufferView: sizeBuffer,
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

        const passEncodersArray: (IGPUComputePass | IGPURenderPass)[][] = [];
        for (let i = 0; i < 2; i++)
        {
            const vertices1: IGPUVertexAttributes = {};
            Object.assign(vertices1, i ? verticesBuffer1 : verticesBuffer0, verticesSquareBuffer);

            passEncodersArray[i] = [
                {
                    __type: "IGPUComputePass",
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
