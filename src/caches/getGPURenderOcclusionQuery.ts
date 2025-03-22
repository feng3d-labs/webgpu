import { anyEmitter } from "@feng3d/event";
import { OcclusionQuery, RenderPass } from "@feng3d/render-api";

import { GPUQueue_submit } from "../eventnames";

export class GPURenderOcclusionQuery
{
    occlusionQuerySet: GPUQuerySet;
    occlusionQuerys: OcclusionQuery[];
    device: GPUDevice;

    resolveBuf: GPUBuffer;

    resultBuf: GPUBuffer;

    querylength: number;

    init(device: GPUDevice, renderPassDescriptor: GPURenderPassDescriptor, _occlusionQuerys: OcclusionQuery[])
    {
        this.occlusionQuerys = _occlusionQuerys;
        if (this.occlusionQuerys.length === 0)
        {
            renderPassDescriptor.occlusionQuerySet = undefined;
            return;
        }
        this.device = device;
        //
        const querylength = this.occlusionQuerys.length;
        if (this.querylength !== querylength)
        {
            //
            this.occlusionQuerySet?.destroy();
            this.resolveBuf?.destroy();
            this.resultBuf?.destroy();
            this.occlusionQuerySet = null;
            this.resolveBuf = null;
            this.resultBuf = null;
            //
            this.querylength = querylength;
        }

        this.occlusionQuerySet = renderPassDescriptor.occlusionQuerySet = device.createQuerySet({ type: "occlusion", count: querylength });
        this.resolveBuf = device.createBuffer({
            label: "resolveBuffer",
            // Query results are 64bit unsigned integers.
            size: querylength * BigUint64Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });
        this.resultBuf = device.createBuffer({
            label: "resultBuffer",
            size: this.resolveBuf.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

    }

    /**
     * 查询结果。
     *
     * @param device
     * @param commandEncoder
     * @param renderPass
     */
    resolve(commandEncoder: GPUCommandEncoder, renderPass: RenderPass)
    {
        if (this.occlusionQuerys.length === 0) return;

        const { device, occlusionQuerys, occlusionQuerySet, resolveBuf, resultBuf } = this;

        commandEncoder.resolveQuerySet(occlusionQuerySet, 0, occlusionQuerys.length, resolveBuf, 0);

        if (resultBuf.mapState === "unmapped")
        {
            commandEncoder.copyBufferToBuffer(resolveBuf, 0, resultBuf, 0, resultBuf.size);
        }

        const getOcclusionQueryResult = () =>
        {
            if (resultBuf.mapState === "unmapped")
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
}
