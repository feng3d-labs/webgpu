import type { GUI } from "dat.gui";
import Stats from "stats.js";

import { ICommandEncoder, IRenderPass, IRenderPassDescriptor, IRenderPipeline, IUniforms } from "@feng3d/render-api";

const fullscreenTexturedQuad
    = `
struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>,
}

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
    const pos = array<vec2<f32>, 6>(
        vec2(1.0, 1.0),
        vec2(1.0, -1.0),
        vec2(-1.0, -1.0),
        vec2(1.0, 1.0),
        vec2(-1.0, -1.0),
        vec2(-1.0, 1.0),
    );

    const uv = array<vec2<f32>, 6>(
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(0.0, 0.0),
    );

    var output: VertexOutput;
    output.Position = vec4(pos[VertexIndex], 0.0, 1.0);
    output.fragUV = uv[VertexIndex];
    return output;
}

`;

export type ShaderKeyInterface<T extends string[]> = {
    [K in T[number]]: number;
};

export type SampleInitParams = {
    canvas: HTMLCanvasElement;
    gui?: GUI;
    stats?: Stats;
};

export type SampleInit = (params: SampleInitParams) => void;

export abstract class Base2DRendererClass
{
    abstract switchBindGroup(name: string): void;
    abstract startRun(
        commandEncoder: ICommandEncoder,
        ...args: unknown[]
    ): void;
    renderPassDescriptor: IRenderPassDescriptor;
    pipeline: IRenderPipeline;
    bindGroupMap: Record<string, GPUBindGroup>;
    currentBindGroupName: string;

    executeRun(
        commandEncoder: ICommandEncoder,
        renderPassDescriptor: IRenderPassDescriptor,
        pipeline: IRenderPipeline,
        bindingResources?: IUniforms
    )
    {
        const passEncoder: IRenderPass = {
            descriptor: renderPassDescriptor,
            renderObjects: [{
                pipeline,
                uniforms: bindingResources,
                drawVertex: { vertexCount: 6, instanceCount: 1 }
            }],
        };
        commandEncoder.passEncoders.push(passEncoder);
    }

    setUniformArguments<T, K extends readonly string[]>(
        device: GPUDevice,
        uniformBuffer: GPUBuffer,
        instance: T,
        keys: K
    )
    {
        for (let i = 0; i < keys.length; i++)
        {
            device.queue.writeBuffer(
                uniformBuffer,
                i * 4,
                new Float32Array([instance[keys[i]]])
            );
        }
    }

    create2DRenderPipeline(
        label: string,
        code: string,
    )
    {
        const renderPipeline: IRenderPipeline = {
            label: `${label}.pipeline`,
            vertex: {
                code: fullscreenTexturedQuad,
            },
            fragment: {
                code,
            },
            primitive: {
                topology: "triangle-list",
                cullFace: "none",
            },
        };

        return renderPipeline;
    }
}
