import { ChainMap, computed, ComputedRef, reactive, VertexAttribute, VertexAttributes, VertexDataTypes, vertexFormatMap, VertexState } from "@feng3d/render-api";
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

declare global
{
    interface GPUVertexBufferLayout
    {
        /**
         * 用于判断是否为相同的顶点缓冲区布局。
         */
        key: string;
    }
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
    if (result) return result.value;

    result = computed(() =>
    {
        const vertexEntryFunctionInfo = getVertexEntryFunctionInfo(vertexState);
        // 监听
        const r_vertices = reactive(vertices);
        vertexEntryFunctionInfo.inputs.forEach((inputInfo) =>
        {
            // 跳过内置属性。
            if (inputInfo.locationType === "builtin") return;
            // 监听每个顶点属性数据。
            const vertexAttribute = r_vertices[inputInfo.name];
            if (vertexAttribute)
            {
                vertexAttribute.arrayStride;
                vertexAttribute.format;
                vertexAttribute.offset;
                vertexAttribute.stepMode;
            }
        });

        // 计算
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
            const stepMode = vertexAttribute.stepMode ?? "vertex";
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

            let index = bufferIndexMap.get(data);
            let gpuVertexBufferLayout: GPUVertexBufferLayout;
            if (index === undefined)
            {
                index = vertexBufferLayouts.length;
                bufferIndexMap.set(data, index);

                vertexBuffers[index] = getVertexBuffers(vertexAttribute);

                //
                gpuVertexBufferLayout = vertexBufferLayouts[index] = { stepMode, arrayStride, attributes: [], key: `${stepMode}-${arrayStride}` };
            }
            else
            {
                gpuVertexBufferLayout = vertexBufferLayouts[index];
                if (__DEV__)
                {
                    console.assert(vertexBufferLayouts[index].arrayStride === arrayStride && vertexBufferLayouts[index].stepMode === stepMode, "要求同一顶点缓冲区中 arrayStride 与 stepMode 必须相同。");
                }
            }

            (gpuVertexBufferLayout.attributes as Array<GPUVertexAttribute>).push({ shaderLocation, offset: attributeOffset, format });
            gpuVertexBufferLayout.key += `-[${shaderLocation}, ${attributeOffset}, ${format}]`;
        });

        // 相同的顶点缓冲区布局合并为一个。
        const vertexBufferLayoutsKey = vertexBufferLayouts.reduce((prev, cur) => { return prev + cur.key }, "");
        vertexBufferLayoutsMap[vertexBufferLayoutsKey] ??= vertexBufferLayouts;

        return { vertexBufferLayouts: vertexBufferLayoutsMap[vertexBufferLayoutsKey], vertexBuffers };
    });

    _getVertexBuffersBuffersMap.set([vertexState, vertices], result);

    return result.value;
}

const vertexBufferLayoutsMap: Record<string, GPUVertexBufferLayout[]> = {};

function getVertexBuffers(vertexAttribute: VertexAttribute)
{
    let result = _NVertexBufferMap.get(vertexAttribute);
    if (result) return result.value;
    const NVertexBuffer: NVertexBuffer = {} as any;
    result = computed(() =>
    {
        // 监听
        reactive(vertexAttribute).data;
        //
        const data = vertexAttribute.data;
        NVertexBuffer.data = data;
        NVertexBuffer.offset = data.byteOffset;
        NVertexBuffer.size = data.byteLength;
        return NVertexBuffer;
    });
    _NVertexBufferMap.set(vertexAttribute, result);
    return result.value;
}
const _NVertexBufferMap = new WeakMap<VertexAttribute, ComputedRef<NVertexBuffer>>();

const _getVertexBuffersBuffersMap = new ChainMap<[VertexState, VertexAttributes], ComputedRef<{ vertexBufferLayouts: GPUVertexBufferLayout[], vertexBuffers: NVertexBuffer[] }>>();