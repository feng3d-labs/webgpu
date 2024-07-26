import { IGPUVertexBuffer, IGPUVertexState } from 'webgpu-data-driven';

import { watcher } from '@feng3d/watcher';
import { IVertexAttributes } from '../data/IVertexAttributes';
import { IVertexState } from '../data/IVertexState';
import { gpuVertexFormatMap } from '../types/VertexFormat';
import { ChainMap } from '../utils/ChainMap';
import { getIGPUBuffer } from './getIGPUBuffer';
import { WGSLVertexAttributeInfo, getWGSLReflectInfo } from './getWGSLReflectInfo';

/**
 * 获取完整的顶点阶段描述与顶点缓冲区列表。
 *
 * @param vertexState 顶点阶段信息。
 * @param vertices 顶点数据。
 * @returns 完整的顶点阶段描述与顶点缓冲区列表。
 */
export function getIGPUVertexState(vertexState: IVertexState, vertices: IVertexAttributes)
{
    let result = vertexStateMap.get([vertexState, vertices]);
    if (!result)
    {
        const code = vertexState.code;

        // 解析顶点着色器
        const reflect = getWGSLReflectInfo(code);
        //
        let entryPoint = vertexState.entryPoint;
        if (!entryPoint)
        {
            console.assert(reflect.vertexEntryList.length > 0, `WGSL着色器 ${code} 中不存在顶点入口点。`);
            entryPoint = reflect.vertexEntryList[0].entryPoint;
        }
        else
        {
            console.assert(!!reflect.vertexEntryMap[entryPoint], `WGSL着色器 ${code} 中不存在指定顶点入口点 ${entryPoint} 。`);
        }
        //
        const attributeInfos = reflect.vertexEntryMap[entryPoint].attributeInfos;

        const { vertexBufferLayouts, vertexBuffers } = getVertexBuffers(attributeInfos, vertices);

        const gpuVertexState: IGPUVertexState = {
            code,
            entryPoint,
            buffers: vertexBufferLayouts,
        };
        if (vertexState.constants)
        {
            gpuVertexState.constants = vertexState.constants;
        }

        result = { gpuVertexState, vertexBuffers };
        vertexStateMap.set([vertexState, vertices], result);
    }

    return result;
}

const vertexStateMap = new ChainMap<[IVertexState, IVertexAttributes], {
    gpuVertexState: IGPUVertexState;
    vertexBuffers: IGPUVertexBuffer[];
}>();

/**
 * 从顶点属性信息与顶点数据中获取顶点缓冲区布局数组以及顶点缓冲区数组。
 *
 * @param attributeInfos 顶点属性信息。
 * @param vertices 顶点数据。
 * @returns 顶点缓冲区布局数组以及顶点缓冲区数组。
 */
function getVertexBuffers(attributeInfos: WGSLVertexAttributeInfo[], vertices: IVertexAttributes)
{
    const vertexBufferLayouts: GPUVertexBufferLayout[] = [];

    const vertexBuffers: IGPUVertexBuffer[] = [];

    const map: WeakMap<any, number> = new WeakMap();

    attributeInfos.forEach((v) =>
    {
        let format: GPUVertexFormat = v.format;
        const shaderLocation = v.shaderLocation;
        const attributeName = v.name;

        const vertexAttribute = vertices[attributeName];
        console.assert(!!vertexAttribute, `在提供的顶点属性数据中未找到 ${attributeName} 。`);
        let isIGPUVertexBufferOffset = false;
        //
        const data = vertexAttribute.buffer;
        let attributeOffset = vertexAttribute.offset;
        let arrayStride = vertexAttribute.vertexSize;
        const stepMode = vertexAttribute.stepMode;
        //
        if (vertexAttribute.format)
        {
            format = vertexAttribute.format;
        }
        else
        {
            // 根据顶点数据调整 布局中的数据格式。
            if (vertexAttribute.numComponents !== undefined)
            {
                const formats = format.split('x');
                if (vertexAttribute.numComponents > 1)
                {
                    format = [formats[0], vertexAttribute.numComponents].join('x') as any;
                }
                else
                {
                    format = formats[0] as any;
                }
            }
        }

        // 如果 偏移值大于 单个顶点尺寸，则该值被放入 IGPUVertexBuffer.offset。
        const vertexByteSize = gpuVertexFormatMap[format].byteSize;
        if (attributeOffset + vertexByteSize > arrayStride)
        {
            isIGPUVertexBufferOffset = true;
        }

        watcher.watch(vertexAttribute, 'buffer', () =>
        {
            const index = map.get(data);
            const buffer = vertexAttribute.buffer;

            vertexBuffers[index].buffer = getIGPUBuffer(buffer);
        });

        //
        if (!attributeOffset)
        {
            attributeOffset = 0;
        }

        //
        if (!arrayStride)
        {
            arrayStride = gpuVertexFormatMap[format].byteSize;
        }

        let index = map.get(data);
        if (index === undefined)
        {
            index = vertexBufferLayouts.length;
            map.set(data, index);

            const gpuBuffer = getIGPUBuffer(data);

            vertexBuffers[index] = { buffer: gpuBuffer, offset: isIGPUVertexBufferOffset ? attributeOffset : 0 };

            //
            vertexBufferLayouts[index] = { stepMode, arrayStride, attributes: [] };
        }
        else if (isIGPUVertexBufferOffset)
        {
            const gpuBuffer = vertexBuffers[index].buffer;

            // 使用相同 data 共用 gpuBuffer。
            index = vertexBufferLayouts.length;

            vertexBuffers[index] = { buffer: gpuBuffer, offset: isIGPUVertexBufferOffset ? attributeOffset : 0 };

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

        (vertexBufferLayouts[index].attributes as Array<GPUVertexAttribute>).push({ shaderLocation, offset: isIGPUVertexBufferOffset ? 0 : attributeOffset, format });
    });

    return { vertexBufferLayouts, vertexBuffers };
}
