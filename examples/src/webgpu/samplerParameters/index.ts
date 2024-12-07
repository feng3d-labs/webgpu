import { GUI } from "dat.gui";

import { mat4 } from "wgpu-matrix";

import showTextureWGSL from "./showTexture.wgsl";
import texturedSquareWGSL from "./texturedSquare.wgsl";

import { getIGPUBuffer, IGPUBindingResources, IGPURenderPassDescriptor, IGPURenderPassObject, IGPURenderPipeline, IGPUSampler, IGPUSubmit, IGPUTexture, WebGPU } from "@feng3d/webgpu";

const kMatrices: Readonly<Float32Array> = new Float32Array([
    // Row 1: Scale by 2
    ...mat4.scale(mat4.rotationZ(Math.PI / 16), [2, 2, 1]),
    ...mat4.scale(mat4.identity(), [2, 2, 1]),
    ...mat4.scale(mat4.rotationX(-Math.PI * 0.3), [2, 2, 1]),
    ...mat4.scale(mat4.rotationX(-Math.PI * 0.42), [2, 2, 1]),
    // Row 2: Scale by 1
    ...mat4.rotationZ(Math.PI / 16),
    ...mat4.identity(),
    ...mat4.rotationX(-Math.PI * 0.3),
    ...mat4.rotationX(-Math.PI * 0.42),
    // Row 3: Scale by 0.9
    ...mat4.scale(mat4.rotationZ(Math.PI / 16), [0.9, 0.9, 1]),
    ...mat4.scale(mat4.identity(), [0.9, 0.9, 1]),
    ...mat4.scale(mat4.rotationX(-Math.PI * 0.3), [0.9, 0.9, 1]),
    ...mat4.scale(mat4.rotationX(-Math.PI * 0.42), [0.9, 0.9, 1]),
    // Row 4: Scale by 0.3
    ...mat4.scale(mat4.rotationZ(Math.PI / 16), [0.3, 0.3, 1]),
    ...mat4.scale(mat4.identity(), [0.3, 0.3, 1]),
    ...mat4.scale(mat4.rotationX(-Math.PI * 0.3), [0.3, 0.3, 1]),
]);

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
    //
    // GUI controls
    //

    const kInitConfig = {
        flangeLogSize: 1.0,
        highlightFlange: false,
        animation: 0.1,
    } as const;
    const config = { ...kInitConfig };
    const updateConfigBuffer = () =>
    {
        const t = (performance.now() / 1000) * 0.5;
        const data = new Float32Array([
            Math.cos(t) * config.animation,
            Math.sin(t) * config.animation,
            (2 ** config.flangeLogSize - 1) / 2,
            Number(config.highlightFlange),
        ]);

        if (getIGPUBuffer(bufConfig).writeBuffers)
        {
            getIGPUBuffer(bufConfig).writeBuffers.push({ bufferOffset: 64, data });
        }
        else
        {
            getIGPUBuffer(bufConfig).writeBuffers = [{ bufferOffset: 64, data }];
        }
    };

    const kInitSamplerDescriptor = {
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        lodMinClamp: 0,
        lodMaxClamp: 4,
        maxAnisotropy: 1,
    } as const;
    const samplerDescriptor: GPUSamplerDescriptor = { ...kInitSamplerDescriptor };

    {
        const buttons = {
            initial()
            {
                Object.assign(config, kInitConfig);
                Object.assign(samplerDescriptor, kInitSamplerDescriptor);
                gui.updateDisplay();

                updateSamplerResources();
            },
            checkerboard()
            {
                Object.assign(config, { flangeLogSize: 10 });
                Object.assign(samplerDescriptor, {
                    addressModeU: "repeat",
                    addressModeV: "repeat",
                });
                gui.updateDisplay();

                updateSamplerResources();
            },
            smooth()
            {
                Object.assign(samplerDescriptor, {
                    magFilter: "linear",
                    minFilter: "linear",
                    mipmapFilter: "linear",
                });
                gui.updateDisplay();

                updateSamplerResources();
            },
            crunchy()
            {
                Object.assign(samplerDescriptor, {
                    magFilter: "nearest",
                    minFilter: "nearest",
                    mipmapFilter: "nearest",
                });
                gui.updateDisplay();

                updateSamplerResources();
            },
        };
        const presets = gui.addFolder("Presets");
        presets.open();
        presets.add(buttons, "initial").name("reset to initial");
        presets.add(buttons, "checkerboard").name("checkered floor");
        presets.add(buttons, "smooth").name("smooth (linear)");
        presets.add(buttons, "crunchy").name("crunchy (nearest)");

        const flangeFold = gui.addFolder("Plane settings");
        flangeFold.open();
        flangeFold.add(config, "flangeLogSize", 0, 10.0, 0.1).name("size = 2**");
        flangeFold.add(config, "highlightFlange");
        flangeFold.add(config, "animation", 0, 0.5);

        gui.width = 280;
        {
            const folder = gui.addFolder("GPUSamplerDescriptor");
            folder.open();

            const kAddressModes = ["clamp-to-edge", "repeat", "mirror-repeat"];
            folder.add(samplerDescriptor, "addressModeU", kAddressModes).onChange(updateSamplerResources);
            folder.add(samplerDescriptor, "addressModeV", kAddressModes).onChange(updateSamplerResources);

            const kFilterModes = ["nearest", "linear"];
            folder.add(samplerDescriptor, "magFilter", kFilterModes).onChange(updateSamplerResources);
            folder.add(samplerDescriptor, "minFilter", kFilterModes).onChange(updateSamplerResources);
            const kMipmapFilterModes = ["nearest", "linear"] as const;
            folder.add(samplerDescriptor, "mipmapFilter", kMipmapFilterModes).onChange(updateSamplerResources);

            const ctlMin = folder.add(samplerDescriptor, "lodMinClamp", 0, 4, 0.1);
            const ctlMax = folder.add(samplerDescriptor, "lodMaxClamp", 0, 4, 0.1);
            ctlMin.onChange((value: number) =>
            {
                if (samplerDescriptor.lodMaxClamp < value) ctlMax.setValue(value);

                updateSamplerResources();
            });
            ctlMax.onChange((value: number) =>
            {
                if (samplerDescriptor.lodMinClamp > value) ctlMin.setValue(value);

                updateSamplerResources();
            });

            {
                const folder2 = folder.addFolder(
                    "maxAnisotropy (set only if all \"linear\")"
                );
                folder2.open();
                const kMaxAnisotropy = 16;
                folder2.add(samplerDescriptor, "maxAnisotropy", 1, kMaxAnisotropy, 1).onChange(updateSamplerResources);
            }
        }
    }

    /**
     * 更新采样资源
     */
    function updateSamplerResources()
    {
        const sampler: IGPUSampler = {
            ...samplerDescriptor,
            maxAnisotropy:
                samplerDescriptor.minFilter === "linear"
                    && samplerDescriptor.magFilter === "linear"
                    && samplerDescriptor.mipmapFilter === "linear"
                    ? samplerDescriptor.maxAnisotropy
                    : 1,
        };

        bindingResources0.samp = sampler;
    }

    //
    // Canvas setup
    //

    // Low-res, pixelated render target so it's easier to see fine details.
    const kCanvasSize = 200;
    const kViewportGridSize = 4;
    const kViewportGridStride = Math.floor(kCanvasSize / kViewportGridSize);
    const kViewportSize = kViewportGridStride - 2;

    // The canvas buffer size is 200x200.
    // Compute a canvas CSS size such that there's an integer number of device
    // pixels per canvas pixel ("integer" or "pixel-perfect" scaling).
    // Note the result may be 1 pixel off since ResizeObserver is not used.
    const kCanvasLayoutCSSSize = 600; // set by template styles
    const kCanvasLayoutDevicePixels = kCanvasLayoutCSSSize * devicePixelRatio;
    const kScaleFactor = Math.floor(kCanvasLayoutDevicePixels / kCanvasSize);
    const kCanvasDevicePixels = kScaleFactor * kCanvasSize;
    const kCanvasCSSSize = kCanvasDevicePixels / devicePixelRatio;
    canvas.style.imageRendering = "pixelated";
    canvas.width = canvas.height = kCanvasSize;
    canvas.style.minWidth = canvas.style.maxWidth = `${kCanvasCSSSize}px`;

    const webgpu = await new WebGPU().init();

    //
    // Initialize test texture
    //

    // Set up a texture with 4 mip levels, each containing a differently-colored
    // checkerboard with 1x1 pixels (so when rendered the checkerboards are
    // different sizes). This is different from a normal mipmap where each level
    // would look like a lower-resolution version of the previous one.
    // Level 0 is 16x16 white/black
    // Level 1 is 8x8 blue/black
    // Level 2 is 4x4 yellow/black
    // Level 3 is 2x2 pink/black
    const kTextureMipLevels = 4;
    const kTextureBaseSize = 16;

    const checkerboard: IGPUTexture = {
        format: "rgba8unorm",
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
        size: [kTextureBaseSize, kTextureBaseSize],
        mipLevelCount: 4,
    };

    const kColorForLevel = [
        [255, 255, 255, 255],
        [30, 136, 229, 255], // blue
        [255, 193, 7, 255], // yellow
        [216, 27, 96, 255], // pink
    ];
    const writeTextures = checkerboard.writeTextures || [];
    for (let mipLevel = 0; mipLevel < kTextureMipLevels; ++mipLevel)
    {
        const size = 2 ** (kTextureMipLevels - mipLevel); // 16, 8, 4, 2
        const data = new Uint8Array(size * size * 4);
        for (let y = 0; y < size; ++y)
        {
            for (let x = 0; x < size; ++x)
            {
                data.set(
                    (x + y) % 2 ? kColorForLevel[mipLevel] : [0, 0, 0, 255],
                    (y * size + x) * 4
                );
            }
        }
        writeTextures.push({
            destination: { mipLevel },
            data,
            dataLayout: { bytesPerRow: size * 4 },
            size: [size, size]
        });
    }
    checkerboard.writeTextures = writeTextures;

    //
    // "Debug" view of the actual texture contents
    //

    const showTexturePipeline: IGPURenderPipeline = {
        vertex: { code: showTextureWGSL }, fragment: { code: showTextureWGSL }
    };

    //
    // Pipeline for drawing the test squares
    //

    const texturedSquarePipeline: IGPURenderPipeline = {
        vertex: { code: texturedSquareWGSL, constants: { kTextureBaseSize, kViewportSize } }, fragment: { code: texturedSquareWGSL },
    };

    // View-projection matrix set up so it doesn't transform anything at z=0.
    const kCameraDist = 3;
    const viewProj = mat4.translate(
        mat4.perspective(2 * Math.atan(1 / kCameraDist), 1, 0.1, 100),
        [0, 0, -kCameraDist]
    );
    const bufConfig = new Uint8Array(128);
    getIGPUBuffer(bufConfig).writeBuffers = [{ data: viewProj }];

    const bufMatrices = kMatrices;

    const renderPass: IGPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: { texture: { context: { canvasId: canvas.id } } },
                clearValue: [0.2, 0.2, 0.2, 1.0],
            }
        ],
    };

    const renderObjects: IGPURenderPassObject[] = [];

    const bindingResources0: IGPUBindingResources = {
        config: { bufferView: bufConfig },
        matrices: { bufferView: bufMatrices },
        samp: null, // 帧更新中设置
        tex: { texture: checkerboard },
    };

    updateSamplerResources();

    for (let i = 0; i < kViewportGridSize ** 2 - 1; ++i)
    {
        const vpX = kViewportGridStride * (i % kViewportGridSize) + 1;
        const vpY = kViewportGridStride * Math.floor(i / kViewportGridSize) + 1;

        renderObjects.push(
            { __type: "Viewport", x: vpX, y: vpY, width: kViewportSize, height: kViewportSize, minDepth: 0, maxDepth: 1 },
            {
                pipeline: texturedSquarePipeline,
                bindingResources: bindingResources0,
                drawVertex: { vertexCount: 6, instanceCount: 1, firstVertex: 0, firstInstance: i }
            }
        );
    }

    const bindingResources1: IGPUBindingResources = {
        tex: { texture: checkerboard },
    };
    const kLastViewport = (kViewportGridSize - 1) * kViewportGridStride + 1;
    renderObjects.push(
        { __type: "Viewport", x: kLastViewport, y: kLastViewport, width: 32, height: 32, minDepth: 0, maxDepth: 1 },
        {
            pipeline: showTexturePipeline,
            bindingResources: bindingResources1,
            drawVertex: { vertexCount: 6, instanceCount: 1, firstVertex: 0, firstInstance: 0 }
        }
    );
    renderObjects.push(
        { __type: "Viewport", x: kLastViewport + 32, y: kLastViewport, width: 16, height: 16, minDepth: 0, maxDepth: 1 },
        {
            pipeline: showTexturePipeline,
            bindingResources: bindingResources1,
            drawVertex: { vertexCount: 6, instanceCount: 1, firstVertex: 0, firstInstance: 1 }
        }
    );
    renderObjects.push(
        { __type: "Viewport", x: kLastViewport + 32, y: kLastViewport + 16, width: 8, height: 8, minDepth: 0, maxDepth: 1 },
        {
            pipeline: showTexturePipeline,
            bindingResources: bindingResources1,
            drawVertex: { vertexCount: 6, instanceCount: 1, firstVertex: 0, firstInstance: 3 }
        }
    );
    renderObjects.push(
        { __type: "Viewport", x: kLastViewport + 32, y: kLastViewport + 24, width: 4, height: 4, minDepth: 0, maxDepth: 1 },
        {
            pipeline: showTexturePipeline,
            bindingResources: bindingResources1,
            drawVertex: { vertexCount: 6, instanceCount: 1, firstVertex: 0, firstInstance: 2 }
        }
    );

    const submit: IGPUSubmit = {
        commandEncoders: [
            {
                passEncoders: [
                    {
                        descriptor: renderPass,
                        renderObjects,
                    }
                ]
            }
        ]
    };

    function frame()
    {
        updateConfigBuffer();

        webgpu.submit(submit);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
