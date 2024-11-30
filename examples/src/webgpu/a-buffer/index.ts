import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'wgpu-matrix';

import { mesh } from '../../meshes/teapot';

import compositeWGSL from './composite.wgsl';
import opaqueWGSL from './opaque.wgsl';
import translucentWGSL from './translucent.wgsl';

import { getIGPUBuffer, IGPUBuffer, IGPUBufferBinding, IGPUCanvasContext, IGPUPassEncoder, IGPURenderPass, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSubmit, IGPUTexture, IGPUTextureView, IGPUVertexAttributes, WebGPU } from "@feng3d/webgpu-renderer";

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{

    function roundUp(n: number, k: number): number
    {
        return Math.ceil(n / k) * k;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const webgpu = await new WebGPU().init();

    const context: IGPUCanvasContext = {
        canvasId: canvas.id,
        configuration: { alphaMode: "opaque" }
    };

    const params = new URLSearchParams(window.location.search);

    const settings = {
        memoryStrategy: params.get('memoryStrategy') || 'multipass',
    };

    // Create the model vertex buffer
    const vertices: IGPUVertexAttributes = {
        position: { data: new Float32Array(mesh.positions.flat()), numComponents: 3, vertexSize: 12 }
    };
    // Create the model index buffer
    const indices = new Uint16Array(mesh.triangles.flat());

    // Uniforms contains:
    // * modelViewProjectionMatrix: mat4x4f
    // * maxStorableFragments: u32
    // * targetWidth: u32
    const uniformsSize = roundUp(
        16 * Float32Array.BYTES_PER_ELEMENT + 2 * Uint32Array.BYTES_PER_ELEMENT,
        16
    );
    const uniforms: IGPUBufferBinding = {
        bufferView: new Uint8Array(uniformsSize),
        modelViewProjectionMatrix: undefined,
        maxStorableFragments: undefined,
        targetWidth: undefined,
    }

    const opaquePipeline: IGPURenderPipeline = {
        vertex: {
            code: opaqueWGSL,
        },
        fragment: {
            code: opaqueWGSL,
        },
        primitive: {
            topology: 'triangle-list',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
        },
        label: 'opaquePipeline',
    };

    const translucentPipeline: IGPURenderPipeline = {
        vertex: {
            code: translucentWGSL,
        },
        fragment: {
            code: translucentWGSL,
            targets: [
                {
                    writeMask: 0x0,
                },
            ],
        },
        primitive: {
            topology: 'triangle-list',
        },
        label: 'translucentPipeline',
    };

    const translucentPassDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                loadOp: 'load',
                storeOp: 'store',
                view: { texture: { context } },
            },
        ],
        label: 'translucentPassDescriptor',
    };

    const compositePipeline: IGPURenderPipeline = {
        vertex: {
            code: compositeWGSL,
        },
        fragment: {
            code: compositeWGSL,
            targets: [
                {
                    blend: {
                        color: {
                            srcFactor: 'one',
                            operation: 'add',
                            dstFactor: 'one-minus-src-alpha',
                        },
                        alpha: {},
                    },
                },
            ],
        },
        primitive: {
            topology: 'triangle-list',
        },
        label: 'compositePipeline',
    };

    const compositePassDescriptor: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context } },
                loadOp: 'load',
                storeOp: 'store',
            },
        ],
        label: 'compositePassDescriptor',
    };

    const configure = () =>
    {
        let devicePixelRatio = window.devicePixelRatio;

        // The default maximum storage buffer binding size is 128Mib. The amount
        // of memory we need to store transparent fragments depends on the size
        // of the canvas and the average number of layers per fragment we want to
        // support. When the devicePixelRatio is 1, we know that 128Mib is enough
        // to store 4 layers per pixel at 600x600. However, when the device pixel
        // ratio is high enough we will exceed this limit.
        //
        // We provide 2 choices of mitigations to this issue:
        // 1) Clamp the device pixel ratio to a value which we know will not break
        //    the limit. The tradeoff here is that the canvas resolution will not
        //    match the native resolution and therefore may have a reduction in
        //    quality.
        // 2) Break the frame into a series of horizontal slices using the scissor
        //    functionality and process a single slice at a time. This limits memory
        //    usage because we only need enough memory to process the dimensions
        //    of the slice. The tradeoff is the performance reduction due to multiple
        //    passes.
        if (settings.memoryStrategy === 'clamp-pixel-ratio')
        {
            devicePixelRatio = Math.min(window.devicePixelRatio, 3);
        }

        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;

        const depthTexture: IGPUTexture = {
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: 'depthTexture',
        };

        const depthTextureView: IGPUTextureView = {
            label: 'depthTextureView',
            texture: depthTexture,
        };

        // Determines how much memory is allocated to store linked-list elements
        const averageLayersPerFragment = 4;

        // Each element stores
        // * color : vec4f
        // * depth : f32
        // * index of next element in the list : u32
        const linkedListElementSize =
            5 * Float32Array.BYTES_PER_ELEMENT + 1 * Uint32Array.BYTES_PER_ELEMENT;

        // We want to keep the linked-list buffer size under the maxStorageBufferBindingSize.
        // Split the frame into enough slices to meet that constraint.
        const bytesPerline =
            canvas.width * averageLayersPerFragment * linkedListElementSize;
        const maxLinesSupported = Math.floor(
            webgpu.device.limits.maxStorageBufferBindingSize / bytesPerline
        );
        const numSlices = Math.ceil(canvas.height / maxLinesSupported);
        const sliceHeight = Math.ceil(canvas.height / numSlices);
        const linkedListBufferSize = sliceHeight * bytesPerline;

        const linkedListBuffer: IGPUBufferBinding = {
            bufferView: new Uint8Array(linkedListBufferSize),
            // data: [{ color: undefined, depth: undefined, next: undefined }]
        };

        // To slice up the frame we need to pass the starting fragment y position of the slice.
        // We do this using a uniform buffer with a dynamic offset.
        const sliceInfoBuffer = [];
        {
            for (let i = 0; i < numSlices; ++i)
            {
                sliceInfoBuffer[i] = { sliceStartY: i * sliceHeight }
            }
        }

        // `Heads` struct contains the start index of the linked-list of translucent fragments
        // for a given pixel.
        // * numFragments : u32
        // * data : array<u32>
        const headsBuffer: IGPUBufferBinding = {
            bufferView: new Uint32Array(1 + canvas.width * sliceHeight),
            numFragments: undefined,
            data: undefined,
        };

        const headsInitBuffer: IGPUBuffer = {
            size: (1 + canvas.width * sliceHeight) * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_SRC,
            label: 'headsInitBuffer',
        };
        {
            const buffer = new Uint32Array(headsInitBuffer.size / Uint32Array.BYTES_PER_ELEMENT);

            for (let i = 0; i < buffer.length; ++i)
            {
                buffer[i] = 0xffffffff;
            }
            headsInitBuffer.data = buffer;
        }

        const bindingResources = {
            uniforms,
            heads: headsBuffer,
            linkedList: linkedListBuffer,
            opaqueDepthTexture: depthTextureView,
            sliceInfo: { sliceStartY: undefined },
        };

        const opaquePassDescriptor: IGPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: { texture: { context } },
                    clearValue: [0, 0, 0, 1.0],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: depthTextureView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
            label: 'opaquePassDescriptor',
        };

        // Rotates the camera around the origin based on time.
        function getCameraViewProjMatrix()
        {
            const aspect = canvas.width / canvas.height;

            const projectionMatrix = mat4.perspective(
                (2 * Math.PI) / 5,
                aspect,
                1,
                2000.0
            );

            const upVector = vec3.fromValues(0, 1, 0);
            const origin = vec3.fromValues(0, 0, 0);
            const eyePosition = vec3.fromValues(0, 5, -100);

            const rad = Math.PI * (Date.now() / 5000);
            const rotation = mat4.rotateY(mat4.translation(origin), rad);
            vec3.transformMat4(eyePosition, rotation, eyePosition);

            const viewMatrix = mat4.lookAt(eyePosition, origin, upVector);

            const viewProjMatrix = mat4.multiply(projectionMatrix, viewMatrix);
            return viewProjMatrix;
        }

        const passEncoders: IGPUPassEncoder[] = [];

        // Draw the opaque objects
        const opaquePassEncoder: IGPURenderPass = {
            descriptor: opaquePassDescriptor,
            renderObjects: [{
                pipeline: opaquePipeline,
                bindingResources: bindingResources,
                vertices,
                indices,
                drawIndexed: { indexCount: mesh.triangles.length * 3, instanceCount: 8 },
            }]
        }
        passEncoders.push(opaquePassEncoder);

        for (let slice = 0; slice < numSlices; ++slice)
        {
            // initialize the heads buffer
            passEncoders.push({
                __type: "IGPUCopyBufferToBuffer",
                source: headsInitBuffer,
                sourceOffset: 0,
                destination: getIGPUBuffer(headsBuffer.bufferView),
                destinationOffset: 0,
                size: headsInitBuffer.size
            });

            const scissorX = 0;
            const scissorY = slice * sliceHeight;
            const scissorWidth = canvas.width;
            const scissorHeight =
                Math.min((slice + 1) * sliceHeight, canvas.height) -
                slice * sliceHeight;

            // Draw the translucent objects

            const translucentPassEncoder: IGPURenderPass = {
                descriptor: translucentPassDescriptor,
                renderObjects: [
                    // Set the scissor to only process a horizontal slice of the frame
                    {
                        __type: "IGPUScissorRect",
                        x: scissorX,
                        y: scissorY,
                        width: scissorWidth,
                        height: scissorHeight
                    },
                    {
                        pipeline: translucentPipeline,
                        bindingResources: {
                            ...bindingResources,
                            sliceInfo: sliceInfoBuffer[slice],
                        },
                        vertices,
                        indices,
                        drawIndexed: { indexCount: mesh.triangles.length * 3, instanceCount: 8 },
                    }
                ],
            };
            passEncoders.push(translucentPassEncoder);

            // Composite the opaque and translucent objects
            const compositePassEncoder: IGPURenderPass =
            {
                descriptor: compositePassDescriptor,
                renderObjects: [
                    // Set the scissor to only process a horizontal slice of the frame
                    {
                        __type: "IGPUScissorRect",
                        x: scissorX,
                        y: scissorY,
                        width: scissorWidth,
                        height: scissorHeight
                    },
                    {
                        pipeline: compositePipeline,
                        bindingResources: {
                            ...bindingResources,
                            sliceInfo: sliceInfoBuffer[slice]
                        },
                        draw: { vertexCount: 6 },
                    }
                ]
            };
            passEncoders.push(compositePassEncoder);
        }

        const submit: IGPUSubmit = {
            commandEncoders: [{
                passEncoders: passEncoders,
            }],
        };

        // update the uniform buffer
        uniforms.maxStorableFragments = averageLayersPerFragment * canvas.width * sliceHeight;
        uniforms.targetWidth = canvas.width;

        return function doDraw()
        {
            // update the uniform buffer
            {
                uniforms.modelViewProjectionMatrix = getCameraViewProjMatrix();
            }

            webgpu.submit(submit);
        };
    };

    let doDraw = configure();

    const updateSettings = () =>
    {
        doDraw = configure();
    };

    gui
        .add(settings, 'memoryStrategy', ['multipass', 'clamp-pixel-ratio'])
        .onFinishChange(updateSettings);

    function frame()
    {
        doDraw();

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
