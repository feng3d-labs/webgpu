import { mat4, vec3 } from "wgpu-matrix";

import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize } from "../../meshes/cube";
import basicVertWGSL from "../../shaders/basic.vert.wgsl";
import vertexPositionColorWGSL from "../../shaders/vertexPositionColor.frag.wgsl";

import { IBufferBinding, IRenderObject, IRenderPass, WebGPU } from "webgpu-renderer";

const init = async (canvas: HTMLCanvasElement) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await WebGPU.init();

    const renderPass: IRenderPass = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },
                clearValue: [0.5, 0.5, 0.5, 1.0],
            }
        ],
        depthStencilAttachment: {
            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };

    const uniforms: IBufferBinding = {
        map: { modelViewProjectionMatrix: new Float32Array(16) }
    };

    const renderObject: IRenderObject = {
        pipeline: {
            vertex: { code: basicVertWGSL }, fragment: { code: vertexPositionColorWGSL },
            primitive: {
                cullMode: "back",
            },
        },
        vertices: {
            position: { buffer: { data: cubeVertexArray }, offset: cubePositionOffset, vertexSize: cubeVertexSize },
            uv: { buffer: { data: cubeVertexArray }, offset: cubeUVOffset, vertexSize: cubeVertexSize },
        },
        bindingResources: {
            uniforms,
        },
        draw: { vertexCount: cubeVertexCount },
    };

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = mat4.perspective(
        (2 * Math.PI) / 5,
        aspect,
        1,
        100.0
    );
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

        return modelViewProjectionMatrix as Float32Array;
    }

    function frame()
    {
        const transformationMatrix = getTransformationMatrix();

        uniforms.map.modelViewProjectionMatrix = new Float32Array(transformationMatrix); // 使用 new Float32Array 是因为赋值不同的对象才会触发数据改变重新上传数据到GPU

        webgpu.renderPass(renderPass);
        webgpu.renderObject(renderObject);

        webgpu.submit();

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas);
