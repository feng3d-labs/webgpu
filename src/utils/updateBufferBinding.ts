import { UnReadonly } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { VariableInfo } from "wgsl_reflect";
import { getIGPUBuffer } from "../caches/getIGPUBuffer";
import { IGPUBufferBinding } from "../data/IGPUBufferBinding";
import { IBufferBindingInfo, getBufferBindingInfo } from "./getBufferBindingInfo";

/**
 * 初始化缓冲区绑定。
 * 
 * @param variableInfo
 * @param uniformData
 * @returns
 */
export function updateBufferBinding(variableInfo: VariableInfo, uniformData: IGPUBufferBinding)
{
    if (!variableInfo.members)
    {
        return;
    }

    if (uniformData["_variableInfo"] !== undefined)
    {
        const preVariableInfo = uniformData["_variableInfo"] as any as VariableInfo;
        if (preVariableInfo.resourceType !== variableInfo.resourceType
            || preVariableInfo.size !== variableInfo.size
        )
        {
            console.warn(`updateBufferBinding 出现一份数据对应多个 variableInfo`, { uniformData, variableInfo, preVariableInfo });
        }

        // return;
    }
    uniformData["_variableInfo"] = variableInfo as any;

    const size = variableInfo.size;
    // 是否存在默认值。
    const hasDefautValue = !!uniformData.bufferView;
    if (!hasDefautValue)
    {
        (uniformData as UnReadonly<IGPUBufferBinding>).bufferView = new Uint8Array(size);
    }

    const buffer = getIGPUBuffer(uniformData.bufferView);
    (buffer as any).label = buffer.label || (`BufferBinding ${variableInfo.name}`);
    const offset = uniformData.bufferView.byteOffset;

    const bufferBindingInfo: IBufferBindingInfo = variableInfo["_bufferBindingInfo"] ||= getBufferBindingInfo(variableInfo.type);
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
            buffer.writeBuffers = writeBuffers;
        }

        update();
        watcher.watchchain(uniformData, paths.join("."), update, undefined, false);
    }
}
