import { IBuffer } from "../data/IBuffer";
import { IGPUBuffer } from "../data/IGPUBuffer";

const defaultGPUBufferUsage = (GPUBufferUsage.VERTEX | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX);

/**
 * 获取GPU缓冲区描述。
 *
 * @param buffer 缓冲区描述。
 * @returns GPU缓冲区描述。
 */
export function getIGPUBuffer(buffer: IBuffer)
{
    if (buffer.size === undefined)
    {
        const bufferData = buffer.data;
        console.assert(!!bufferData, `初始化缓冲区时，当尺寸未定义时，必须设置data属性来计算尺寸。`);
        buffer.size = bufferData.byteLength;
        // 调整为 4 的倍数，在 mapped 时必须为 4 的倍数。
        buffer.size = Math.ceil(buffer.size / 4) * 4;
    }

    buffer.usage = buffer.usage ?? defaultGPUBufferUsage;

    return buffer as IGPUBuffer;
}
