import { anyEmitter } from '@feng3d/event';
import { reactive } from '@feng3d/reactivity';
import { OcclusionQuery, RenderPass } from '@feng3d/render-api';
import { GPUQueue_submit } from '../eventnames';
import { ReactiveObject } from '../ReactiveObject';

export class WGPUQuerySet extends ReactiveObject
{
    readonly gpuQuerySet: GPUQuerySet

    constructor(device: GPUDevice, renderPass: RenderPass)
    {
        super();

        this._onCreate(device, renderPass);
        this._onMap(device, renderPass);
    }

    private _onCreate(device: GPUDevice, renderPass: RenderPass)
    {
        const _this = reactive(this);

        const occlusionQuerys = renderPass.renderPassObjects?.filter((v) => v.__type__ === 'OcclusionQuery') as OcclusionQuery[];

        if (!occlusionQuerys || occlusionQuerys.length === 0) return;
        const occlusionQuerySet = device.createQuerySet({ type: 'occlusion', count: occlusionQuerys.length });
        const resolveBuf = device.createBuffer({
            label: 'resolveBuffer',
            // Query results are 64bit unsigned integers.
            size: occlusionQuerys.length * BigUint64Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });
        const resultBuf = device.createBuffer({
            label: 'resultBuffer',
            size: resolveBuf.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        //
        occlusionQuerySet.resolve = (commandEncoder: GPUCommandEncoder) =>
        {
            if (occlusionQuerys.length === 0) return;

            commandEncoder.resolveQuerySet(occlusionQuerySet, 0, occlusionQuerys.length, resolveBuf, 0);

            if (resultBuf.mapState === 'unmapped')
            {
                commandEncoder.copyBufferToBuffer(resolveBuf, 0, resultBuf, 0, resultBuf.size);
            }

            const getOcclusionQueryResult = () =>
            {
                if (resultBuf.mapState === 'unmapped')
                {
                    resultBuf.mapAsync(GPUMapMode.READ).then(() =>
                    {
                        const bigUint64Array = new BigUint64Array(resultBuf.getMappedRange());

                        const results = bigUint64Array.reduce((pv: number[], cv) =>
                        {
                            pv.push(Number(cv));

                            return pv;
                        }, []);

                        resultBuf.unmap();

                        occlusionQuerys.forEach((v, i) =>
                        {
                            v.onQuery?.(results[i]);
                        });

                        renderPass.onOcclusionQuery?.(occlusionQuerys, results);

                        //
                        anyEmitter.off(device.queue, GPUQueue_submit, getOcclusionQueryResult);
                    });
                }
            };

            // 监听提交WebGPU事件
            anyEmitter.on(device.queue, GPUQueue_submit, getOcclusionQueryResult);
        };

        _this.gpuQuerySet = occlusionQuerySet;
    }

    private _onMap(device: GPUDevice, renderPass: RenderPass)
    {
        device.querySets ??= new WeakMap<RenderPass, WGPUQuerySet>();
        device.querySets.set(renderPass, this);
        this.destroyCall(() => { device.querySets.delete(renderPass); });
    }

    static getInstance(device: GPUDevice, renderPass: RenderPass)
    {
        return device.querySets?.get(renderPass) || new WGPUQuerySet(device, renderPass);
    }
}

declare global
{
    interface GPUDevice
    {
        querySets: WeakMap<RenderPass, WGPUQuerySet>;
    }
}