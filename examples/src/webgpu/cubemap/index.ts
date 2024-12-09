import { mat4, vec3 } from "wgpu-matrix";

import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize } from "../../meshes/cube";
import basicVertWGSL from "../../shaders/basic.vert.wgsl";
import sampleCubemapWGSL from "./sampleCubemap.frag.wgsl";

import { IGPUBufferBinding, IGPUTextureImageSource, IGPURenderObject, IGPURenderPassDescriptor, IGPUSampler, IGPUSubmit, IGPUTexture, WebGPU } from "@feng3d/webgpu";

const init = async (canvas: HTMLCanvasElement) =>
{
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await new WebGPU().init();

    // Fetch the 6 separate images for negative/positive x, y, z axis of a cubemap
    // and upload it into a GPUTexture.
    let cubemapTexture: IGPUTexture;
    {
        // The order of the array layers is [+X, -X, +Y, -Y, +Z, -Z]
        const imgSrcs = [
            new URL(
                `../../../assets/img/cubemap/posx.jpg`,
                import.meta.url
            ).toString(),
            new URL(
                `../../../assets/img/cubemap/negx.jpg`,
                import.meta.url
            ).toString(),
            new URL(
                `../../../assets/img/cubemap/posy.jpg`,
                import.meta.url
            ).toString(),
            new URL(
                `../../../assets/img/cubemap/negy.jpg`,
                import.meta.url
            ).toString(),
            new URL(
                `../../../assets/img/cubemap/posz.jpg`,
                import.meta.url
            ).toString(),
            new URL(
                `../../../assets/img/cubemap/negz.jpg`,
                import.meta.url
            ).toString(),
        ];
        const promises = imgSrcs.map((src) =>
        {
            const img = document.createElement("img");
            img.src = src;

            return img.decode().then(() => createImageBitmap(img));
        });
        const imageBitmaps = await Promise.all(promises);
        const textureSource = imageBitmaps.map((v, i) =>
        {
            const item: IGPUTextureImageSource = {
                source: { source: v }, destination: { origin: { x: 0, y: 0, z: i } }, copySize: [v.width, v.height]
            };

            return item;
        });

        cubemapTexture = {
            dimension: "2d",
            size: [imageBitmaps[0].width, imageBitmaps[0].height, 6],
            format: "rgba8unorm",
            source: textureSource,
        };
    }

    const sampler: IGPUSampler = {
        magFilter: "linear",
        minFilter: "linear",
    };

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 3000);

    const modelMatrix = mat4.scaling(vec3.fromValues(1000, 1000, 1000));
    const modelViewProjectionMatrix = mat4.create() as Float32Array;
    const viewMatrix = mat4.identity();

    const tmpMat4 = mat4.create();

    // Comppute camera movement:
    // It rotates around Y axis with a slight pitch movement.
    function updateTransformationMatrix()
    {
        const now = Date.now() / 800;

        mat4.rotate(
            viewMatrix,
            vec3.fromValues(1, 0, 0),
            (Math.PI / 10) * Math.sin(now),
            tmpMat4
        );
        mat4.rotate(tmpMat4, vec3.fromValues(0, 1, 0), now * 0.2, tmpMat4);

        mat4.multiply(tmpMat4, modelMatrix, modelViewProjectionMatrix);
        mat4.multiply(
            projectionMatrix,
            modelViewProjectionMatrix,
            modelViewProjectionMatrix
        );
    }

    const renderPass: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },
            }
        ],
        depthStencilAttachment: {
            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };

    const renderObject: IGPURenderObject = {
        pipeline: {
            vertex: { code: basicVertWGSL }, fragment: { code: sampleCubemapWGSL },
            primitive: {
                cullMode: "none",
            },
        },
        vertices: {
            position: { data: cubeVertexArray, format: "float32x4", offset: cubePositionOffset, arrayStride: cubeVertexSize },
            uv: { data: cubeVertexArray, format: "float32x2", offset: cubeUVOffset, arrayStride: cubeVertexSize },
        },
        bindingResources: {
            uniforms: {
                modelViewProjectionMatrix: new Float32Array(16)
            },
            mySampler: sampler,
            myTexture: { texture: cubemapTexture, dimension: "cube" },
        },
        drawVertex: { vertexCount: cubeVertexCount },
    };

    function frame()
    {
        updateTransformationMatrix();

        (renderObject.bindingResources.uniforms as IGPUBufferBinding).modelViewProjectionMatrix = new Float32Array(modelViewProjectionMatrix); // 使用 new Float32Array 是因为赋值不同的对象才会触发数据改变重新上传数据到GPU

        const data: IGPUSubmit = {
            commandEncoders: [
                {
                    passEncoders: [
                        { descriptor: renderPass, renderObjects: [renderObject] },
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
