import { GUI } from "dat.gui";

import { Mat4, mat4, vec3 } from "wgpu-matrix";

import fragmentWGSL from "./fragment.wgsl";
import fragmentPrecisionErrorPassWGSL from "./fragmentPrecisionErrorPass.wgsl";
import fragmentTextureQuadWGSL from "./fragmentTextureQuad.wgsl";
import vertexWGSL from "./vertex.wgsl";
import vertexDepthPrePassWGSL from "./vertexDepthPrePass.wgsl";
import vertexPrecisionErrorPassWGSL from "./vertexPrecisionErrorPass.wgsl";
import vertexTextureQuadWGSL from "./vertexTextureQuad.wgsl";

import { IGPUBindingResources, IGPUCanvasContext, IGPURenderPass, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSubmit, IGPUTexture, IGPUVertexAttributes, WebGPU } from "@feng3d/webgpu";

// Two planes close to each other for depth precision test
const geometryVertexSize = 4 * 8; // Byte size of one geometry vertex.
const geometryPositionOffset = 0;
const geometryColorOffset = 4 * 4; // Byte offset of geometry vertex color attribute.
const geometryDrawCount = 6 * 2;

const d = 0.0001; // half distance between two planes
const o = 0.5; // half x offset to shift planes so they are only partially overlaping

// prettier-ignore
export const geometryVertexArray = new Float32Array([
    // float4 position, float4 color
    -1 - o, -1, d, 1, 1, 0, 0, 1,
    1 - o, -1, d, 1, 1, 0, 0, 1,
    -1 - o, 1, d, 1, 1, 0, 0, 1,
    1 - o, -1, d, 1, 1, 0, 0, 1,
    1 - o, 1, d, 1, 1, 0, 0, 1,
    -1 - o, 1, d, 1, 1, 0, 0, 1,

    -1 + o, -1, -d, 1, 0, 1, 0, 1,
    1 + o, -1, -d, 1, 0, 1, 0, 1,
    -1 + o, 1, -d, 1, 0, 1, 0, 1,
    1 + o, -1, -d, 1, 0, 1, 0, 1,
    1 + o, 1, -d, 1, 0, 1, 0, 1,
    -1 + o, 1, -d, 1, 0, 1, 0, 1,
]);

const xCount = 1;
const yCount = 5;
const numInstances = xCount * yCount;
const matrixFloatCount = 16; // 4x4 matrix
const matrixStride = 4 * matrixFloatCount; // 64;

const depthRangeRemapMatrix = mat4.identity();
depthRangeRemapMatrix[10] = -1;
depthRangeRemapMatrix[14] = 1;

enum DepthBufferMode
{
    Default = 0,
    Reversed,
}

