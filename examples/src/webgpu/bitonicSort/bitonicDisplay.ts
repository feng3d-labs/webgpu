import { Base2DRendererClass } from "./utils1";

import bitonicDisplay from "./bitonicDisplay.frag.wgsl";

import { ICommandEncoder, IRenderPassDescriptor, IUniforms } from "@feng3d/render-api";
import { IGPUBufferBinding } from "@feng3d/webgpu";

interface BitonicDisplayRenderArgs
{
    highlight: number;
}

export default class BitonicDisplayRenderer extends Base2DRendererClass
{
    switchBindGroup: (name: string) => void;
    setArguments: (args: BitonicDisplayRenderArgs) => void;
    computeBGDescript: IUniforms;

    constructor(
        renderPassDescriptor: IRenderPassDescriptor,
        computeBGDescript: IUniforms,
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
            fragment_uniforms.highlight = args.highlight;
        };
    }

    startRun(commandEncoder: ICommandEncoder, args: BitonicDisplayRenderArgs)
    {
        this.setArguments(args);
        super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, this.computeBGDescript);
    }
}
