import { mat4, vec3 } from "wgpu-matrix";

import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize } from "../../meshes/cube";

import { IBufferBinding, IGPUCanvasContext, ICopyTextureToTexture, IRenderObject, IRenderPass, ISampler, ITexture, WebGPU } from "webgpu-renderer";
import basicVertWGSL from "../../shaders/basic.vert.wgsl";
import sampleSelfWGSL from "./sampleSelf.frag.wgsl";

const init = async (canvas: HTMLCanvasElement) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    const webgpu = await WebGPU.init();

    // We will copy the frame's rendering results into this texture and
    // sample it on the next frame.
    const cubeTexture: ITexture = {
        size: [canvas.width, canvas.height],
        format: presentationFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    };

    // Create a sampler with linear filtering for smooth interpolation.
    const sampler: ISampler = {
        magFilter: "linear",
        minFilter: "linear",
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

    const context: IGPUCanvasContext = {
        canvasId: canvas.id,
        configuration: {
            usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT
        }
    };

    const renderPass: IRenderPass = {
        colorAttachments: [
            {
                view: { texture: { context } },
                clearValue: [0.5, 0.5, 0.5, 1.0],
            }
        ],
        depthStencilAttachment: {
            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };

    const renderObject: IRenderObject = {
        pipeline: {
            vertex: { code: basicVertWGSL }, fragment: { code: sampleSelfWGSL },
            primitive: {
                cullMode: "back",
            },
        },
        vertices: {
            position: { buffer: { data: cubeVertexArray }, offset: cubePositionOffset, vertexSize: cubeVertexSize },
            uv: { buffer: { data: cubeVertexArray }, offset: cubeUVOffset, vertexSize: cubeVertexSize },
        },
        bindingResources: {
            uniforms: {
                map: { modelViewProjectionMatrix: new Float32Array(16) }
            },
            mySampler: sampler,
            myTexture: { texture: cubeTexture },
        },
        draw: { vertexCount: cubeVertexCount },
    };

    const copyTextureToTexture: ICopyTextureToTexture = {
        source: { texture: { context } },
        destination: { texture: cubeTexture },
        copySize: [canvas.width, canvas.height],
    };

    function frame()
    {
        const transformationMatrix = getTransformationMatrix();

        (renderObject.bindingResources.uniforms as IBufferBinding).map.modelViewProjectionMatrix = new Float32Array(transformationMatrix); // 使用 new Float32Array 是因为赋值不同的对象才会触发数据改变重新上传数据到GPU

        webgpu.renderPass(renderPass);
        webgpu.renderObject(renderObject);
        webgpu.copyTextureToTexture(copyTextureToTexture);

        webgpu.submit();

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas);
