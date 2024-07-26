import { IGPUBindingResources, IGPUCommandEncoder, IGPUComputePipeline, IGPUPassEncoder, IGPUTexture, IGPUTextureFromContext, WebGPU } from "webgpu-renderer";

import Common from "./common";
import tonemapperWGSL from "./tonemapper.wgsl";

/**
 * Tonemapper implements a tonemapper to convert a linear-light framebuffer to
 * a gamma-correct, tonemapped framebuffer used for presentation.
 */
export default class Tonemapper
{
  private readonly bindGroup: IGPUBindingResources;
  private readonly pipeline: IGPUComputePipeline;
  private readonly width: number;
  private readonly height: number;
  private readonly kWorkgroupSizeX = 16;
  private readonly kWorkgroupSizeY = 16;

  constructor(
    common: Common,
    input: IGPUTexture,
    output: IGPUTextureFromContext,
    webgpu: WebGPU,
  )
  {
    const inputSize = webgpu.getGPUTextureSize(input);

    this.width = inputSize[0];
    this.height = inputSize[1];
    this.bindGroup = {
      input: { texture: input },
      output: { texture: output },
    };

    this.pipeline = {
      label: "Tonemap.pipeline",
      compute: {
        code: tonemapperWGSL.replace("{OUTPUT_FORMAT}", output.context.configuration.format),
        constants: {
          WorkgroupSizeX: this.kWorkgroupSizeX,
          WorkgroupSizeY: this.kWorkgroupSizeY,
        },
      },
    };

    //
    this.passEncoder = {
      computeObjects: [{
        pipeline: this.pipeline,
        bindingResources: {
          ...this.bindGroup,
        },
        workgroups: {
          workgroupCountX: Math.ceil(this.width / this.kWorkgroupSizeX),
          workgroupCountY: Math.ceil(this.height / this.kWorkgroupSizeY)
        },
      }],
    };
  }
  private passEncoder: IGPUPassEncoder;

  encode(commandEncoder: IGPUCommandEncoder)
  {
    commandEncoder.passEncoders.push(this.passEncoder);
  }
}
