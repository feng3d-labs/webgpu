import { Computed, computed, reactive } from "@feng3d/reactivity";
import { ChainMap, OcclusionQuery, RenderObject, RenderPass, RenderPassObject } from "@feng3d/render-api";
import { RenderBundle } from "../data/RenderBundle";
import { runOcclusionQuery } from "../internal/runOcclusionQuery";
import { runRenderBundle } from "../internal/runRenderBundle";
import { runRenderObject } from "../internal/runRenderObject";
import { ReactiveObject } from "../ReactiveObject";
import { WGPURenderPassDescriptor } from "./WGPURenderPassDescriptor";
import { WGPURenderPassEncoder } from "./WGPURenderPassEncoder";

export class WGPURenderPass extends ReactiveObject
{
    get commands() { return this._computedCommands.value; }
    private _computedCommands: Computed<WGPURenderPassEncoder>;

    constructor(device: GPUDevice, renderPass: RenderPass)
    {
        super();
        this._onCreate(device, renderPass);

        //
        WGPURenderPass.map.set([device, renderPass], this);
        this.destroyCall(() => { WGPURenderPass.map.delete([device, renderPass]); });
    }

    private _onCreate(device: GPUDevice, renderPass: RenderPass)
    {
        const r_renderPass = reactive(renderPass);

        this._computedCommands = computed(() =>
        {
            r_renderPass.descriptor;
            const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, renderPass.descriptor);
            const renderPassFormat = wgpuRenderPassDescriptor.renderPassFormat;

            r_renderPass.descriptor.attachmentSize;
            const attachmentSize = renderPass.descriptor.attachmentSize;

            const passEncoder = new WGPURenderPassEncoder(device, renderPassFormat, attachmentSize);

            r_renderPass.renderPassObjects.concat();
            renderPass.renderPassObjects.forEach((element) =>
            {
                if (!element.__type__ || element.__type__ === 'RenderObject')
                {
                    runRenderObject(element as RenderObject, passEncoder);
                }
                else if (element.__type__ === 'RenderBundle')
                {
                    runRenderBundle(element as RenderBundle, passEncoder);
                }
                else if (element.__type__ === 'OcclusionQuery')
                {
                    runOcclusionQuery(element as OcclusionQuery, passEncoder);
                }
                else
                {
                    throw `未处理 ${(element as RenderPassObject).__type__} 类型的渲染通道对象！`;
                }
            });

            return passEncoder;
        });
    }

    static getInstance(device: GPUDevice, renderPass: RenderPass)
    {
        return this.map.get([device, renderPass]) || new WGPURenderPass(device, renderPass);
    }
    private static readonly map = new ChainMap<[GPUDevice, RenderPass], WGPURenderPass>();
}