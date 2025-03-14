import { BufferBinding, BufferBindingInfo, reactive, UnReadonly } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { VariableInfo } from "wgsl_reflect";

import { getGBuffer } from "../caches/getIGPUBuffer";

/**
 * 初始化缓冲区绑定。
 *
 * @param variableInfo
 * @param uniformData
 * @returns
 */
export function updateBufferBinding(resourceName: string, bufferBindingInfo: BufferBindingInfo, uniformData: BufferBinding)
{
    if (uniformData["_variableInfo"] !== undefined)
    {
        const preVariableInfo = uniformData["_variableInfo"] as any as VariableInfo;
        if (preVariableInfo.size !== bufferBindingInfo.size)
        {
            console.warn(`updateBufferBinding ${resourceName} 出现一份数据对应多个 variableInfo`, { uniformData, bufferBindingInfo, preVariableInfo });
        }

        return;
    }
    uniformData["_variableInfo"] = bufferBindingInfo as any;

    const size = bufferBindingInfo.size;
    // 是否存在默认值。
    const hasDefautValue = !!uniformData.bufferView;
    if (!hasDefautValue)
    {
        (uniformData as UnReadonly<BufferBinding>).bufferView = new Uint8Array(size);
    }

    const buffer = getGBuffer(uniformData.bufferView);
    const offset = uniformData.bufferView.byteOffset;

    for (let i = 0; i < bufferBindingInfo.items.length; i++)
    {
        const { paths, offset: itemInfoOffset, size: itemInfoSize, Cls } = bufferBindingInfo.items[i];
        const update = () =>
        {
            let value: any = uniformData;
            for (let i = 0; i < paths.length; i++)
            {
                value = value[paths[i]];
                if (value === undefined)
                {
                    if (!hasDefautValue)
                    {
                        console.warn(`没有找到 统一块变量属性 ${paths.join(".")} 的值！`);
                    }

                    return;
                }
            }

            let data: Float32Array | Int32Array | Uint32Array | Int16Array;
            if (typeof value === "number")
            {
                data = new Cls([value]);
            }
            else if (value.constructor.name !== Cls.name)
            {
                data = new Cls(value as ArrayLike<number>);
            }
            else
            {
                data = value as any;
            }

            const writeBuffers = buffer.writeBuffers ?? [];
            writeBuffers.push({ bufferOffset: offset + itemInfoOffset, data: data.buffer, dataOffset: data.byteOffset, size: Math.min(itemInfoSize, data.byteLength) });
            reactive(buffer).writeBuffers = writeBuffers;
        };

        update();
        watcher.watchchain(uniformData, paths.join("."), update, undefined, false);
    }
}
