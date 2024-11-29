import { Base2DRendererClass, } from './utils';

import bitonicDisplay from './bitonicDisplay.frag.wgsl';

import { IGPUBindingResources, IGPUBuffer, IGPUCommandEncoder, IGPURenderPassDescriptor } from "@feng3d/webgpu-renderer";

interface BitonicDisplayRenderArgs
{
  highlight: number;
}

export default class BitonicDisplayRenderer extends Base2DRendererClass
{
  switchBindGroup: (name: string) => void;
  setArguments: (args: BitonicDisplayRenderArgs) => void;
  computeBGDescript: IGPUBindingResources;

  constructor(
    renderPassDescriptor: IGPURenderPassDescriptor,
    computeBGDescript: IGPUBindingResources,
    label: string
  )
  {
    super();
    this.renderPassDescriptor = renderPassDescriptor;
    this.computeBGDescript = computeBGDescript;

    const uniformBuffer: IGPUBuffer = {
      size: Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };

    computeBGDescript.fragment_uniforms = uniformBuffer;

    this.pipeline = super.create2DRenderPipeline(
      label,
      bitonicDisplay,
    );

    this.setArguments = (args: BitonicDisplayRenderArgs) =>
    {
      const writeBuffers = (uniformBuffer.writeBuffers || []);
      writeBuffers.push({
        data: new Uint32Array([args.highlight]),
      });
      uniformBuffer.writeBuffers = writeBuffers
    };
  }

  startRun(commandEncoder: IGPUCommandEncoder, args: BitonicDisplayRenderArgs)
  {
    this.setArguments(args);
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, this.computeBGDescript);
  }
}
