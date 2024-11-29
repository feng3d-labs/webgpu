import { Base2DRendererClass, } from './utils';

import bitonicDisplay from './bitonicDisplay.frag.wgsl';

import { IGPUBindingResources, IGPUBuffer, IGPUBufferBinding, IGPUCommandEncoder, IGPURenderPassDescriptor } from "@feng3d/webgpu-renderer";

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

    const fragment_uniforms: IGPUBufferBinding = {
      highlight: undefined,
    };

    computeBGDescript.fragment_uniforms = fragment_uniforms;

    this.pipeline = super.create2DRenderPipeline(
      label,
      bitonicDisplay,
    );

    this.setArguments = (args: BitonicDisplayRenderArgs) =>
    {
      fragment_uniforms.highlight = args.highlight
    };
  }

  startRun(commandEncoder: IGPUCommandEncoder, args: BitonicDisplayRenderArgs)
  {
    this.setArguments(args);
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, this.computeBGDescript);
  }
}
