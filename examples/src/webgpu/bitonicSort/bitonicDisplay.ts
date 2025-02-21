import { IBufferBinding, CommandEncoder, IRenderPassDescriptor, IUniforms } from "@feng3d/render-api";

import bitonicDisplay from "./bitonicDisplay.frag.wgsl";
import { Base2DRendererClass } from "./utils";

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

        const fragment_uniforms: IBufferBinding = {
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

    startRun(commandEncoder: CommandEncoder, args: BitonicDisplayRenderArgs)
    {
        this.setArguments(args);
        super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, this.computeBGDescript);
    }
}
