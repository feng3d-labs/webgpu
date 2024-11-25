import { anyEmitter } from "@feng3d/event";
import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderOcclusionQueryObject } from "../data/IGPURenderOcclusionQueryObject";
import { IGPURenderPass } from "../data/IGPURenderPass";
import { GPUQueue_submit } from "../eventnames";

export function getGPURenderOcclusionQuery(renderObjects?: (IGPURenderOcclusionQueryObject | IGPURenderObject | IGPURenderBundleObject)[])
{
    const occlusionQueryObjects: IGPURenderOcclusionQueryObject[] = renderObjects?.filter((cv) => (cv as IGPURenderOcclusionQueryObject).type === "OcclusionQueryObject") as any;
    if (occlusionQueryObjects.length == 0) return null;

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

                    renderPass.occlusionQueryResults = occlusionQueryObjects;

                    //
                    anyEmitter.off(device.queue, GPUQueue_submit, getOcclusionQueryResult);
                });
            }
        };

        // 监听提交WebGPU事件
        anyEmitter.on(device.queue, GPUQueue_submit, getOcclusionQueryResult);
    };

    return { init, queryResult };
}