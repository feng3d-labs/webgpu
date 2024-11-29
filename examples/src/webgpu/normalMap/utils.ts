import { IGPURenderPipeline, IGPUTexture } from "@feng3d/webgpu-renderer";

export const create3DRenderPipeline = (
  label: string,
  vertexShader: string,
  fragmentShader: string,
  depthTest = false,
  topology: GPUPrimitiveTopology = 'triangle-list',
  cullMode: GPUCullMode = 'back'
) =>
{
  const pipelineDescriptor: IGPURenderPipeline = {
    label: `${label}.pipeline`,
    vertex: {
      code: vertexShader,
    },
    fragment: {
      code: fragmentShader,
    },
    primitive: {
      topology: topology,
      cullMode: cullMode,
    },
  };
  if (depthTest)
  {
    pipelineDescriptor.depthStencil = {
      depthCompare: 'less',
      depthWriteEnabled: true,
    };
  }
  return pipelineDescriptor;
};

export const createTextureFromImage = (
  bitmap: ImageBitmap
) =>
{
  const texture: IGPUTexture = {
    size: [bitmap.width, bitmap.height, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
    source: [{ source: { source: bitmap }, destination: {}, copySize: [bitmap.width, bitmap.height] }]
  };
  return texture;
};
