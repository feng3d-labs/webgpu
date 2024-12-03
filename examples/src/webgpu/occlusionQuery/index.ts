import { GUI } from "dat.gui";
import { mat4 } from "wgpu-matrix";
import solidColorLitWGSL from "./solidColorLit.wgsl";

import { watcher } from "@feng3d/watcher";
import { getIGPUBuffer, IGPUBufferBinding, IGPUOcclusionQuery, IGPURenderObject, IGPURenderPass, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSubmit, WebGPU } from "@feng3d/webgpu";

const info = document.querySelector("#info");

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    const settings = {
        animate: true,
    };
    gui.add(settings, "animate");

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
            topology: "triangle-list",
            cullMode: "back",
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
        },
    };

    // prettier-ignore
    const cubePositions = [
        { position: [-1, 0, 0], id: "🟥", color: [1, 0, 0, 1] },
        { position: [1, 0, 0], id: "🟨", color: [1, 1, 0, 1] },
        { position: [0, -1, 0], id: "🟩", color: [0, 0.5, 0, 1] },
        { position: [0, 1, 0], id: "🟧", color: [1, 0.6, 0, 1] },
        { position: [0, 0, -1], id: "🟦", color: [0, 0, 1, 1] },
        { position: [0, 0, 1], id: "🟪", color: [0.5, 0, 0.5, 1] },
    ];

    const objectInfos = cubePositions.map(({ position, id, color }) =>
    {
        const uniformBufferSize = (2 * 16 + 3 + 1 + 4) * 4;
        const uniformBuffer = new Uint8Array(uniformBufferSize);
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

    const vertexBuf = vertexData;

    const renderPassDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },
                clearValue: [0.5, 0.5, 0.5, 1.0],
                loadOp: "clear",
                storeOp: "store",
            },
        ],
        depthStencilAttachment: {
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };

    const renderObject: IGPURenderObject = {
        pipeline,
        vertices: {
            position: { data: vertexBuf, offset: 0, arrayStride: 6 * 4, format: "float32x3" },
            normal: { data: vertexBuf, offset: 12, arrayStride: 6 * 4, format: "float32x3" },
        },
        indices,
        bindingResources: {
            uni: {
                bufferView: undefined,
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
                    bufferView: v.uniformBuffer,
                },
            },
        };

        return ro;
    });

    const occlusionQueryObjects: IGPUOcclusionQuery[] = renderObjects.map((ro) =>
    ({ __type: "IGPUOcclusionQuery", renderObjects: [ro] }));

    const renderPass: IGPURenderPass = {
        descriptor: renderPassDescriptor,
        // renderObjects: renderObjects,
        renderObjects: occlusionQueryObjects,
    };

    const submit: IGPUSubmit = {
        commandEncoders: [
            {
                passEncoders: [
                    renderPass
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

                const buffer = (renderObjects[i].bindingResources.uni as IGPUBufferBinding).bufferView;
                getIGPUBuffer(buffer).data = uniformValues.slice();
            }
        );

        webgpu.submit(submit);

        // 监听查询结果。
        watcher.watch(renderPass, "occlusionQueryResults", () =>
        {
            const visible = objectInfos
                .filter((_, i) => renderPass.occlusionQueryResults[i].result)
                .map(({ id }) => id)
                .join("");
            info.textContent = `visible: ${visible}`;
        });

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
