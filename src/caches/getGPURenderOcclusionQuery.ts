import { anyEmitter } from "@feng3d/event";
import { IGPUOcclusionQueryObject } from "../data/IGPUOcclusionQueryObject";
import { IGPURenderPass, IGPURenderPassObject } from "../data/IGPURenderPass";
import { GPUQueue_submit } from "../eventnames";

export function getGPURenderOcclusionQuery(renderObjects?: IGPURenderPassObject[])
{
    if (!renderObjects) return undefined;
    let renderOcclusionQuery: GPURenderOcclusionQuery = renderObjects["_GPURenderOcclusionQuery"];
    if (renderOcclusionQuery) return renderOcclusionQuery;

    const occlusionQueryObjects: IGPUOcclusionQueryObject[] = renderObjects.filter((cv) => cv.__type === "IGPUOcclusionQueryObject") as any;
    if (occlusionQueryObjects.length == 0)
    {
        renderObjects["_GPURenderOcclusionQuery"] = defautRenderOcclusionQuery;

        return defautRenderOcclusionQuery;
    }

    occlusionQueryObjects.forEach((v, i) => { v._queryIndex = i; })

    let occlusionQuerySet: GPUQuerySet;

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
        occlusionQuerySet = renderPassDescriptor.occlusionQuerySet = device.createQuerySet({ type: 'occlusion', count: occlusionQueryObjects.length });
    };

    /**
     * 查询结果。
     * 
     * @param device 
     * @param commandEncoder 
     * @param renderPass 
     */
    const queryResult = (device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPass) =>
    {
        const resolveBuf: GPUBuffer = renderPass["resolveBuffer"] = renderPass["resolveBuffer"] || device.createBuffer({
            label: 'resolveBuffer',
            // Query results are 64bit unsigned integers.
            size: occlusionQueryObjects.length * BigUint64Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });

        commandEncoder.resolveQuerySet(occlusionQuerySet, 0, occlusionQueryObjects.length, resolveBuf, 0);

        const resultBuf = renderPass["resultBuffer"] = renderPass["resultBuffer"] || device.createBuffer({
            label: 'resultBuffer',
            size: resolveBuf.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

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
                    const results = new BigUint64Array(resultBuf.getMappedRange());

                    occlusionQueryObjects.forEach((v, i) =>
                    {
                        v.result = results[i] as any;
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

    renderObjects["_GPURenderOcclusionQuery"] = renderOcclusionQuery = { init, queryResult };

    return renderOcclusionQuery;
}

interface GPURenderOcclusionQuery
{
    init: (device: GPUDevice, renderPassDescriptor: GPURenderPassDescriptor) => void
    queryResult: (device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPass) => void
}

const defautRenderOcclusionQuery = { init: () => { }, queryResult: () => { } };