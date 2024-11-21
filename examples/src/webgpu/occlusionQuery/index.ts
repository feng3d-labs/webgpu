import { GUI } from 'dat.gui';
import { mat4 } from 'wgpu-matrix';
import solidColorLitWGSL from './solidColorLit.wgsl';

import { IGPUBuffer, IGPUBufferBinding, IGPURenderObject, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSubmit, WebGPU } from "@feng3d/webgpu-renderer";

type TypedArrayView =
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;

export type TypedArrayConstructor =
    | Int8ArrayConstructor
    | Uint8ArrayConstructor
    | Int16ArrayConstructor
    | Uint16ArrayConstructor
    | Int32ArrayConstructor
    | Uint32ArrayConstructor
    | Float32ArrayConstructor
    | Float64ArrayConstructor;

const info = document.querySelector('#info');

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    const settings = {
        animate: true,
    };
    gui.add(settings, 'animate');

    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await new WebGPU().init();

    const pipeline: IGPURenderPipeline = {
        vertex: {
            code: solidColorLitWGSL,
        },
        fragment: {
            code: solidColorLitWGSL,
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'back',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
        },
    };

    // prettier-ignore
    const cubePositions = [
        { position: [-1, 0, 0], id: '🟥', color: [1, 0, 0, 1] },
        { position: [1, 0, 0], id: '🟨', color: [1, 1, 0, 1] },
        { position: [0, -1, 0], id: '🟩', color: [0, 0.5, 0, 1] },
        { position: [0, 1, 0], id: '🟧', color: [1, 0.6, 0, 1] },
        { position: [0, 0, -1], id: '🟦', color: [0, 0, 1, 1] },
        { position: [0, 0, 1], id: '🟪', color: [0.5, 0, 0.5, 1] },
    ];

    const objectInfos = cubePositions.map(({ position, id, color }) =>
    {
        const uniformBufferSize = (2 * 16 + 3 + 1 + 4) * 4;
        const uniformBuffer: IGPUBuffer = {
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: "uniformBuffer " + id,
        };
        const uniformValues = new Float32Array(uniformBufferSize / 4);
        const worldViewProjection = uniformValues.subarray(0, 16);
        const worldInverseTranspose = uniformValues.subarray(16, 32);
        const colorValue = uniformValues.subarray(32, 36);

        colorValue.set(color);

        return {
            id,
            position: position.map((v) => v * 10),
            uniformBuffer,
            uniformValues,
            worldInverseTranspose,
            worldViewProjection,
        };
    });

    // const querySet = device.createQuerySet({
    //     type: 'occlusion',
    //     count: objectInfos.length,
    // });

    // const resolveBuf: IGPUBuffer = {
    //     label: 'resolveBuffer',
    //     // Query results are 64bit unsigned integers.
    //     size: objectInfos.length * BigUint64Array.BYTES_PER_ELEMENT,
    //     usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    // };

    // const resultBuf: IGPUBuffer = {
    //     label: 'resultBuffer',
    //     size: resolveBuf.size,
    //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    // };

    // prettier-ignore
    const vertexData = new Float32Array([
        // position             normal
        1, 1, -1, 1, 0, 0,
        1, 1, 1, 1, 0, 0,
        1, -1, 1, 1, 0, 0,
        1, -1, -1, 1, 0, 0,
        -1, 1, 1, -1, 0, 0,
        -1, 1, -1, -1, 0, 0,
        -1, -1, -1, -1, 0, 0,
        -1, -1, 1, -1, 0, 0,
        -1, 1, 1, 0, 1, 0,
        1, 1, 1, 0, 1, 0,
        1, 1, -1, 0, 1, 0,
        -1, 1, -1, 0, 1, 0,
        -1, -1, -1, 0, -1, 0,
        1, -1, -1, 0, -1, 0,
        1, -1, 1, 0, -1, 0,
        -1, -1, 1, 0, -1, 0,
        1, 1, 1, 0, 0, 1,
        -1, 1, 1, 0, 0, 1,
        -1, -1, 1, 0, 0, 1,
        1, -1, 1, 0, 0, 1,
        -1, 1, -1, 0, 0, -1,
        1, 1, -1, 0, 0, -1,
        1, -1, -1, 0, 0, -1,
        -1, -1, -1, 0, 0, -1,
    ]);
    // prettier-ignore
    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3, // +x face
        4, 5, 6, 4, 6, 7, // -x face
        8, 9, 10, 8, 10, 11, // +y face
        12, 13, 14, 12, 14, 15, // -y face
        16, 17, 18, 16, 18, 19, // +z face
        20, 21, 22, 20, 22, 23, // -z face
    ]);

    const vertexBuf: IGPUBuffer = {
        data: vertexData,
        usage: GPUBufferUsage.VERTEX,
        label: 'vertexBuffer'
    };
    const indicesBuf: IGPUBuffer = {
        data: indices,
        usage: GPUBufferUsage.INDEX,
        label: 'indexBuffer'
    };

    const renderPassDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },
                clearValue: [0.5, 0.5, 0.5, 1.0],
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
        depthStencilAttachment: {
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
        // occlusionQuerySet: querySet,
    };

    const renderObject: IGPURenderObject = {
        pipeline: pipeline,
        vertices: {
            position: { buffer: vertexBuf, offset: 0, vertexSize: 6 * 4, numComponents: 3 },
            normal: { buffer: vertexBuf, offset: 12, vertexSize: 6 * 4 },
        },
        index: { buffer: indicesBuf, indexFormat: "uint16" },
        bindingResources: {
            uni: {
                buffer: undefined,
            },
        },
        drawIndexed: { indexCount: indices.length },
    };

    const renderObjects: IGPURenderObject[] = objectInfos.map((v) =>
    {
        const ro: IGPURenderObject = {
            ...renderObject,
            bindingResources: {
                uni: {
                    buffer: v.uniformBuffer,
                },
            },
        };

        return ro;
    });

    const submit: IGPUSubmit = {
        commandEncoders: [
            {
                passEncoders: [
                    {
                        descriptor: renderPassDescriptor,
                        renderObjects: renderObjects,
                    }
                ]
            }
        ]
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const lerpV = (a: number[], b: number[], t: number) =>
        a.map((v, i) => lerp(v, b[i], t));
    const pingPongSine = (t: number) => Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

    let time = 0;
    let then = 0;
    function render(now: number)
    {
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        if (settings.animate)
        {
            time += deltaTime;
        }

        const projection = mat4.perspective(
            (30 * Math.PI) / 180,
            canvas.clientWidth / canvas.clientHeight,
            0.5,
            100
        );

        const m = mat4.identity();
        mat4.rotateX(m, time, m);
        mat4.rotateY(m, time * 0.7, m);
        mat4.translate(m, lerpV([0, 0, 5], [0, 0, 40], pingPongSine(time * 0.2)), m);
        const view = mat4.inverse(m);
        const viewProjection = mat4.multiply(projection, view);

        objectInfos.forEach(
            (
                {
                    uniformBuffer,
                    uniformValues,
                    worldViewProjection,
                    worldInverseTranspose,
                    position,
                },
                i
            ) =>
            {
                const world = mat4.translation(position);
                mat4.transpose(mat4.inverse(world), worldInverseTranspose);
                mat4.multiply(viewProjection, world, worldViewProjection);

                const buffer = (renderObjects[i].bindingResources.uni as IGPUBufferBinding).buffer;
                buffer.data = new Float32Array(uniformValues);

                // device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

                // pass.setBindGroup(0, bindGroup);
                // pass.beginOcclusionQuery(i);
                // pass.drawIndexed(indices.length);
                // pass.endOcclusionQuery();
            }
        );

        webgpu.submit(submit);

        // pass.end();
        // encoder.resolveQuerySet(querySet, 0, objectInfos.length, resolveBuf, 0);
        // if (resultBuf.mapState === 'unmapped')
        // {
        //     encoder.copyBufferToBuffer(resolveBuf, 0, resultBuf, 0, resultBuf.size);
        // }

        // device.queue.submit([encoder.finish()]);

        // if (resultBuf.mapState === 'unmapped')
        // {
        //     resultBuf.mapAsync(GPUMapMode.READ).then(() =>
        //     {
        //         const results = new BigUint64Array(resultBuf.getMappedRange());

        //         const visible = objectInfos
        //             .filter((_, i) => results[i])
        //             .map(({ id }) => id)
        //             .join('');
        //         info.textContent = `visible: ${visible}`;

        //         resultBuf.unmap();
        //     });
        // }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
