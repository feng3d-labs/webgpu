import { ICommandEncoder, IPassEncoder, ITexture, IUniforms } from "@feng3d/render-api";
import { IGPUComputePipeline } from "@feng3d/webgpu";

import Common from "./common";
import Radiosity from "./radiosity";
import raytracerWGSL from "./raytracer.wgsl";

/**
 * Raytracer renders the scene using a software ray-tracing compute pipeline.
 */
export default class Raytracer
{
  private readonly common: Common;
  private readonly framebuffer: ITexture;
  private readonly pipeline: IGPUComputePipeline;
  private readonly bindGroup: IUniforms;

  private readonly kWorkgroupSizeX = 16;
  private readonly kWorkgroupSizeY = 16;

  constructor(
    common: Common,
    radiosity: Radiosity,
    framebuffer: ITexture,
  )
  {
    this.common = common;
    this.framebuffer = framebuffer;

    this.bindGroup = {
      lightmap: { texture: radiosity.lightmap },
      smpl: {
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        addressModeW: "clamp-to-edge",
        magFilter: "linear",
        minFilter: "linear",
      },
      framebuffer: { texture: framebuffer },
    };

    this.pipeline = {
      label: "raytracerPipeline",
      compute: {
        code: raytracerWGSL + common.wgsl,
        constants: {
          WorkgroupSizeX: this.kWorkgroupSizeX,
          WorkgroupSizeY: this.kWorkgroupSizeY,
        },
      },
    };

    const framebufferSize = this.framebuffer.size;
    //
    this.passEncoder = {
      __type: "ComputePass",
      computeObjects: [{
        pipeline: this.pipeline,
        uniforms: {
          ...this.common.uniforms.bindGroup,
          ...this.bindGroup,
        },
        workgroups: {
          workgroupCountX: Math.ceil(framebufferSize[0] / this.kWorkgroupSizeX),
          workgroupCountY: Math.ceil(framebufferSize[1] / this.kWorkgroupSizeY)
        }
      }],
    };
  }
  private passEncoder: IPassEncoder;

  encode(commandEncoder: ICommandEncoder)
  {
    commandEncoder.passEncoders.push(this.passEncoder);
  }
}
