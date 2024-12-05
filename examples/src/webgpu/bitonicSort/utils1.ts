import type { GUI } from "dat.gui";
import Stats from "stats.js";
import { quitIfAdapterNotAvailable, quitIfWebGPUNotAvailable } from "../util";

import { IGPUBindingResources, IGPUCommandEncoder, IGPURenderPass, IGPURenderPassDescriptor, IGPURenderPipeline } from "@feng3d/webgpu";

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

interface DeviceInitParms
{
  device: GPUDevice;
}

interface DeviceInit3DParams extends DeviceInitParms
{
  context: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
  timestampQueryAvailable: boolean;
}

type CallbackSync3D = (params: SampleInitParams & DeviceInit3DParams) => void;
type CallbackAsync3D = (
  params: SampleInitParams & DeviceInit3DParams
) => Promise<void>;

type SampleInitCallback3D = CallbackSync3D | CallbackAsync3D;
export type SampleInit = (params: SampleInitParams) => void;

export const SampleInitFactoryWebGPU = async (
  callback: SampleInitCallback3D
): Promise<SampleInit> =>
{
  const init = async ({ canvas, gui, stats }) =>
  {
    const adapter = await navigator.gpu?.requestAdapter();
    quitIfAdapterNotAvailable(adapter);

    const timestampQueryAvailable = adapter.features.has("timestamp-query");
    let device: GPUDevice;
    if (timestampQueryAvailable)
    {
      device = await adapter.requestDevice({
        requiredFeatures: ["timestamp-query"],
      });
    }
 else
    {
      device = await adapter.requestDevice();
    }
    quitIfWebGPUNotAvailable(adapter, device);

    const context = canvas.getContext("webgpu") as GPUCanvasContext;
    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: presentationFormat,
    });

    callback({
      canvas,
      gui,
      device,
      context,
      presentationFormat,
      stats,
      timestampQueryAvailable,
    });
  };

return init;
};

export abstract class Base2DRendererClass
{
  abstract switchBindGroup(name: string): void;
  abstract startRun(
    commandEncoder: IGPUCommandEncoder,
    ...args: unknown[]
  ): void;
  renderPassDescriptor: IGPURenderPassDescriptor;
  pipeline: IGPURenderPipeline;
  bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroupName: string;

  executeRun(
    commandEncoder: IGPUCommandEncoder,
    renderPassDescriptor: IGPURenderPassDescriptor,
    pipeline: IGPURenderPipeline,
    bindingResources?: IGPUBindingResources
  )
  {
    const passEncoder: IGPURenderPass = {
      descriptor: renderPassDescriptor,
      renderObjects: [{
        pipeline,
        bindingResources,
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
    const renderPipeline: IGPURenderPipeline = {
      label: `${label}.pipeline`,
      vertex: {
        code: fullscreenTexturedQuad,
      },
      fragment: {
        code,
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
    };

    return renderPipeline;
  }
}
