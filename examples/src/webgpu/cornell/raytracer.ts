import { IBindingResources, ICommandEncoder, IComputePipeline, IPassEncoder, ITexture, internal } from 'webgpu-simplify';

import Common from './common';
import Radiosity from './radiosity';
import raytracerWGSL from './raytracer.wgsl';

/**
 * Raytracer renders the scene using a software ray-tracing compute pipeline.
 */
export default class Raytracer
{
  private readonly common: Common;
  private readonly framebuffer: ITexture;
  private readonly pipeline: IComputePipeline;
  private readonly bindGroup: IBindingResources;

  private readonly kWorkgroupSizeX = 16;
  private readonly kWorkgroupSizeY = 16;

  constructor(
    common: Common,
    radiosity: Radiosity,
    framebuffer: ITexture
  )
  {
    this.common = common;
    this.framebuffer = framebuffer;

    this.bindGroup = {
      lightmap: { texture: radiosity.lightmap },
      smpl: {
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
        addressModeW: 'clamp-to-edge',
        magFilter: 'linear',
        minFilter: 'linear',
      },
      framebuffer: { texture: framebuffer },
    };

    this.pipeline = {
      label: 'raytracerPipeline',
      compute: {
        code: raytracerWGSL + common.wgsl,
        constants: {
          WorkgroupSizeX: this.kWorkgroupSizeX,
          WorkgroupSizeY: this.kWorkgroupSizeY,
        },
      },
    };

    const framebufferSize = internal.getIGPUTextureSize(this.framebuffer);
    //
    this.passEncoder = {
      computeObjects: [{
        pipeline: this.pipeline,
        bindingResources: {
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
