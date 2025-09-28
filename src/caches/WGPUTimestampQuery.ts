import { anyEmitter } from '@feng3d/event';
import { reactive } from '@feng3d/reactivity';
import { TimestampQuery } from '../data/TimestampQuery';
import { GPUQueue_submit } from '../eventnames';
import { ReactiveObject } from '../ReactiveObject';

declare global
{
    interface GPURenderPassTimestampWrites
    {
        resolve?: (commandEncoder: GPUCommandEncoder) => void;
    }
    interface GPUComputePassTimestampWrites
    {
        resolve?: (commandEncoder: GPUCommandEncoder) => void;
    }
}

export class WGPUTimestampQuery extends ReactiveObject
{
    readonly gpuPassTimestampWrites: GPURenderPassTimestampWrites | GPUComputePassTimestampWrites;

    constructor(device: GPUDevice, timestampQuery?: TimestampQuery)
    {
        super();

        this._createGPUPassTimestampWrites(device, timestampQuery);

        this._onMap(device, timestampQuery);

    }

    private _createGPUPassTimestampWrites(device: GPUDevice, timestampQuery: TimestampQuery)
    {
        const querySet = device.createQuerySet({ type: 'timestamp', count: 2 });

        // Create a buffer where to store the result of GPU queries
        const timestampByteSize = 8; // timestamps are uint64
        let resolveBuf: GPUBuffer;

        // Create a buffer to map the result back to the CPU
        let resultBuf: GPUBuffer;

        const destroy = () =>
        {
            resolveBuf?.destroy();
            resultBuf?.destroy();

            reactive(this).gpuPassTimestampWrites = null;
        };

        let needResolve = false;
        const resolve = (commandEncoder: GPUCommandEncoder) =>
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
                0, /* destinationOffset */
            );

            // Create a buffer to map the result back to the CPU
            resultBuf = resultBuf || device.createBuffer({
                size: resolveBuf.size,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            });

            if (resultBuf.mapState === 'unmapped')
            {
                // Copy values to the mappable buffer
                commandEncoder.copyBufferToBuffer(
                    resolveBuf,
                    0,
                    resultBuf,
                    0,
                    resultBuf.size,
                );
                needResolve = true;
            }
        };

        this.effect(() =>
        {
            const timestampWrites: GPURenderPassTimestampWrites | GPUComputePassTimestampWrites = {
                querySet,
                beginningOfPassWriteIndex: 0,
                endOfPassWriteIndex: 1,
                resolve,
            };

            reactive(this).gpuPassTimestampWrites = timestampWrites;
        });

        const getQueryResult = () =>
        {
            if (!needResolve) return;

            needResolve = false;

            if (resultBuf.mapState === 'unmapped')
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
                        reactive(timestampQuery).result = { elapsedNs };
                    }

                    resultBuf.unmap();

                    //
                    anyEmitter.off(device.queue, GPUQueue_submit, getQueryResult);
                });
            }
        };

        // 监听提交WebGPU事件
        anyEmitter.on(device.queue, GPUQueue_submit, getQueryResult);

        this.effect(() =>
        {



        });

        //
        this.destroyCall(destroy);
    }

    private _onMap(device: GPUDevice, timestampQuery?: TimestampQuery)
    {
        device.timestampQueries ??= new WeakMap<TimestampQuery, WGPUTimestampQuery>();
        device.timestampQueries.set(timestampQuery, this);
        this.destroyCall(() => { device.timestampQueries.delete(timestampQuery); });
    }

    public static getInstance(device: GPUDevice, timestampQuery: TimestampQuery)
    {
        if (!timestampQuery) return null;

        // 判断是否支持 `timestamp-query`
        if (timestampQuery.isSupports === undefined)
        {
            reactive(timestampQuery).isSupports = device.features.has(`timestamp-query`);
        }
        if (!timestampQuery.isSupports)
        {
            console.warn(`WebGPU未开启或者不支持 timestamp-query 特性，请确认 WebGPU.init 初始化参数是否正确！`);
            return null;
        }

        return device.timestampQueries?.get(timestampQuery) || new WGPUTimestampQuery(device, timestampQuery);
    }
}

declare global
{
    interface GPUDevice
    {
        timestampQueries: WeakMap<TimestampQuery, WGPUTimestampQuery>;
    }
}