const depthBufferModes: DepthBufferMode[] = [
    DepthBufferMode.Default,
    DepthBufferMode.Reversed,
];
const depthCompareFuncs = {
    [DepthBufferMode.Default]: "less" as GPUCompareFunction,
    [DepthBufferMode.Reversed]: "greater" as GPUCompareFunction,
};
const depthClearValues = {
    [DepthBufferMode.Default]: 1.0,
    [DepthBufferMode.Reversed]: 0.0,
};

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const context: IGPUCanvasContext = { canvasId: canvas.id };

    const webgpu = await new WebGPU().init();

    const vertices: IGPUVertexAttributes = {
        position: { data: geometryVertexArray, format: "float32x4", offset: geometryPositionOffset, arrayStride: geometryVertexSize },
        color: { data: geometryVertexArray, format: "float32x4", offset: geometryColorOffset, arrayStride: geometryVertexSize },
    };

    const depthBufferFormat = "depth32float";

    // depthPrePass is used to render scene to the depth texture
    // this is not needed if you just want to use reversed z to render a scene
    const depthPrePassRenderPipelineDescriptorBase: IGPURenderPipeline = {
        vertex: {
            code: vertexDepthPrePassWGSL,
        },
        primitive: {
            cullMode: "back",
        },
    };

    // we need the depthCompare to fit the depth buffer mode we are using.
    // this is the same for other passes
    const depthPrePassPipelines: IGPURenderPipeline[] = [];
    depthPrePassPipelines[DepthBufferMode.Default] = {
        ...depthPrePassRenderPipelineDescriptorBase,
        depthStencil: {
            ...depthPrePassRenderPipelineDescriptorBase.depthStencil,
            depthCompare: depthCompareFuncs[DepthBufferMode.Default],
        },
    };
    depthPrePassPipelines[DepthBufferMode.Reversed] = {
        ...depthPrePassRenderPipelineDescriptorBase,
        depthStencil: {
            ...depthPrePassRenderPipelineDescriptorBase.depthStencil,
            depthCompare: depthCompareFuncs[DepthBufferMode.Reversed],
        },
    };

    // precisionPass is to draw precision error as color of depth value stored in depth buffer
    // compared to that directly calcualated in the shader
    const precisionPassRenderPipelineDescriptorBase: IGPURenderPipeline = {
        vertex: {
            code: vertexPrecisionErrorPassWGSL,
        },
        fragment: {
            code: fragmentPrecisionErrorPassWGSL,
        },
        primitive: {
            cullMode: "back",
        },
    };

    const precisionPassPipelines: IGPURenderPipeline[] = [];
    precisionPassPipelines[DepthBufferMode.Default] = {
        ...precisionPassRenderPipelineDescriptorBase,
        depthStencil: {
            ...precisionPassRenderPipelineDescriptorBase.depthStencil,
            depthCompare: depthCompareFuncs[DepthBufferMode.Default],
        }
    };
    precisionPassPipelines[DepthBufferMode.Reversed] = {
        ...precisionPassRenderPipelineDescriptorBase,
        depthStencil: {
            ...precisionPassRenderPipelineDescriptorBase.depthStencil,
            depthCompare: depthCompareFuncs[DepthBufferMode.Reversed],
        }
    };

    // colorPass is the regular render pass to render the scene
    const colorPassRenderPipelineDescriptorBase: IGPURenderPipeline = {
        vertex: {
            code: vertexWGSL,
        },
        fragment: {
            code: fragmentWGSL,
        },
        primitive: {
            cullMode: "back",
        },
    };

    //
    const colorPassPipelines: IGPURenderPipeline[] = [];
    colorPassPipelines[DepthBufferMode.Default] = {
        ...colorPassRenderPipelineDescriptorBase,
        depthStencil: {
            ...colorPassRenderPipelineDescriptorBase.depthStencil,
            depthCompare: depthCompareFuncs[DepthBufferMode.Default],
        }
    };
    colorPassPipelines[DepthBufferMode.Reversed] = {
        ...colorPassRenderPipelineDescriptorBase,
        depthStencil: {
            ...colorPassRenderPipelineDescriptorBase.depthStencil,
            depthCompare: depthCompareFuncs[DepthBufferMode.Reversed],
        }
    };

    // textureQuadPass is draw a full screen quad of depth texture
    // to see the difference of depth value using reversed z compared to default depth buffer usage
    // 0.0 will be the furthest and 1.0 will be the closest
    const textureQuadPassPipline: IGPURenderPipeline = {
        vertex: {
            code: vertexTextureQuadWGSL,
        },
        fragment: {
            code: fragmentTextureQuadWGSL,
        },
    };

    const depthTexture: IGPUTexture = {
        size: [canvas.width, canvas.height],
        format: depthBufferFormat,
    };

    const defaultDepthTexture: IGPUTexture = {
        size: [canvas.width, canvas.height],
        format: depthBufferFormat,
    };

    const depthPrePassDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [],
        depthStencilAttachment: {
            view: { texture: depthTexture },

            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };

    // drawPassDescriptor and drawPassLoadDescriptor are used for drawing
    // the scene twice using different depth buffer mode on splitted viewport
    // of the same canvas
    // see the difference of the loadOp of the colorAttachments
    const drawPassDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context } },
                clearValue: [0.0, 0.0, 0.5, 1.0],
            }
        ],
        depthStencilAttachment: {
            view: { texture: defaultDepthTexture },

            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };

    const drawPassLoadDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context } },
                loadOp: "load",
            },
        ],
        depthStencilAttachment: {
            view: { texture: defaultDepthTexture },

            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };
    const drawPassDescriptors = [drawPassDescriptor, drawPassLoadDescriptor];

    const textureQuadPassDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },

                clearValue: [0.0, 0.0, 0.5, 1.0],
            },
        ],
    };
    const textureQuadPassLoadDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },

                loadOp: "load",
                storeOp: "store",
            },
        ],
    };
    const textureQuadPassDescriptors1 = [
        textureQuadPassDescriptor,
        textureQuadPassLoadDescriptor,
    ];

    const depthTextureBindGroup: IGPUBindingResources = {
        depthTexture: { texture: depthTexture },
    };

    const uniformBufferSize = numInstances * matrixStride;

    const uniformBuffer = new Float32Array(uniformBufferSize / 4);
    const cameraMatrixBuffer = new Float32Array(16);
    const cameraMatrixReversedDepthBuffer = new Float32Array(16);

    const uniforms = {
        modelMatrix: uniformBuffer,
    };

    const camera0 = {
        viewProjectionMatrix: cameraMatrixBuffer,
    };
    const camera1 = {
        viewProjectionMatrix: cameraMatrixReversedDepthBuffer,
    };

    const uniformBindGroups: IGPUBindingResources[] = [
        {
            uniforms,
            camera: camera0,
        },
        {
            uniforms,
            camera: camera1,
        },
    ];

    const modelMatrices = new Array<Mat4>(numInstances);
    const mvpMatricesData = new Float32Array(matrixFloatCount * numInstances);

    let m = 0;
    for (let x = 0; x < xCount; x++)
    {
        for (let y = 0; y < yCount; y++)
        {
            const z = -800 * m;
            const s = 1 + 50 * m;

            modelMatrices[m] = mat4.translation(
                vec3.fromValues(
                    x - xCount / 2 + 0.5,
                    (4.0 - 0.2 * z) * (y - yCount / 2 + 1.0),
                    z
                )
            );
            mat4.scale(modelMatrices[m], vec3.fromValues(s, s, s), modelMatrices[m]);

            m++;
        }
    }

    const viewMatrix = mat4.translation(vec3.fromValues(0, 0, -12));

    const aspect = (0.5 * canvas.width) / canvas.height;
    // wgpu-matrix perspective doesn't handle zFar === Infinity now.
    // https://github.com/greggman/wgpu-matrix/issues/9
    const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 5, 9999);

    const viewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);
    // to use 1/z we just multiple depthRangeRemapMatrix to our default camera view projection matrix
    const reversedRangeViewProjectionMatrix = mat4.multiply(
        depthRangeRemapMatrix,
        viewProjectionMatrix
    );

    camera0.viewProjectionMatrix = viewProjectionMatrix;
    camera1.viewProjectionMatrix = reversedRangeViewProjectionMatrix;

    const tmpMat4 = mat4.create();
    function updateTransformationMatrix()
    {
        const now = Date.now() / 1000;

        for (let i = 0, m = 0; i < numInstances; i++, m += matrixFloatCount)
        {
            mat4.rotate(
                modelMatrices[i],
                vec3.fromValues(Math.sin(now), Math.cos(now), 0),
                (Math.PI / 180) * 30,
                tmpMat4
            );
            mvpMatricesData.set(tmpMat4, m);
        }
    }

    const settings = {
        mode: "color",
    };
    gui.add(settings, "mode", ["color", "precision-error", "depth-texture"]);

    const colorPassEncoders: IGPURenderPass[] = [];

    for (const m of depthBufferModes)
    {
        colorPassEncoders.push({
            descriptor: {
                ...drawPassDescriptors[m],
                depthStencilAttachment: {
                    ...drawPassDescriptors[m].depthStencilAttachment,
                    depthClearValue: depthClearValues[m],
                }
            },
            renderObjects: [
                { __type: "Viewport", x: (canvas.width * m) / 2, y: 0, width: canvas.width / 2, height: canvas.height, minDepth: 0, maxDepth: 1 },
                {
                    pipeline: colorPassPipelines[m],
                    bindingResources: { ...uniformBindGroups[m] },
                    vertices,
                    drawVertex: { vertexCount: geometryDrawCount, instanceCount: numInstances, firstVertex: 0, firstInstance: 0 },
                }]
        });
    }

    const precisionErrorPassEncoders: IGPURenderPass[] = [];
    for (const m of depthBufferModes)
    {
        precisionErrorPassEncoders.push({
            descriptor: {
                ...depthPrePassDescriptor,
                depthStencilAttachment: {
                    ...depthPrePassDescriptor.depthStencilAttachment,
                    depthClearValue: depthClearValues[m],
                }
            },
            renderObjects: [
                {
                    __type: "Viewport",
                    x: (canvas.width * m) / 2,
                    y: 0,
                    width: canvas.width / 2,
                    height: canvas.height,
                    minDepth: 0,
                    maxDepth: 1
                },
                {
                    pipeline: depthPrePassPipelines[m],
                    bindingResources: { ...uniformBindGroups[m] },
                    vertices,
                    drawVertex: { vertexCount: geometryDrawCount, instanceCount: numInstances, firstVertex: 0, firstInstance: 0 },
                }]
        });
        precisionErrorPassEncoders.push({
            descriptor: {
                ...drawPassDescriptors[m],
                depthStencilAttachment: {
                    ...drawPassDescriptors[m].depthStencilAttachment,
                    depthClearValue: depthClearValues[m],
                }
            },
            renderObjects: [
                {
                    __type: "Viewport",
                    x: (canvas.width * m) / 2,
                    y: 0,
                    width: canvas.width / 2,
                    height: canvas.height,
                    minDepth: 0,
                    maxDepth: 1
                },
                {
                    pipeline: precisionPassPipelines[m],
                    bindingResources: { ...uniformBindGroups[m], ...depthTextureBindGroup },
                    vertices,
                    drawVertex: { vertexCount: geometryDrawCount, instanceCount: numInstances, firstVertex: 0, firstInstance: 0 },
                }]
        });
    }

    const depthBufferPassEncoders: IGPURenderPass[] = [];
    for (const m of depthBufferModes)
    {
        depthBufferPassEncoders.push({
            descriptor: {
                ...depthPrePassDescriptor,
                depthStencilAttachment: {
                    ...depthPrePassDescriptor.depthStencilAttachment,
                    depthClearValue: depthClearValues[m],
                }
            },
            renderObjects: [
                {
                    __type: "Viewport",
                    x: (canvas.width * m) / 2,
                    y: 0,
                    width: canvas.width / 2,
                    height: canvas.height,
                    minDepth: 0,
                    maxDepth: 1
                },
                {
                    pipeline: depthPrePassPipelines[m],
                    bindingResources: { ...uniformBindGroups[m] },
                    vertices,
                    drawVertex: { vertexCount: geometryDrawCount, instanceCount: numInstances, firstVertex: 0, firstInstance: 0 },
                }]
        });
        depthBufferPassEncoders.push({
            descriptor: textureQuadPassDescriptors1[m],
            renderObjects: [{
                __type: "Viewport",
                x: (canvas.width * m) / 2,
                y: 0,
                width: canvas.width / 2,
                height: canvas.height,
                minDepth: 0,
                maxDepth: 1
            },
            {
                pipeline: textureQuadPassPipline,
                bindingResources: { ...depthTextureBindGroup },
                drawVertex: { vertexCount: 6, instanceCount: 1, firstVertex: 0, firstInstance: 0 },
            }]
        });
    }

    function frame()
    {
        updateTransformationMatrix();

        uniforms.modelMatrix = mvpMatricesData.slice(0);

        let passEncoders: IGPURenderPass[];

        if (settings.mode === "color")
        {
            passEncoders = colorPassEncoders;
        }
        else if (settings.mode === "precision-error")
        {
            passEncoders = precisionErrorPassEncoders;
        }
        else
        {
            // depth texture quad
            passEncoders = depthBufferPassEncoders;
        }

        const submit: IGPUSubmit = {
            commandEncoders: [
                {
                    passEncoders,
                }
            ]
        };

        webgpu.submit(submit);

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
