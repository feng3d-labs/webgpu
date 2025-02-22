import { BufferBinding, CommandEncoder, RenderPassDescriptor, Uniforms } from "@feng3d/render-api";

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
    computeBGDescript: Uniforms;

    constructor(
        renderPassDescriptor: RenderPassDescriptor,
        computeBGDescript: Uniforms,
        label: string
    )
    {
        super();
        this.renderPassDescriptor = renderPassDescriptor;
        this.computeBGDescript = computeBGDescript;

        const fragment_uniforms: BufferBinding = {
            highlight: undefined,
        };

        computeBGDescript.fragment_uniforms = fragment_uniforms;

        this.material = super.create2DRenderPipeline(
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
        super.executeRun(commandEncoder, this.renderPassDescriptor, this.material, this.computeBGDescript);
    }
}
