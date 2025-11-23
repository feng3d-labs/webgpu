import { reactive } from '@feng3d/reactivity';
import { BindingResources, RenderObject, Sampler, Texture, TextureView } from '@feng3d/render-api';
import { WGPUBindGroup } from '../../caches/WGPUBindGroup';
import { WGPUPipelineLayout } from '../../caches/WGPUPipelineLayout';
import { WGPURenderPassEncoder } from '../../caches/WGPURenderPassEncoder';

/**
 * 检查对象是否是包含 texture 和 sampler 的纹理对象
 */
function isTextureSamplerObject(value: any): value is { texture: Texture; sampler: Sampler }
{
    return value && typeof value === 'object' && 'texture' in value && 'sampler' in value;
}

/**
 * 展开 bindingResources，将 { name: { texture, sampler } } 格式展开为 { name_texture: { texture }, name: sampler }
 */
function expandBindingResources(bindingResources: BindingResources): BindingResources
{
    const expanded: Record<string, any> = {};

    for (const [key, value] of Object.entries(bindingResources))
    {
        if (isTextureSamplerObject(value))
        {
            // 展开为两个绑定：name_texture 和 name
            // texture 需要包装为 TextureView 格式
            expanded[`${key}_texture`] = { texture: value.texture } as TextureView;
            expanded[key] = value.sampler;
        }
        else
        {
            // 保持原样
            expanded[key] = value;
        }
    }

    return expanded as BindingResources;
}

export function runBindGroup(renderObject: RenderObject, passEncoder: WGPURenderPassEncoder)
{
    const device = passEncoder.device;

    const r_renderObject = reactive(renderObject);

    // 执行
    r_renderObject.bindingResources;
    const bindingResources = renderObject.bindingResources;

    // 展开 bindingResources，支持 { name: { texture, sampler } } 格式
    const expandedBindingResources = expandBindingResources(bindingResources);

    const vertexCode = r_renderObject.pipeline.vertex.wgsl || r_renderObject.pipeline.vertex.code;
    const fragmentCode = r_renderObject.pipeline.fragment?.wgsl || r_renderObject.pipeline.fragment?.code;
    //
    const layout = WGPUPipelineLayout.getPipelineLayout({ vertex: vertexCode, fragment: fragmentCode });

    layout.bindGroupLayouts.forEach((bindGroupLayout, index) =>
    {
        const wgpuBindGroup = WGPUBindGroup.getInstance(device, bindGroupLayout, expandedBindingResources);

        passEncoder.setBindGroup(index, wgpuBindGroup.gpuBindGroup);
    });
}