import { mat4, vec3 } from "wgpu-matrix";

import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize } from "../../meshes/cube";

import basicVertWGSL from "../../shaders/basic.vert.wgsl";
import vertexPositionColorWGSL from "../../shaders/vertexPositionColor.frag.wgsl";

import { IGPUBuffer, IGPUBufferBinding, IGPURenderObject, IGPURenderPassDescriptor, IGPUSubmit, WebGPU } from "@feng3d/webgpu-renderer";

const init = async (canvas: HTMLCanvasElement) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await new WebGPU().init();

    const renderPassDescriptor: IGPURenderPassDescriptor = {
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

    const matrixSize = 4 * 16; // 4x4 matrix
    const offset = 256; // uniformBindGroup offset must be 256-byte aligned
    const uniformBufferSize = offset + matrixSize;

    const uniformBuffer = new ArrayBuffer(uniformBufferSize);

    const uniforms: IGPUBufferBinding = {
        bufferView: new Uint8Array(uniformBuffer, 0, matrixSize),
        modelViewProjectionMatrix: null, // 在帧循环中设置
    };

    const renderObject: IGPURenderObject = {
        pipeline: {
            vertex: { code: basicVertWGSL }, fragment: { code: vertexPositionColorWGSL },
            primitive: {
                cullMode: "back",
            },
        },
        vertices: {
            position: { data: cubeVertexArray, offset: cubePositionOffset, vertexSize: cubeVertexSize },
            uv: { data: cubeVertexArray, offset: cubeUVOffset, vertexSize: cubeVertexSize },
        },
        bindingResources: {
            uniforms,
        },
        draw: { vertexCount: cubeVertexCount },
    };

    const uniforms1: IGPUBufferBinding = {
        bufferView: new Uint8Array(uniformBuffer, offset, matrixSize),
        modelViewProjectionMatrix: null, // 在帧循环中设置
    };

    const renderObject1: IGPURenderObject = {
        ...renderObject,
        bindingResources: {
            uniforms: uniforms1,
        },
    };

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = mat4.perspective(
        (2 * Math.PI) / 5,
        aspect,
        1,
        100.0
    );

    const modelMatrix1 = mat4.translation(vec3.create(-2, 0, 0));
    const modelMatrix2 = mat4.translation(vec3.create(2, 0, 0));
    const modelViewProjectionMatrix1 = mat4.create() as Float32Array;
    const modelViewProjectionMatrix2 = mat4.create() as Float32Array;
    const viewMatrix = mat4.translation(vec3.fromValues(0, 0, -7));

    const tmpMat41 = mat4.create();
    const tmpMat42 = mat4.create();

    function updateTransformationMatrix()
    {
        const now = Date.now() / 1000;

        mat4.rotate(
            modelMatrix1,
            vec3.fromValues(Math.sin(now), Math.cos(now), 0),
            1,
            tmpMat41
        );
        mat4.rotate(
            modelMatrix2,
            vec3.fromValues(Math.cos(now), Math.sin(now), 0),
            1,
            tmpMat42
        );

        mat4.multiply(viewMatrix, tmpMat41, modelViewProjectionMatrix1);
        mat4.multiply(
            projectionMatrix,
            modelViewProjectionMatrix1,
            modelViewProjectionMatrix1
        );
        mat4.multiply(viewMatrix, tmpMat42, modelViewProjectionMatrix2);
        mat4.multiply(
            projectionMatrix,
            modelViewProjectionMatrix2,
            modelViewProjectionMatrix2
        );
    }

    function frame()
    {
        updateTransformationMatrix();

        uniforms.modelViewProjectionMatrix = new Float32Array(modelViewProjectionMatrix1); // 需要赋值新对象才能触发数据变更上传GPU
        uniforms1.modelViewProjectionMatrix = new Float32Array(modelViewProjectionMatrix2); // 需要赋值新对象才能触发数据变更上传GPU

        const data: IGPUSubmit = {
            commandEncoders: [
                {
                    passEncoders: [
                        { descriptor: renderPassDescriptor, renderObjects: [renderObject, renderObject1] },
                    ]
                }
            ],
        };

        webgpu.submit(data);

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas);
