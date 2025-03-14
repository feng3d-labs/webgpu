import { anyEmitter } from "@feng3d/event";
import { RenderPassObject, OcclusionQuery, RenderPass } from "@feng3d/render-api";

import { GPUQueue_submit } from "../eventnames";

export function getGPURenderOcclusionQuery(renderObjects?: readonly RenderPassObject[]): GPURenderOcclusionQuery
{
    if (!renderObjects) return defautRenderOcclusionQuery;
    let renderOcclusionQuery: GPURenderOcclusionQuery = renderObjects["_GPURenderOcclusionQuery"];
    if (renderOcclusionQuery) return renderOcclusionQuery;

    const occlusionQuerys: OcclusionQuery[] = renderObjects.filter((cv) => cv.__type__ === "OcclusionQuery") as any;
    if (occlusionQuerys.length === 0)
    {
        renderObjects["_GPURenderOcclusionQuery"] = defautRenderOcclusionQuery;

        return defautRenderOcclusionQuery;
    }

    let occlusionQuerySet: GPUQuerySet;
    let resolveBuf: GPUBuffer;
    let resultBuf: GPUBuffer;

    /**
     * 初始化。
     *
     * 在渲染通道描述上设置 occlusionQuerySet 。
     *
     * @param device
     * @param renderPassDescriptor
     */
    const init = (device: GPUDevice, renderPassDescriptor: GPURenderPassDescriptor) =>
    {
        occlusionQuerySet = renderPassDescriptor.occlusionQuerySet = device.createQuerySet({ type: "occlusion", count: occlusionQuerys.length });
    };

    const getQueryIndex = (occlusionQuery: OcclusionQuery) =>
    {
        return occlusionQuerys.indexOf(occlusionQuery);
    };

    /**
     * 查询结果。
     *
     * @param device
     * @param commandEncoder
     * @param renderPass
     */
    const resolve = (device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass) =>
    {
        resolveBuf = resolveBuf || device.createBuffer({
            label: "resolveBuffer",
            // Query results are 64bit unsigned integers.
            size: occlusionQuerys.length * BigUint64Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });

        commandEncoder.resolveQuerySet(occlusionQuerySet, 0, occlusionQuerys.length, resolveBuf, 0);

        resultBuf = resultBuf || device.createBuffer({
            label: "resultBuffer",
            size: resolveBuf.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

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

    renderObjects["_GPURenderOcclusionQuery"] = renderOcclusionQuery = { init, resolve, getQueryIndex };

    return renderOcclusionQuery;
}

export interface GPURenderOcclusionQuery
{
    init: (device: GPUDevice, renderPassDescriptor: GPURenderPassDescriptor) => void
    getQueryIndex: (occlusionQuery: OcclusionQuery) => number;
    resolve: (device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass) => void
}

const defautRenderOcclusionQuery = { init: () => { }, getQueryIndex: () => 0, resolve: () => { } };