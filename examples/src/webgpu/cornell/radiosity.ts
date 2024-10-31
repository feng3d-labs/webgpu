import { IGPUBindingResources, IGPUBuffer, IGPUCommandEncoder, IGPUComputePipeline, IGPUPassEncoder, IGPUTexture, WebGPU } from "@feng3d/webgpu-renderer";
import Common from "./common";
import radiosityWGSL from "./radiosity.wgsl";
import Scene from "./scene";

/**
 * Radiosity computes lightmaps, calculated by software raytracing of light in
 * the scene.
 */
export default class Radiosity
{
  // The output lightmap format and dimensions
  static readonly lightmapFormat = "rgba16float";
  static readonly lightmapWidth = 256;
  static readonly lightmapHeight = 256;

  // The output lightmap.
  readonly lightmap: IGPUTexture;

  // Number of photons emitted per workgroup.
  // This is equal to the workgroup size (one photon per invocation)
  private readonly kPhotonsPerWorkgroup = 256;
  // Number of radiosity workgroups dispatched per frame.
  private readonly kWorkgroupsPerFrame = 1024;
  private readonly kPhotonsPerFrame
    = this.kPhotonsPerWorkgroup * this.kWorkgroupsPerFrame;
  // Maximum value that can be added to the 'accumulation' buffer, per photon,
  // across all texels.
  private readonly kPhotonEnergy = 100000;
  // The total number of lightmap texels for all quads.
  private readonly kTotalLightmapTexels: number;

  private readonly kAccumulationToLightmapWorkgroupSizeX = 16;
  private readonly kAccumulationToLightmapWorkgroupSizeY = 16;

  private readonly common: Common;
  private readonly scene: Scene;
  private readonly radiosityPipeline: IGPUComputePipeline;
  private readonly accumulationToLightmapPipeline: IGPUComputePipeline;
  private readonly bindGroup: IGPUBindingResources;
  private readonly accumulationBuffer: IGPUBuffer;
  private readonly uniformBuffer: IGPUBuffer;

  // The 'accumulation' buffer average value
  private accumulationMean = 0;

  // The maximum value of 'accumulationAverage' before all values in
  // 'accumulation' are reduced to avoid integer overflows.
  private readonly kAccumulationMeanMax = 0x10000000;

  constructor(common: Common, scene: Scene, webgpu: WebGPU)
  {
    this.common = common;
    this.scene = scene;
    this.lightmap = {
      label: "Radiosity.lightmap",
      size: [
        Radiosity.lightmapWidth,
        Radiosity.lightmapHeight,
        scene.quads.length,
      ],
      format: Radiosity.lightmapFormat,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
    };
    this.accumulationBuffer = {
      label: "Radiosity.accumulationBuffer",
      size:
        Radiosity.lightmapWidth
        * Radiosity.lightmapHeight
        * scene.quads.length
        * 16,
      usage: GPUBufferUsage.STORAGE,
    };
    this.kTotalLightmapTexels
      = Radiosity.lightmapWidth * Radiosity.lightmapHeight * scene.quads.length;
    this.uniformBuffer = {
      label: "Radiosity.uniformBuffer",
      size: 8 * 4, // 8 x f32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
    this.bindGroup = {
      accumulation: {
        buffer: this.accumulationBuffer,
        size: this.accumulationBuffer.size,
      },
      lightmap: { texture: this.lightmap },
      uniforms: {
        buffer: this.uniformBuffer,
        size: this.uniformBuffer.size,
      },
    };

    this.radiosityPipeline = {
      label: "Radiosity.radiosityPipeline",
      compute: {
        code: radiosityWGSL + common.wgsl,
        entryPoint: "radiosity",
        constants: {
          PhotonsPerWorkgroup: this.kPhotonsPerWorkgroup,
          PhotonEnergy: this.kPhotonEnergy,
        },
      },
    };

    this.accumulationToLightmapPipeline = {
      label: "Radiosity.accumulationToLightmapPipeline",
      compute: {
        code: radiosityWGSL + common.wgsl,
        entryPoint: "accumulation_to_lightmap",
        constants: {
          AccumulationToLightmapWorkgroupSizeX:
            this.kAccumulationToLightmapWorkgroupSizeX,
          AccumulationToLightmapWorkgroupSizeY:
            this.kAccumulationToLightmapWorkgroupSizeY,
        },
      },
    };

    const lightmapSize = webgpu.getGPUTextureSize(this.lightmap);

    this.passEncoders = [{
      computeObjects: [
        // Dispatch the radiosity workgroups
        {
          pipeline: this.radiosityPipeline,
          bindingResources: {
            ...this.common.uniforms.bindGroup,
            ...this.bindGroup,
          },
          workgroups: { workgroupCountX: this.kWorkgroupsPerFrame },
        },
        // Then copy the 'accumulation' data to 'lightmap'
        {
          pipeline: this.accumulationToLightmapPipeline,
          bindingResources: {
            ...this.common.uniforms.bindGroup,
            ...this.bindGroup,
          },
          workgroups: {
            workgroupCountX: Math.ceil(Radiosity.lightmapWidth / this.kAccumulationToLightmapWorkgroupSizeX),
            workgroupCountY: Math.ceil(Radiosity.lightmapHeight / this.kAccumulationToLightmapWorkgroupSizeY),
            workgroupCountZ: lightmapSize[2] ?? 1
          },
        }
      ],
    }];
  }
  private passEncoders: IGPUPassEncoder[];

  encode(commandEncoder: IGPUCommandEncoder)
  {
    this.passEncoders.forEach((v) =>
    {
      commandEncoder.passEncoders.push(v);
    });
  }

  run()
  {
    // Calculate the new mean value for the accumulation buffer
    this.accumulationMean
      += (this.kPhotonsPerFrame * this.kPhotonEnergy) / this.kTotalLightmapTexels;

    // Calculate the 'accumulation' -> 'lightmap' scale factor from 'accumulationMean'
    const accumulationToLightmapScale = 1 / this.accumulationMean;
    // If 'accumulationMean' is greater than 'kAccumulationMeanMax', then reduce
    // the 'accumulation' buffer values to prevent u32 overflow.
    const accumulationBufferScale
      = this.accumulationMean > 2 * this.kAccumulationMeanMax ? 0.5 : 1;
    this.accumulationMean *= accumulationBufferScale;

    // Update the radiosity uniform buffer data.
    const uniformDataF32 = new Float32Array(this.uniformBuffer.size / 4);
    uniformDataF32[0] = accumulationToLightmapScale;
    uniformDataF32[1] = accumulationBufferScale;
    uniformDataF32[2] = this.scene.lightWidth;
    uniformDataF32[3] = this.scene.lightHeight;
    uniformDataF32[4] = this.scene.lightCenter[0];
    uniformDataF32[5] = this.scene.lightCenter[1];
    uniformDataF32[6] = this.scene.lightCenter[2];
    this.uniformBuffer.writeBuffers = [{ data: uniformDataF32 }];
  }
}
