import { GUI } from 'dat.gui';

import { mat4, vec3 } from 'wgpu-matrix';

import fragmentWGSL from './fragment.wgsl';
import fragmentPrecisionErrorPassWGSL from './fragmentPrecisionErrorPass.wgsl';
import fragmentTextureQuadWGSL from './fragmentTextureQuad.wgsl';
import vertexWGSL from './vertex.wgsl';
import vertexDepthPrePassWGSL from './vertexDepthPrePass.wgsl';
import vertexPrecisionErrorPassWGSL from './vertexPrecisionErrorPass.wgsl';
import vertexTextureQuadWGSL from './vertexTextureQuad.wgsl';

import { IBindingResources, IBuffer, ICanvasContext, IRenderPass, IRenderPassEncoder, IRenderPipeline, ISubmit, ITexture, IVertexAttributes, WebGPU } from 'webgpu-simplify';

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
    [DepthBufferMode.Default]: 'less' as GPUCompareFunction,
    [DepthBufferMode.Reversed]: 'greater' as GPUCompareFunction,
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

    const context: ICanvasContext = { canvasId: canvas.id };

    const webgpu = await WebGPU.init();

    const verticesBuffer: IBuffer = {
        size: geometryVertexArray.byteLength,
        usage: GPUBufferUsage.VERTEX,
        data: geometryVertexArray,
    };

    const vertices: IVertexAttributes = {
        position: { buffer: verticesBuffer, offset: geometryPositionOffset, vertexSize: geometryVertexSize },
        color: { buffer: verticesBuffer, offset: geometryColorOffset, vertexSize: geometryVertexSize },
    };

    const depthBufferFormat = 'depth32float';

    // depthPrePass is used to render scene to the depth texture
    // this is not needed if you just want to use reversed z to render a scene
    const depthPrePassRenderPipelineDescriptorBase: IRenderPipeline = {
        vertex: {
            code: vertexDepthPrePassWGSL,
        },
        primitive: {
            cullMode: 'back',
        },
    };

    // we need the depthCompare to fit the depth buffer mode we are using.
    // this is the same for other passes
    const depthPrePassPipelines: IRenderPipeline[] = [];
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
    const precisionPassRenderPipelineDescriptorBase: IRenderPipeline = {
        vertex: {
            code: vertexPrecisionErrorPassWGSL,
        },
        fragment: {
            code: fragmentPrecisionErrorPassWGSL,
        },
        primitive: {
            cullMode: 'back',
        },
    };

    const precisionPassPipelines: IRenderPipeline[] = [];
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
    const colorPassRenderPipelineDescriptorBase: IRenderPipeline = {
        vertex: {
            code: vertexWGSL,
        },
        fragment: {
            code: fragmentWGSL,
        },
        primitive: {
            cullMode: 'back',
        },
    };

    //
    const colorPassPipelines: IRenderPipeline[] = [];
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
    const textureQuadPassPipline: IRenderPipeline = {
        vertex: {
            code: vertexTextureQuadWGSL,
        },
        fragment: {
            code: fragmentTextureQuadWGSL,
        },
    };

    const depthTexture: ITexture = {
        size: [canvas.width, canvas.height],
        format: depthBufferFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    };

    const defaultDepthTexture: ITexture = {
        size: [canvas.width, canvas.height],
        format: depthBufferFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    };

    const depthPrePassDescriptor: IRenderPass = {
        colorAttachments: [],
        depthStencilAttachment: {
            view: { texture: depthTexture },

            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    };

    // drawPassDescriptor and drawPassLoadDescriptor are used for drawing
    // the scene twice using different depth buffer mode on splitted viewport
    // of the same canvas
    // see the difference of the loadOp of the colorAttachments
    const drawPassDescriptor: IRenderPass = {
        colorAttachments: [
            {
                view: { texture: { context } },
                clearValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
            }
        ],
        depthStencilAttachment: {
            view: { texture: defaultDepthTexture },

            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    };

    const drawPassLoadDescriptor: IRenderPass = {
        colorAttachments: [
            {
                view: { texture: { context } },
                loadOp: 'load',
            },
        ],
        depthStencilAttachment: {
            view: { texture: defaultDepthTexture },

            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    };
    const drawPassDescriptors = [drawPassDescriptor, drawPassLoadDescriptor];

    const textureQuadPassDescriptor: IRenderPass = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },

                clearValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
            },
        ],
    };
    const textureQuadPassLoadDescriptor: IRenderPass = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },

                loadOp: 'load',
                storeOp: 'store',
            },
        ],
    };
    const textureQuadPassDescriptors1 = [
        textureQuadPassDescriptor,
        textureQuadPassLoadDescriptor,
    ];

    const depthTextureBindGroup: IBindingResources = {
        depthTexture: { texture: depthTexture },
    };

    const uniformBufferSize = numInstances * matrixStride;

    const uniformBuffer: IBuffer = {
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
    const cameraMatrixBuffer: IBuffer = {
        size: 4 * 16, // 4x4 matrix
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
    const cameraMatrixReversedDepthBuffer: IBuffer = {
        size: 4 * 16, // 4x4 matrix
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };

    const uniformBindGroups: IBindingResources[] = [
        {
            uniforms: {
                buffer: uniformBuffer,
            },
            camera: {
                buffer: cameraMatrixBuffer,
            },
        },
        {
            uniforms: {
                buffer: uniformBuffer,
            },
            camera: {
                buffer: cameraMatrixReversedDepthBuffer,
            },
        },
    ];

    type Mat4 = mat4.default;
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

    let bufferData = viewProjectionMatrix as Float32Array;
    cameraMatrixBuffer.writeBuffers = [{ data: bufferData }];
    bufferData = reversedRangeViewProjectionMatrix as Float32Array;
    cameraMatrixReversedDepthBuffer.writeBuffers = [{ data: bufferData }];

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
        mode: 'color',
    };
    gui.add(settings, 'mode', ['color', 'precision-error', 'depth-texture']);

    const colorPassEncoders: IRenderPassEncoder[] = [];

    for (const m of depthBufferModes)
    {
        colorPassEncoders.push({
            renderPass: {
                ...drawPassDescriptors[m],
                depthStencilAttachment: {
                    ...drawPassDescriptors[m].depthStencilAttachment,
                    depthClearValue: depthClearValues[m],
                }
            },
            renderObjects: [{
                pipeline: colorPassPipelines[m],
                bindingResources: { ...uniformBindGroups[m] },
                vertices,
                viewport: {
                    x: (canvas.width * m) / 2,
                    y: 0,
                    width: canvas.width / 2,
                    height: canvas.height,
                    minDepth: 0,
                    maxDepth: 1
                },
                draw: { vertexCount: geometryDrawCount, instanceCount: numInstances, firstVertex: 0, firstInstance: 0 },
            }]
        });
    }

    const precisionErrorPassEncoders: IRenderPassEncoder[] = [];
    for (const m of depthBufferModes)
    {
        precisionErrorPassEncoders.push({
            renderPass: {
                ...depthPrePassDescriptor,
                depthStencilAttachment: {
                    ...depthPrePassDescriptor.depthStencilAttachment,
                    depthClearValue: depthClearValues[m],
                }
            },
            renderObjects: [{
                pipeline: depthPrePassPipelines[m],
                bindingResources: { ...uniformBindGroups[m] },
                vertices,
                viewport: {
                    x: (canvas.width * m) / 2,
                    y: 0,
                    width: canvas.width / 2,
                    height: canvas.height,
                    minDepth: 0,
                    maxDepth: 1
                },
                draw: { vertexCount: geometryDrawCount, instanceCount: numInstances, firstVertex: 0, firstInstance: 0 },
            }]
        });
        precisionErrorPassEncoders.push({
            renderPass: {
                ...drawPassDescriptors[m],
                depthStencilAttachment: {
                    ...drawPassDescriptors[m].depthStencilAttachment,
                    depthClearValue: depthClearValues[m],
                }
            },
            renderObjects: [{
                pipeline: precisionPassPipelines[m],
                bindingResources: { ...uniformBindGroups[m], ...depthTextureBindGroup },
                vertices,
                viewport: {
                    x: (canvas.width * m) / 2,
                    y: 0,
                    width: canvas.width / 2,
                    height: canvas.height,
                    minDepth: 0,
                    maxDepth: 1
                },
                draw: { vertexCount: geometryDrawCount, instanceCount: numInstances, firstVertex: 0, firstInstance: 0 },
            }]
        });
    }

    const depthBufferPassEncoders: IRenderPassEncoder[] = [];
    for (const m of depthBufferModes)
    {
        depthBufferPassEncoders.push({
            renderPass: {
                ...depthPrePassDescriptor,
                depthStencilAttachment: {
                    ...depthPrePassDescriptor.depthStencilAttachment,
                    depthClearValue: depthClearValues[m],
                }
            },
            renderObjects: [{
                pipeline: depthPrePassPipelines[m],
                bindingResources: { ...uniformBindGroups[m] },
                vertices,
                viewport: {
                    x: (canvas.width * m) / 2,
                    y: 0,
                    width: canvas.width / 2,
                    height: canvas.height,
                    minDepth: 0,
                    maxDepth: 1
                },
                draw: { vertexCount: geometryDrawCount, instanceCount: numInstances, firstVertex: 0, firstInstance: 0 },
            }]
        });
        depthBufferPassEncoders.push({
            renderPass: textureQuadPassDescriptors1[m],
            renderObjects: [{
                pipeline: textureQuadPassPipline,
                bindingResources: { ...depthTextureBindGroup },
                viewport: {
                    x: (canvas.width * m) / 2,
                    y: 0,
                    width: canvas.width / 2,
                    height: canvas.height,
                    minDepth: 0,
                    maxDepth: 1
                },
                draw: { vertexCount: 6, instanceCount: 1, firstVertex: 0, firstInstance: 0 },
            }]
        });
    }

    function frame()
    {
        updateTransformationMatrix();

        const writeBuffers = uniformBuffer.writeBuffers || [];
        writeBuffers.push({ data: mvpMatricesData });
        uniformBuffer.writeBuffers = writeBuffers;

        let passEncoders: IRenderPassEncoder[];

        if (settings.mode === 'color')
        {
            passEncoders = colorPassEncoders;
        }
        else if (settings.mode === 'precision-error')
        {
            passEncoders = precisionErrorPassEncoders;
        }
        else
        {
            // depth texture quad
            passEncoders = depthBufferPassEncoders;
        }

        const submit: ISubmit = {
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
const webgpuCanvas = document.getElementById('webgpu') as HTMLCanvasElement;
init(webgpuCanvas, panel);
