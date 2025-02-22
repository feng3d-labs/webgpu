import { anyEmitter } from "@feng3d/event";
import { RenderPass, IRenderPassObject } from "@feng3d/render-api";

import { IGPUOcclusionQuery } from "../data/IGPUOcclusionQuery";
import { GPUQueue_submit } from "../eventnames";

export function getGPURenderOcclusionQuery(renderObjects?: readonly IRenderPassObject[]): GPURenderOcclusionQuery
{
    if (!renderObjects) return defautRenderOcclusionQuery;
    let renderOcclusionQuery: GPURenderOcclusionQuery = renderObjects["_GPURenderOcclusionQuery"];
    if (renderOcclusionQuery) return renderOcclusionQuery;

    const occlusionQueryObjects: IGPUOcclusionQuery[] = renderObjects.filter((cv) => cv.__type__ === "OcclusionQuery") as any;
    if (occlusionQueryObjects.length === 0)
    {
        renderObjects["_GPURenderOcclusionQuery"] = defautRenderOcclusionQuery;

        return defautRenderOcclusionQuery;
    }

    occlusionQueryObjects.forEach((v, i) => { v._queryIndex = i; });

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
        occlusionQuerySet = renderPassDescriptor.occlusionQuerySet = device.createQuerySet({ type: "occlusion", count: occlusionQueryObjects.length });
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
            size: occlusionQueryObjects.length * BigUint64Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });

        commandEncoder.resolveQuerySet(occlusionQuerySet, 0, occlusionQueryObjects.length, resolveBuf, 0);

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
                    const results = new BigUint64Array(resultBuf.getMappedRange());

                    occlusionQueryObjects.forEach((v, i) =>
                    {
                        v.result = { result: Number(results[i]) };
                    });

                    resultBuf.unmap();

                    renderPass.occlusionQueryResults = occlusionQueryObjects.concat();

                    //
                    anyEmitter.off(device.queue, GPUQueue_submit, getOcclusionQueryResult);
                });
            }
        };

        // 监听提交WebGPU事件
        anyEmitter.on(device.queue, GPUQueue_submit, getOcclusionQueryResult);
    };

    renderObjects["_GPURenderOcclusionQuery"] = renderOcclusionQuery = { init, resolve };

    return renderOcclusionQuery;
}

interface GPURenderOcclusionQuery
{
    init: (device: GPUDevice, renderPassDescriptor: GPURenderPassDescriptor) => void
    resolve: (device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass) => void
}

const defautRenderOcclusionQuery = { init: () => { }, resolve: () => { } };