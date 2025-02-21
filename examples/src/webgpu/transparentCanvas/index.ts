import { mat4, vec3 } from "wgpu-matrix";

import { IRenderPassDescriptor, IRenderPipeline, ITexture, IVertexAttributes } from "@feng3d/render-api";
import { IGPUCanvasContext, WebGPU } from "@feng3d/webgpu";

import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize } from "../../meshes/cube";

import basicVertWGSL from "../../shaders/basic.vert.wgsl";
import vertexPositionColorWGSL from "../../shaders/vertexPositionColor.frag.wgsl";

const init = async (canvas: HTMLCanvasElement) =>
{
    const webgpu = await new WebGPU().init();

    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const context: IGPUCanvasContext = {
        canvasId: canvas.id,
        configuration: {
            // The canvas alphaMode defaults to 'opaque', use 'premultiplied' for transparency.
            alphaMode: "premultiplied",
        },
    };

    // Create a vertex buffer from the cube data.
    const verticesBuffer: IVertexAttributes = {
        position: { data: cubeVertexArray, format: "float32x4", offset: cubePositionOffset, arrayStride: cubeVertexSize },
        uv: { data: cubeVertexArray, format: "float32x2", offset: cubeUVOffset, arrayStride: cubeVertexSize },
    };

    const pipeline: IRenderPipeline = {
        vertex: {
            code: basicVertWGSL,
        },
        fragment: {
            code: vertexPositionColorWGSL,
        },
        primitive: {
            topology: "triangle-list",
            cullFace: "back",
        },

        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
        },
    };

    const depthTexture: ITexture = {
        size: [canvas.width, canvas.height],
        format: "depth24plus",
    };

    const uniformBindGroup = {
        uniforms: { modelViewProjectionMatrix: undefined }
    };

    const renderPassDescriptor: IRenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context } }, // Assigned later

                clearValue: [0, 0, 0, 0], // Clear alpha to 0
                loadOp: "clear",
                storeOp: "store",
            },
        ],
        depthStencilAttachment: {
            view: { texture: depthTexture },

            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
    const modelViewProjectionMatrix = mat4.create();

    function getTransformationMatrix()
    {
        const viewMatrix = mat4.identity();
        mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
        const now = Date.now() / 1000;
        mat4.rotate(
            viewMatrix,
            vec3.fromValues(Math.sin(now), Math.cos(now), 0),
            1,
            viewMatrix
        );

        mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

        return modelViewProjectionMatrix;
    }

    function frame()
    {
        uniformBindGroup.uniforms.modelViewProjectionMatrix = getTransformationMatrix().slice();

        webgpu.submit({
            commandEncoders: [{
                passEncoders: [{
                    descriptor: renderPassDescriptor,
                    renderObjects: [{
                        pipeline,
                        uniforms: uniformBindGroup,
                        vertices: verticesBuffer,
                        draw: { __type: "DrawVertex", vertexCount: cubeVertexCount },
                    }]
                }]
            }]
        });

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas);
