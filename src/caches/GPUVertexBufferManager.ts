import { computed, Computed, reactive } from "@feng3d/reactivity";
import { ChainMap, VertexAttribute, VertexAttributes, VertexDataTypes, vertexFormatMap, VertexState } from "@feng3d/render-api";
import { VertexBuffer } from "../internal/VertexBuffer";
import { getVertexEntryFunctionInfo } from "./getVertexEntryFunctionInfo";

export class GPUVertexBufferManager
{

    public static getGPUVertexBufferLayouts(vertexState: VertexState, vertices: VertexAttributes)
    {
        const result = computed(() =>
        {
            const { vertexBufferLayouts } = GPUVertexBufferManager.getVertexBuffersBuffers(vertexState, vertices);

            return vertexBufferLayouts;
        });

        return result.value;
    }

    public static getNVertexBuffers(vertexState: VertexState, vertices: VertexAttributes)
    {
        let _vertexBuffers: VertexBuffer[];
        const result = computed(() =>
        {
            const { vertexBuffers } = GPUVertexBufferManager.getVertexBuffersBuffers(vertexState, vertices);

            if (_vertexBuffers && _vertexBuffers.length === vertexBuffers.length && _vertexBuffers.every((v, i) => v === vertexBuffers[i]))
            {
                return _vertexBuffers;
            }
            _vertexBuffers = vertexBuffers;

            return vertexBuffers;
        });

        return result.value;
    }


    /**
     * 从顶点属性信息与顶点数据中获取顶点缓冲区布局数组以及顶点缓冲区数组。
     *
     * @param vertices 顶点数据。
     * @returns 顶点缓冲区布局数组以及顶点缓冲区数组。
     */
    private static getVertexBuffersBuffers(vertexState: VertexState, vertices: VertexAttributes)
    {
        const getVertexBuffersBuffersKey: GetVertexBuffersBuffersKey = [vertexState, vertices];
        let result = GPUVertexBufferManager.getVertexBuffersBuffersMap.get(getVertexBuffersBuffersKey);
        if (result) return result.value;

        result = computed(() =>
        {
            const vertexEntryFunctionInfo = getVertexEntryFunctionInfo(vertexState);
            // 监听
            const r_vertices = vertices && reactive(vertices);
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
            const vertexBuffers: VertexBuffer[] = [];
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

                    vertexBuffers[index] = GPUVertexBufferManager.getVertexBuffers(vertexAttribute);

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
            const vertexBufferLayoutsKey = vertexBufferLayouts.reduce((prev, cur) => prev + cur.key, "");
            GPUVertexBufferManager.vertexBufferLayoutsMap[vertexBufferLayoutsKey] ??= vertexBufferLayouts;

            return { vertexBufferLayouts: GPUVertexBufferManager.vertexBufferLayoutsMap[vertexBufferLayoutsKey], vertexBuffers };
        });

        GPUVertexBufferManager.getVertexBuffersBuffersMap.set(getVertexBuffersBuffersKey, result);

        return result.value;
    }

    private static readonly vertexBufferLayoutsMap: Record<string, GPUVertexBufferLayout[]> = {};

    private static getVertexBuffers(vertexAttribute: VertexAttribute)
    {
        let result = GPUVertexBufferManager.getVertexBuffersMap.get(vertexAttribute);
        if (result) return result.value;
        const vertexBuffer: VertexBuffer = {} as any;
        const r_vertexBuffer = reactive(vertexBuffer);
        result = computed(() =>
        {
            // 监听
            reactive(vertexAttribute).data;

            //
            const data = vertexAttribute.data;
            // 修改数据并通知更新
            r_vertexBuffer.data = data;
            r_vertexBuffer.offset = data.byteOffset;
            r_vertexBuffer.size = data.byteLength;

            return vertexBuffer;
        });
        GPUVertexBufferManager.getVertexBuffersMap.set(vertexAttribute, result);

        return result.value;
    }
    private static readonly getVertexBuffersMap = new WeakMap<VertexAttribute, Computed<VertexBuffer>>();
    private static readonly getVertexBuffersBuffersMap = new ChainMap<GetVertexBuffersBuffersKey, Computed<{ vertexBufferLayouts: GPUVertexBufferLayout[], vertexBuffers: VertexBuffer[] }>>();
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

type GetVertexBuffersBuffersKey = [vertexState: VertexState, vertices: VertexAttributes];