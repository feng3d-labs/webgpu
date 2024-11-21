import { GUI } from "dat.gui";

import animometerWGSL from "./animometer.wgsl";

import { IGPURenderBundleObject, IGPURenderObject, IGPURenderPass, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSubmit, WebGPU, getIGPUBuffer } from "@feng3d/webgpu-renderer";

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    const perfDisplayContainer = document.createElement("div");
    perfDisplayContainer.style.color = "white";
    perfDisplayContainer.style.background = "black";
    perfDisplayContainer.style.position = "absolute";
    perfDisplayContainer.style.top = "10px";
    perfDisplayContainer.style.left = "10px";

    const perfDisplay = document.createElement("pre");
    perfDisplayContainer.appendChild(perfDisplay);
    canvas.parentNode.appendChild(perfDisplayContainer);

    const params = new URLSearchParams(window.location.search);
    const settings = {
        numTriangles: Number(params.get("numTriangles")) || 20000,
        renderBundles: Boolean(params.get("renderBundles")),
    };

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await new WebGPU().init();

    const vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;

    const pipelineDesc: IGPURenderPipeline = {
        vertex: {
            code: animometerWGSL,
        },
        fragment: {
            code: animometerWGSL,
        },
        primitive: {
            frontFace: "ccw",
        }
    };

    const pipeline: IGPURenderPipeline = {
        ...pipelineDesc,
    };

    const vertexBuffer = new Float32Array([
        // position data  /**/ color data
        0, 0.1, 0, 1, /**/ 1, 0, 0, 1,
        -0.1, -0.1, 0, 1, /**/ 0, 1, 0, 1,
        0.1, -0.1, 0, 1, /**/ 0, 0, 1, 1,
    ]);

    function configure()
    {
        const numTriangles = settings.numTriangles;
        const uniformBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
        const alignedUniformBytes = Math.ceil(uniformBytes / 256) * 256;
        const alignedUniformFloats = alignedUniformBytes / Float32Array.BYTES_PER_ELEMENT;
        const uniformBuffer = new Uint8Array(numTriangles * alignedUniformBytes + Float32Array.BYTES_PER_ELEMENT);
        const uniformBufferData = new Float32Array(
            numTriangles * alignedUniformFloats
        );
        for (let i = 0; i < numTriangles; ++i)
        {
            uniformBufferData[alignedUniformFloats * i + 0] = Math.random() * 0.2 + 0.2; // scale
            uniformBufferData[alignedUniformFloats * i + 1] = 0.9 * 2 * (Math.random() - 0.5); // offsetX
            uniformBufferData[alignedUniformFloats * i + 2] = 0.9 * 2 * (Math.random() - 0.5); // offsetY
            uniformBufferData[alignedUniformFloats * i + 3] = Math.random() * 1.5 + 0.5; // scalar
            uniformBufferData[alignedUniformFloats * i + 4] = Math.random() * 10; // scalarOffset
        }

        const timeOffset = numTriangles * alignedUniformBytes;

        // writeBuffer too large may OOM. TODO: The browser should internally chunk uploads.
        const maxMappingLength = (14 * 1024 * 1024) / Float32Array.BYTES_PER_ELEMENT;
        const writeBuffers = getIGPUBuffer(uniformBuffer).writeBuffers || [];
        for (let offset = 0; offset < uniformBufferData.length; offset += maxMappingLength)
        {
            const uploadCount = Math.min(uniformBufferData.length - offset, maxMappingLength);

            writeBuffers.push({
                bufferOffset: offset * Float32Array.BYTES_PER_ELEMENT,
                data: uniformBufferData.buffer,
                dataOffset: uniformBufferData.byteOffset + offset * Float32Array.BYTES_PER_ELEMENT,
                size: uploadCount * Float32Array.BYTES_PER_ELEMENT,
            });
        }
        getIGPUBuffer(uniformBuffer).writeBuffers = writeBuffers;

        const renderObjects: IGPURenderObject[] = [];
        for (let i = 0; i < numTriangles; ++i)
        {
            renderObjects[i] = {
                pipeline,
                vertices: {
                    position: { data: vertexBuffer, offset: 0, vertexSize: 2 * vec4Size },
                    color: { data: vertexBuffer, offset: vec4Size, vertexSize: 2 * vec4Size },
                },
                bindingResources: {
                    time: {
                        bufferView: uniformBuffer,
                        offset: timeOffset,
                    },
                    uniforms: {
                        bufferView: uniformBuffer,
                        offset: i * alignedUniformBytes,
                    }
                },
                draw: { vertexCount: 3, instanceCount: 1 },
            };
        }

        let startTime: number;
        const uniformTime = new Float32Array([0]);

        const renderPass: IGPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: { texture: { context: { canvasId: canvas.id } } },
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                }
            ],
        };

        const renderBundleObject: IGPURenderBundleObject = {
            renderObjects
        };

        const renderPasss: (IGPURenderPass)[] = [];
        const submit: IGPUSubmit = {
            commandEncoders: [
                {
                    passEncoders: renderPasss,
                }
            ]
        };

        return function doDraw(timestamp: number)
        {
            if (startTime === undefined)
            {
                startTime = timestamp;
            }
            uniformTime[0] = (timestamp - startTime) / 1000;

            const writeBuffers = getIGPUBuffer(uniformBuffer).writeBuffers || [];
            writeBuffers.push({
                bufferOffset: timeOffset, data: uniformTime
            });
            getIGPUBuffer(uniformBuffer).writeBuffers = writeBuffers;

            if (settings.renderBundles)
            {
                renderPasss[0] = {
                    descriptor: renderPass,
                    renderObjects: [renderBundleObject],
                };
            }
            else
            {
                renderPasss[0] = {
                    descriptor: renderPass,
                    renderObjects,
                };
            }

            webgpu.submit(submit);
        };
    }

    let doDraw = configure();

    const updateSettings = () =>
    {
        doDraw = configure();
    };
    gui
        .add(settings, "numTriangles", 0, 200000)
        .step(1)
        .onFinishChange(updateSettings);
    gui.add(settings, "renderBundles");

    let previousFrameTimestamp: number;
    let jsTimeAvg: number;
    let frameTimeAvg: number;
    let updateDisplay = true;

    function frame(timestamp: number)
    {
        let frameTime = 0;
        if (previousFrameTimestamp !== undefined)
        {
            frameTime = timestamp - previousFrameTimestamp;
        }
        previousFrameTimestamp = timestamp;

        const start = performance.now();
        doDraw(timestamp);
        const jsTime = performance.now() - start;
        if (frameTimeAvg === undefined)
        {
            frameTimeAvg = frameTime;
        }
        if (jsTimeAvg === undefined)
        {
            jsTimeAvg = jsTime;
        }

        const w = 0.2;
        frameTimeAvg = (1 - w) * frameTimeAvg + w * frameTime;
        jsTimeAvg = (1 - w) * jsTimeAvg + w * jsTime;

        if (updateDisplay)
        {
            perfDisplay.innerHTML = `Avg Javascript: ${jsTimeAvg.toFixed(
                2
            )} ms\nAvg Frame: ${frameTimeAvg.toFixed(2)} ms`;
            updateDisplay = false;
            setTimeout(() =>
            {
                updateDisplay = true;
            }, 100);
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
