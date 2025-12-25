import { BindingResources, TransformFeedbackObject, TransformFeedbackPass } from '@feng3d/render-api';

import { runComputePass } from './runComputePass';
import { ComputeObject } from '../data/ComputeObject';
import { ComputePass } from '../data/ComputePass';
import { ComputePipeline } from '../data/ComputePipeline';

/**
 * 在 WebGPU 中运行 TransformFeedbackPass。
 * 将 TransformFeedback 转换为 ComputePass 执行。
 */
export function runTransformFeedbackPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, transformFeedbackPass: TransformFeedbackPass)
{
    const computePass: ComputePass = {
        __type__: 'ComputePass',
        computeObjects: [],
    };

    transformFeedbackPass.transformFeedbackObjects.forEach((transformFeedbackObject) =>
    {
        const computeObject = convertToComputeObject(transformFeedbackObject);
        if (computeObject)
        {
            computePass.computeObjects.push(computeObject);
        }
    });

    if (computePass.computeObjects.length > 0)
    {
        runComputePass(device, commandEncoder, computePass);
    }
}

/**
 * 将 TransformFeedbackObject 转换为 ComputeObject。
 */
function convertToComputeObject(transformFeedbackObject: TransformFeedbackObject): ComputeObject | null
{
    const pipeline = transformFeedbackObject.pipeline;

    // 从 vertex.wgsl 获取计算着色器代码
    const computeCode = pipeline.vertex.wgsl;

    if (!computeCode)
    {
        console.warn('TransformFeedbackPass: 未提供 vertex.wgsl 计算着色器代码，WebGPU 无法模拟 Transform Feedback');

        return null;
    }

    // 创建计算管线
    const computePipeline: ComputePipeline = {
        compute: { code: computeCode },
    };

    // 构建绑定资源
    const bindingResourcesObj: Record<string, unknown> = {};

    // 添加 uniforms
    if (transformFeedbackObject.uniforms)
    {
        Object.assign(bindingResourcesObj, transformFeedbackObject.uniforms);
    }

    // 添加输入数据（从 vertices 中提取）
    const vertices = transformFeedbackObject.vertices;
    if (vertices)
    {
        const firstAttrKey = Object.keys(vertices)[0];
        if (firstAttrKey)
        {
            const firstAttr = vertices[firstAttrKey];
            const inputData = firstAttr.data;
            bindingResourcesObj['inputData'] = { bufferView: inputData };
        }
    }

    // 添加输出数据（从 transformFeedback 中提取）
    const transformFeedback = transformFeedbackObject.transformFeedback;
    if (transformFeedback?.bindBuffers?.length > 0)
    {
        const outputData = transformFeedback.bindBuffers[0].data;
        bindingResourcesObj['outputData'] = { bufferView: outputData };
    }

    // 计算工作组数量
    const vertexCount = transformFeedbackObject.draw.vertexCount || 0;
    const workgroupSize = 64; // 默认工作组大小
    const workgroupCountX = Math.ceil(vertexCount / workgroupSize);

    return {
        pipeline: computePipeline,
        bindingResources: bindingResourcesObj as BindingResources,
        workgroups: { workgroupCountX },
    };
}
