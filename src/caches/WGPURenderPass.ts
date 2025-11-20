import { Computed, computed, reactive } from '@feng3d/reactivity';
import { ChainMap, OcclusionQuery, RenderObject, RenderPass, RenderPassDescriptor, RenderPassObject } from '@feng3d/render-api';
import { RenderBundle } from '../data/RenderBundle';
import { runOcclusionQuery } from '../internal/runOcclusionQuery';
import { runRenderBundle } from '../internal/runRenderBundle';
import { runRenderObject } from '../internal/runRenderObject';
import { ReactiveObject } from '../ReactiveObject';
import { WGPURenderPassDescriptor } from './WGPURenderPassDescriptor';
import { WGPURenderPassEncoder } from './WGPURenderPassEncoder';

export class WGPURenderPass extends ReactiveObject
{
    get commands() { return this._computedCommands.value; }
    private _computedCommands: Computed<WGPURenderPassEncoder>;

    constructor(device: GPUDevice, renderPass: RenderPass, defaultRenderPassDescriptor?: RenderPassDescriptor)
    {
        super();
        this._onCreate(device, renderPass, defaultRenderPassDescriptor);

        //
        WGPURenderPass.map.set([device, renderPass, defaultRenderPassDescriptor], this);
        this.destroyCall(() => { WGPURenderPass.map.delete([device, renderPass, defaultRenderPassDescriptor]); });
    }

    private _onCreate(device: GPUDevice, renderPass: RenderPass, defaultRenderPassDescriptor?: RenderPassDescriptor)
    {
        const r_renderPass = reactive(renderPass);

        this._computedCommands = computed(() =>
        {
            r_renderPass.descriptor;
            const descriptor = renderPass.descriptor || defaultRenderPassDescriptor;
            const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, descriptor);
            const renderPassFormat = wgpuRenderPassDescriptor.renderPassFormat;

            const r_descriptor = reactive(descriptor);

            r_descriptor.attachmentSize;
            const attachmentSize = descriptor.attachmentSize;

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

    static getInstance(device: GPUDevice, renderPass: RenderPass, defaultRenderPassDescriptor?: RenderPassDescriptor)
    {
        return this.map.get([device, renderPass, defaultRenderPassDescriptor]) || new WGPURenderPass(device, renderPass, defaultRenderPassDescriptor);
    }

    private static readonly map = new ChainMap<[GPUDevice, RenderPass, RenderPassDescriptor], WGPURenderPass>();
}