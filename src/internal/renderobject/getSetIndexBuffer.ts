import { computed, reactive } from "@feng3d/reactivity";
import { Buffer, RenderObject } from "@feng3d/render-api";
import { WGPUBuffer } from "../../caches/WGPUBuffer";

export function getSetIndexBuffer(device: GPUDevice, renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        let setIndexBuffer: [func: 'setIndexBuffer', buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
        // 监听
        r_renderObject.indices;

        //
        const { indices } = renderObject;

        if (!indices)
        {
            setIndexBuffer = null;
        }
        else
        {
            const buffer = Buffer.getBuffer(indices.buffer);

            if (!buffer.label)
            {
                reactive(buffer).label = (`顶点索引 ${autoIndex++}`);
            }

            const gBuffer = WGPUBuffer.getInstance(device, buffer);

            //
            setIndexBuffer = ['setIndexBuffer', gBuffer.gpuBuffer, indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16', indices.byteOffset, indices.byteLength];
        }

        return setIndexBuffer;
    });
}
let autoIndex = 0;
