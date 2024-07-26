import { mat4, vec3 } from 'wgpu-matrix';

import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize } from '../../meshes/cube';
import instancedVertWGSL from '../../shaders/instanced.vert.wgsl';
import vertexPositionColorWGSL from '../../shaders/vertexPositionColor.frag.wgsl';

import { IBufferBinding, IRenderObject, IRenderPass, WebGPU } from 'webgpu-simplify';

const init = async (canvas: HTMLCanvasElement) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await WebGPU.init();

    const xCount = 4;
    const yCount = 4;
    const numInstances = xCount * yCount;
    const matrixFloatCount = 16; // 4x4 matrix

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = mat4.perspective(
        (2 * Math.PI) / 5,
        aspect,
        1,
        100.0
    );

    type Mat4 = mat4.default;
    const modelMatrices = new Array<Mat4>(numInstances);
    const mvpMatricesData = new Float32Array(matrixFloatCount * numInstances);

    const step = 4.0;

    // Initialize the matrix data for every instance.
    let m = 0;
    for (let x = 0; x < xCount; x++)
    {
        for (let y = 0; y < yCount; y++)
        {
            modelMatrices[m] = mat4.translation(
                vec3.fromValues(
                    step * (x - xCount / 2 + 0.5),
                    step * (y - yCount / 2 + 0.5),
                    0
                )
            );
            m++;
        }
    }

    const viewMatrix = mat4.translation(vec3.fromValues(0, 0, -12));

    const tmpMat4 = mat4.create();

    // Update the transformation matrix data for each instance.
    function updateTransformationMatrix()
    {
        const now = Date.now() / 1000;

        let m = 0;
        let i = 0;
        for (let x = 0; x < xCount; x++)
        {
            for (let y = 0; y < yCount; y++)
            {
                mat4.rotate(
                    modelMatrices[i],
                    vec3.fromValues(
                        Math.sin((x + 0.5) * now),
                        Math.cos((y + 0.5) * now),
                        0
                    ),
                    1,
                    tmpMat4
                );

                mat4.multiply(viewMatrix, tmpMat4, tmpMat4);
                mat4.multiply(projectionMatrix, tmpMat4, tmpMat4);

                mvpMatricesData.set(tmpMat4, m);

                i++;
                m += matrixFloatCount;
            }
        }
    }

    const renderPass: IRenderPass = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },
                clearValue: [0.5, 0.5, 0.5, 1.0],
            }
        ],
        depthStencilAttachment: {
            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    };

    const renderObject: IRenderObject = {
        pipeline: {
            vertex: { code: instancedVertWGSL }, fragment: { code: vertexPositionColorWGSL },
            primitive: {
                cullMode: 'back',
            },
        },
        vertices: {
            position: { buffer: { data: cubeVertexArray }, offset: cubePositionOffset, vertexSize: cubeVertexSize },
            uv: { buffer: { data: cubeVertexArray }, offset: cubeUVOffset, vertexSize: cubeVertexSize },
        },
        bindingResources: {
            uniforms: {
                map: { modelViewProjectionMatrix: null }
            },
        },
        draw: { vertexCount: cubeVertexCount, instanceCount: numInstances }
    };

    function frame()
    {
        // Update the matrix data.
        updateTransformationMatrix();

        (renderObject.bindingResources.uniforms as IBufferBinding).map.modelViewProjectionMatrix = new Float32Array(mvpMatricesData); // 使用 new Float32Array 是因为赋值不同的对象才会触发数据改变重新上传数据到GPU

        webgpu.renderPass(renderPass);
        webgpu.renderObject(renderObject);

        webgpu.submit();

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const webgpuCanvas = document.getElementById('webgpu') as HTMLCanvasElement;
init(webgpuCanvas);
