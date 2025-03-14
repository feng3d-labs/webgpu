import { anyEmitter } from "@feng3d/event";
import { RenderPass } from "@feng3d/render-api";
import { ComputePass } from "../data/ComputePass";
import { TimestampQuery } from "../data/TimestampQuery";
import { GPUQueue_submit } from "../eventnames";

export function getGPURenderTimestampQuery(device: GPUDevice, timestampQuery?: TimestampQuery): GPURenderTimestampQuery
{
    if (!timestampQuery) return defautGPURenderTimestampQuery;
    let renderTimestampQuery: GPURenderTimestampQuery = timestampQuery["_GPURenderTimestampQuery"];
    if (renderTimestampQuery) return renderTimestampQuery;
    
    // 判断是否支持 `timestamp-query`
    if (timestampQuery["isSupports"] === undefined)
    {
        timestampQuery["isSupports"] = device.features.has(`timestamp-query`);
        timestampQuery.onSupports?.(timestampQuery["isSupports"]);
    }
    if (!timestampQuery["isSupports"])
    {
        console.warn(`WebGPU未开启或者不支持 timestamp-query 特性，请确认 WebGPU.init 初始化参数是否正确！`);

        return defautGPURenderTimestampQuery;
    }

    let querySet: GPUQuerySet;

    // Create a buffer where to store the result of GPU queries
    const timestampByteSize = 8; // timestamps are uint64
    let resolveBuf: GPUBuffer;

    // Create a buffer to map the result back to the CPU
    let resultBuf: GPUBuffer;

    /**
     * 初始化。
     *
     * 在渲染通道描述上设置 occlusionQuerySet 。
     *
     * @param device
     * @param passDescriptor
     */
    const init = (device: GPUDevice, passDescriptor: GPURenderPassDescriptor | GPUComputePassDescriptor) =>
    {
        querySet = querySet || device.createQuerySet({ type: "timestamp", count: 2 });

        passDescriptor.timestampWrites = {
            querySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
        };
    };

    const resolve = (device: GPUDevice, commandEncoder: GPUCommandEncoder) =>
    {
        resolveBuf = resolveBuf || device.createBuffer({
            size: 2 * timestampByteSize,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE,
        });

        // After the end of the measured render pass, we resolve queries into a
        // dedicated buffer.
        commandEncoder.resolveQuerySet(
            querySet,
            0 /* firstQuery */,
            querySet.count /* queryCount */,
            resolveBuf,
            0 /* destinationOffset */
        );

        // Create a buffer to map the result back to the CPU
        resultBuf = resultBuf || device.createBuffer({
            size: resolveBuf.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        if (resultBuf.mapState === "unmapped")
        {
            // Copy values to the mappable buffer
            commandEncoder.copyBufferToBuffer(
                resolveBuf,
                0,
                resultBuf,
                0,
                resultBuf.size
            );
        }

        const getQueryResult = () =>
        {
            if (resultBuf.mapState === "unmapped")
            {
                resultBuf.mapAsync(GPUMapMode.READ).then(() =>
                {
                    const timestamps = new BigUint64Array(resultBuf.getMappedRange());

                    // Subtract the begin time from the end time.
                    // Cast into number. Number can be 9007199254740991 as max integer
                    // which is 109 days of nano seconds.
                    const elapsedNs = Number(timestamps[1] - timestamps[0]);
                    // It's possible elapsedNs is negative which means it's invalid
                    // (see spec https://gpuweb.github.io/gpuweb/#timestamp)
                    if (elapsedNs >= 0)
                    {
                        timestampQuery.onQuery(elapsedNs);
                    }

                    resultBuf.unmap();

                    //
                    anyEmitter.off(device.queue, GPUQueue_submit, getQueryResult);
                });
            }
        };

        // 监听提交WebGPU事件
        anyEmitter.on(device.queue, GPUQueue_submit, getQueryResult);
    };

    timestampQuery["_GPURenderTimestampQuery"] = renderTimestampQuery = { init, resolve };

    return renderTimestampQuery;
}

interface GPURenderTimestampQuery
{
    init: (device: GPUDevice, passDescriptor: GPURenderPassDescriptor | GPUComputePassDescriptor) => void
    resolve: (device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass | ComputePass) => void
}

const defautGPURenderTimestampQuery = { init: () => { }, resolve: () => { } };