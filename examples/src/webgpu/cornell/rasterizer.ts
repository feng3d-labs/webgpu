import { IGPUBindingResources, IGPUCommandEncoder, IGPURenderPipeline, internal } from "@feng3d/webgpu";

import { IRenderPass, IRenderPassDescriptor, ITexture } from "@feng3d/render-api";
import Common from "./common";
import Radiosity from "./radiosity";
import rasterizerWGSL from "./rasterizer.wgsl";
import Scene from "./scene";

/**
 * Rasterizer renders the scene using a regular raserization graphics pipeline.
 */
export default class Rasterizer
{
    private readonly common: Common;
    private readonly scene: Scene;
    private readonly renderPassDescriptor: IRenderPassDescriptor;
    private readonly pipeline: IGPURenderPipeline;
    private readonly bindGroup: IGPUBindingResources;

    constructor(
        common: Common,
        scene: Scene,
        radiosity: Radiosity,
        framebuffer: ITexture,
    )
    {
        this.common = common;
        this.scene = scene;

        const framebufferSize = framebuffer.size;

        const depthTexture: ITexture = {
            label: "RasterizerRenderer.depthTexture",
            size: [framebufferSize[0], framebufferSize[1]],
            format: "depth24plus",
        };

        this.renderPassDescriptor = {
            label: "RasterizerRenderer.renderPassDescriptor",
            colorAttachments: [
                {
                    view: { texture: framebuffer },
                    clearValue: [0.1, 0.2, 0.3, 1],
                },
            ],
            depthStencilAttachment: {
                view: { texture: depthTexture },

                depthClearValue: 1,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            },
        };

        this.bindGroup = {
            lightmap: { texture: radiosity.lightmap },
            smpl: {
                addressModeU: "clamp-to-edge",
                addressModeV: "clamp-to-edge",
                magFilter: "linear",
                minFilter: "linear",
            },
        };

        this.pipeline = {
            label: "RasterizerRenderer.pipeline",
            vertex: {
                code: rasterizerWGSL + common.wgsl,
            },
            fragment: {
                code: rasterizerWGSL + common.wgsl,
            },
            primitive: {
                cullMode: "back",
            },
        };

        //
        this.renderPassEncoder = {
            descriptor: this.renderPassDescriptor,
            renderObjects: [{
                pipeline: this.pipeline,
                vertices: this.scene.vertexAttributes,
                indices: this.scene.indices,
                bindingResources: {
                    ...this.common.uniforms.bindGroup,
                    ...this.bindGroup,
                },
                drawIndexed: { indexCount: this.scene.indexCount },
            }],
        };
    }
    private renderPassEncoder: IRenderPass;

    encode(commandEncoder: IGPUCommandEncoder)
    {
        commandEncoder.passEncoders.push(this.renderPassEncoder);
    }
}
