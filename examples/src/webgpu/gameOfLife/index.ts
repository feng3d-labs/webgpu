import { GUI } from "dat.gui";

import computeWGSL from "./compute.wgsl";
import fragWGSL from "./frag.wgsl";
import vertWGSL from "./vert.wgsl";

import { IRenderPass, IRenderPassDescriptor, IRenderPipeline, ISubmit, IUniforms, IVertexAttributes } from "@feng3d/render-api";
import { IGPUComputePass, IGPUComputePipeline, WebGPU } from "@feng3d/webgpu";

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
    const verticesSquareBuffer: IVertexAttributes = {
        pos: { data: squareVertices, format: "uint32x2" }
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
    let verticesBuffer0: IVertexAttributes;
    let buffer1: Uint32Array;
    let verticesBuffer1: IVertexAttributes;
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
            cell: { data: buffer0, format: "uint32", stepMode: "instance" }
        };

        buffer1 = new Uint32Array(cells.byteLength);
        verticesBuffer1 = {
            cell: { data: buffer1, format: "uint32", stepMode: "instance" }
        };

        const bindGroup0:    IUniforms = {
            size: { bufferView: sizeBuffer },
            current: { bufferView: buffer0 },
            next: { bufferView: buffer1 },
        };

        const bindGroup1:    IUniforms = {
            size: { bufferView: sizeBuffer },
            current: { bufferView: buffer1 },
            next: { bufferView: buffer0 },
        };

        const renderPipeline: IRenderPipeline = {
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

        const uniformBindGroup:    IUniforms = {
            size: {
                bufferView: sizeBuffer,
                offset: 0,
                size: 2 * Uint32Array.BYTES_PER_ELEMENT,
            },
        };

        const renderPass: IRenderPassDescriptor = {
            colorAttachments: [
                {
                    view: { texture: { context: { canvasId: canvas.id } } },
                },
            ],
        };

        const passEncodersArray: (IGPUComputePass | IRenderPass)[][] = [];
        for (let i = 0; i < 2; i++)
        {
            const vertices1: IVertexAttributes = {};
            Object.assign(vertices1, i ? verticesBuffer1 : verticesBuffer0, verticesSquareBuffer);

            passEncodersArray[i] = [
                {
                    __type: "ComputePass",
                    computeObjects: [{
                        pipeline: computePipeline,
                        uniforms: i ? bindGroup1 : bindGroup0,
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
                            uniforms: uniformBindGroup,
                            geometry:{
                                vertices: vertices1,
                                draw: { __type: "DrawVertex", vertexCount: 4, instanceCount: length },
                            }
                        }
                    ],
                }
            ];
        }

        loopTimes = 0;
        render = () =>
        {
            const submit: ISubmit = {
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
