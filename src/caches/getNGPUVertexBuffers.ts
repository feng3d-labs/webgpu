import { ChainMap, VertexAttributes, VertexDataTypes, vertexFormatMap, VertexState } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { NVertexBuffer } from "../internal/NGPUVertexBuffer";
import { getVertexEntryFunctionInfo } from "./getVertexEntryFunctionInfo";

export function getGPUVertexBufferLayouts(vertexState: VertexState, vertices: VertexAttributes)
{
    const { vertexBufferLayouts } = getVertexBuffersBuffers(vertexState, vertices);
    return vertexBufferLayouts;
}

export function getNVertexBuffers(vertexState: VertexState, vertices: VertexAttributes)
{
    const { vertexBuffers } = getVertexBuffersBuffers(vertexState, vertices);
    return vertexBuffers;
}

/**
 * 从顶点属性信息与顶点数据中获取顶点缓冲区布局数组以及顶点缓冲区数组。
 *
 * @param vertices 顶点数据。
 * @returns 顶点缓冲区布局数组以及顶点缓冲区数组。
 */
function getVertexBuffersBuffers(vertexState: VertexState, vertices: VertexAttributes)
{
    let result = _getVertexBuffersBuffersMap.get([vertexState, vertices]);
    if (result) return result;

    const vertexEntryFunctionInfo = getVertexEntryFunctionInfo(vertexState);

    const vertexBufferLayouts: GPUVertexBufferLayout[] = [];

    const vertexBuffers: NVertexBuffer[] = [];

    const bufferIndexMap = new Map<VertexDataTypes, number>();

    vertexEntryFunctionInfo.inputs.forEach((inputInfo) =>
    {
        // 跳过内置属性。
        if (inputInfo.locationType === "builtin") return;

        const shaderLocation = inputInfo.location as number;
        const attributeName = inputInfo.name;

        const vertexAttribute = vertices[attributeName];
        console.assert(!!vertexAttribute, `在提供的顶点属性数据中未找到 ${attributeName} 。`);
        //
        const data = vertexAttribute.data;
        const attributeOffset = vertexAttribute.offset || 0;
        let arrayStride = vertexAttribute.arrayStride;
        const stepMode = vertexAttribute.stepMode;
        const format = vertexAttribute.format;
        // 检查提供的顶点数据格式是否与着色器匹配
        // const wgslType = getWGSLType(v.type);
        // let possibleFormats = wgslVertexTypeMap[wgslType].possibleFormats;
        // console.assert(possibleFormats.indexOf(format) !== -1, `顶点${attributeName} 提供的数据格式 ${format} 与着色器中类型 ${wgslType} 不匹配！`);
        console.assert(data.constructor.name === vertexFormatMap[format].typedArrayConstructor.name,
            `顶点${attributeName} 提供的数据类型 ${data.constructor.name} 与格式 ${format} 不匹配！请使用 ${data.constructor.name} 来组织数据或者更改数据格式。`);

        // 如果 偏移值大于 单个顶点尺寸，则该值被放入 IGPUVertexBuffer.offset。
        const vertexByteSize = vertexFormatMap[format].byteSize;
        //
        if (!arrayStride)
        {
            arrayStride = vertexByteSize;
        }
        console.assert(attributeOffset + vertexByteSize <= arrayStride, `offset(${attributeOffset}) + vertexByteSize(${vertexByteSize}) 必须不超出 arrayStride(${arrayStride})。`);

        watcher.watch(vertexAttribute, "data", () =>
        {
            const index = bufferIndexMap.get(data);
            const attributeData = vertexAttribute.data;

            vertexBuffers[index].data = attributeData;
            vertexBuffers[index].offset = attributeData.byteOffset;
            vertexBuffers[index].size = attributeData.byteLength;
        });

        let index = bufferIndexMap.get(data);
        if (index === undefined)
        {
            index = vertexBufferLayouts.length;
            bufferIndexMap.set(data, index);

            vertexBuffers[index] = { data, offset: data.byteOffset, size: data.byteLength };

            //
            vertexBufferLayouts[index] = { stepMode, arrayStride, attributes: [] };
        }
        else
        {
            // 要求同一顶点缓冲区中 arrayStride 与 stepMode 必须相同。
            const gpuVertexBufferLayout = vertexBufferLayouts[index];
            console.assert(gpuVertexBufferLayout.arrayStride === arrayStride);
            console.assert(gpuVertexBufferLayout.stepMode === stepMode);
        }

        (vertexBufferLayouts[index].attributes as Array<GPUVertexAttribute>).push({ shaderLocation, offset: attributeOffset, format });
    });

    result = { vertexBufferLayouts, vertexBuffers };
    _getVertexBuffersBuffersMap.set([vertexState, vertices], result);

    return result;
}

const _getVertexBuffersBuffersMap = new ChainMap<[VertexState, VertexAttributes], { vertexBufferLayouts: GPUVertexBufferLayout[], vertexBuffers: NVertexBuffer[] }>();