import { GUI } from "dat.gui";

import { mat4, vec3, vec4 } from "wgpu-matrix";
import { mesh } from "../../meshes/stanfordDragon";

import fragmentDeferredRendering from "./fragmentDeferredRendering.wgsl";
import fragmentGBuffersDebugView from "./fragmentGBuffersDebugView.wgsl";
import fragmentWriteGBuffers from "./fragmentWriteGBuffers.wgsl";
import lightUpdate from "./lightUpdate.wgsl";
import vertexTextureQuad from "./vertexTextureQuad.wgsl";
import vertexWriteGBuffers from "./vertexWriteGBuffers.wgsl";

import { IGPUBindingResources, IGPUBuffer, IGPUComputePassEncoder, IGPUComputePipeline, IGPURenderPassDescriptor, IRenderPassEncoder, IRenderPipeline, ISubmit, IGPUTexture, IGPUTextureView, IVertexAttributes, WebGPU } from "webgpu-renderer";

const kMaxNumLights = 1024;
const lightExtentMin = vec3.fromValues(-50, -30, -50);
const lightExtentMax = vec3.fromValues(50, 50, 50);

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const aspect = canvas.width / canvas.height;

  const webgpu = await WebGPU.init();

  // Create the model vertex buffer.
  const kVertexStride = 8;
  const vertexBuffer: IGPUBuffer = {
    // position: vec3, normal: vec3, uv: vec2
    size: mesh.positions.length * kVertexStride * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
  };
  {
    const mapping = new Float32Array(mesh.positions.length * kVertexStride);
    for (let i = 0; i < mesh.positions.length; ++i)
    {
      mapping.set(mesh.positions[i], kVertexStride * i);
      mapping.set(mesh.normals[i], kVertexStride * i + 3);
      mapping.set(mesh.uvs[i], kVertexStride * i + 6);
    }

    vertexBuffer.data = mapping;
  }

  const vertices: IVertexAttributes = {
    position: { buffer: vertexBuffer, offset: 0, vertexSize: Float32Array.BYTES_PER_ELEMENT * 8 },
    normal: { buffer: vertexBuffer, offset: Float32Array.BYTES_PER_ELEMENT * 3, vertexSize: Float32Array.BYTES_PER_ELEMENT * 8 },
    uv: { buffer: vertexBuffer, offset: Float32Array.BYTES_PER_ELEMENT * 6, vertexSize: Float32Array.BYTES_PER_ELEMENT * 8 },
  };

  // Create the model index buffer.
  const indexCount = mesh.triangles.length * 3;
  const indexBuffer: IGPUBuffer = {
    size: indexCount * Uint16Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.INDEX,
  };
  {
    const mapping = new Uint16Array(indexCount);
    for (let i = 0; i < mesh.triangles.length; ++i)
    {
      mapping.set(mesh.triangles[i], 3 * i);
    }

    indexBuffer.data = mapping;
  }

  // GBuffer texture render targets
  const gBufferTexture2DFloat32: IGPUTexture = {
    size: [canvas.width, canvas.height],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    format: "rgba32float",
    sampleType: "unfilterable-float",
  };
  const gBufferTexture2DFloat16: IGPUTexture = {
    size: [canvas.width, canvas.height],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    format: "rgba16float",
    sampleType: "unfilterable-float",
  };
  const gBufferTextureAlbedo: IGPUTexture = {
    size: [canvas.width, canvas.height],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    format: "bgra8unorm",
    sampleType: "unfilterable-float",
  };
  const gBufferTextureViews: IGPUTextureView[] = [
    { texture: gBufferTexture2DFloat32 },
    { texture: gBufferTexture2DFloat16 },
    { texture: gBufferTextureAlbedo },
  ];

  const primitive: GPUPrimitiveState = {
    topology: "triangle-list",
    cullMode: "back",
  };

  const writeGBuffersPipeline: IRenderPipeline = {
    vertex: {
      code: vertexWriteGBuffers,
    },
    fragment: {
      code: fragmentWriteGBuffers,
    },
    primitive,
  };

  const gBuffersDebugViewPipeline: IRenderPipeline = {
    vertex: {
      code: vertexTextureQuad,
    },
    fragment: {
      code: fragmentGBuffersDebugView,
      constants: {
        canvasSizeWidth: canvas.width,
        canvasSizeHeight: canvas.height,
      },
    },
    primitive,
  };
  const deferredRenderPipeline: IRenderPipeline = {
    vertex: {
      code: vertexTextureQuad,
    },
    fragment: {
      code: fragmentDeferredRendering,
    },
    primitive,
  };

  const depthTexture: IGPUTexture = {
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  };

  const writeGBufferPassDescriptor: IGPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: gBufferTextureViews[0],

        clearValue: {
          r: Number.MAX_VALUE,
          g: Number.MAX_VALUE,
          b: Number.MAX_VALUE,
          a: 1.0,
        },
      },
      {
        view: gBufferTextureViews[1],

        clearValue: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 },
      },
      {
        view: gBufferTextureViews[2],

        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      },
    ],
    depthStencilAttachment: {
      view: { texture: depthTexture },

      depthClearValue: 1,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };

  const textureQuadPassDescriptor: IGPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: { texture: { context: { canvasId: canvas.id } } },

        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      }
    ],
  };

  const settings = {
    mode: "rendering",
    numLights: 128,
  };
  const configUniformBuffer: IGPUBuffer = {
    size: Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    data: new Uint32Array([settings.numLights]),
  };

  gui.add(settings, "mode", ["rendering", "gBuffers view"]);
  gui
    .add(settings, "numLights", 1, kMaxNumLights)
    .step(1)
    .onChange(() =>
    {
      if (configUniformBuffer.writeBuffers)
      {
        configUniformBuffer.writeBuffers.push({ data: new Uint32Array([settings.numLights]) });
      }
      else
      {
        configUniformBuffer.writeBuffers = [{ data: new Uint32Array([settings.numLights]) }];
      }
    });

  const modelUniformBuffer: IGPUBuffer = {
    size: 4 * 16 * 2, // two 4x4 matrix
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  };

  const cameraUniformBuffer: IGPUBuffer = {
    size: 4 * 16, // 4x4 matrix
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  };

  const sceneUniformBindGroup: IGPUBindingResources = {
    uniforms: {
      buffer: modelUniformBuffer,
    },
    camera: {
      buffer: cameraUniformBuffer,
    },
  };

  const gBufferTexturesBindGroup: IGPUBindingResources = {
    gBufferPosition: gBufferTextureViews[0],
    gBufferNormal: gBufferTextureViews[1],
    gBufferAlbedo: gBufferTextureViews[2],
  };

  // Lights data are uploaded in a storage buffer
  // which could be updated/culled/etc. with a compute shader
  const extent = vec3.sub(lightExtentMax, lightExtentMin);
  const lightDataStride = 8;
  const bufferSizeInByte = Float32Array.BYTES_PER_ELEMENT * lightDataStride * kMaxNumLights;
  const lightsBuffer: IGPUBuffer = {
    size: bufferSizeInByte,
    usage: GPUBufferUsage.STORAGE,
  };

  // We randomaly populate lights randomly in a box range
  // And simply move them along y-axis per frame to show they are
  // dynamic lightings
  const lightData = new Float32Array(lightDataStride * kMaxNumLights);
  const tmpVec4 = vec4.create();
  let offset = 0;
  for (let i = 0; i < kMaxNumLights; i++)
  {
    offset = lightDataStride * i;
    // position
    for (let i = 0; i < 3; i++)
    {
      tmpVec4[i] = Math.random() * extent[i] + lightExtentMin[i];
    }
    tmpVec4[3] = 1;
    lightData.set(tmpVec4, offset);
    // color
    tmpVec4[0] = Math.random() * 2;
    tmpVec4[1] = Math.random() * 2;
    tmpVec4[2] = Math.random() * 2;
    // radius
    tmpVec4[3] = 20.0;
    lightData.set(tmpVec4, offset + 4);
  }
  lightsBuffer.data = lightData;

  const lightExtentBuffer: IGPUBuffer = {
    size: 4 * 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  };
  const lightExtentData = new Float32Array(8);
  lightExtentData.set(lightExtentMin, 0);
  lightExtentData.set(lightExtentMax, 4);
  lightExtentBuffer.writeBuffers = [{ data: lightExtentData }];

  const lightUpdateComputePipeline: IGPUComputePipeline = {
    compute: {
      code: lightUpdate,
    },
  };
  const lightsBufferBindGroup: IGPUBindingResources = {
    lightsBuffer: {
      buffer: lightsBuffer,
    },
    config: {
      buffer: configUniformBuffer,
    },
  };
  const lightsBufferComputeBindGroup: IGPUBindingResources = {
    lightsBuffer: {
      buffer: lightsBuffer,
    },
    config: {
      buffer: configUniformBuffer,
    },
    lightExtent: {
      buffer: lightExtentBuffer,
    },
  };
  // --------------------

  // Scene matrices
  const eyePosition = vec3.fromValues(0, 50, -100);
  const upVector = vec3.fromValues(0, 1, 0);
  const origin = vec3.fromValues(0, 0, 0);

  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    1,
    2000.0
  );

  const viewMatrix = mat4.inverse(mat4.lookAt(eyePosition, origin, upVector));

  const viewProjMatrix = mat4.multiply(projectionMatrix, viewMatrix);

  // Move the model so it's centered.
  const modelMatrix = mat4.translation([0, -45, 0]);

  const cameraMatrixData = viewProjMatrix as Float32Array;
  if (cameraUniformBuffer.writeBuffers)
  {
    cameraUniformBuffer.writeBuffers.push({ data: cameraMatrixData });
  }
  else
  {
    cameraUniformBuffer.writeBuffers = [{ data: cameraMatrixData }];
  }
  const modelData = modelMatrix as Float32Array;
  if (modelUniformBuffer.writeBuffers)
  {
    modelUniformBuffer.writeBuffers.push({ data: modelData });
  }
  else
  {
    modelUniformBuffer.writeBuffers = [{ data: modelData }];
  }
  const invertTransposeModelMatrix = mat4.invert(modelMatrix);
  mat4.transpose(invertTransposeModelMatrix, invertTransposeModelMatrix);
  const normalModelData = invertTransposeModelMatrix as Float32Array;
  if (modelUniformBuffer.writeBuffers)
  {
    modelUniformBuffer.writeBuffers.push({ bufferOffset: 64, data: normalModelData });
  }
  else
  {
    modelUniformBuffer.writeBuffers = [{ bufferOffset: 64, data: normalModelData }];
  }

  // Rotates the camera around the origin based on time.
  function getCameraViewProjMatrix()
  {
    const eyePosition = vec3.fromValues(0, 50, -100);

    const rad = Math.PI * (Date.now() / 5000);
    const rotation = mat4.rotateY(mat4.translation(origin), rad);
    vec3.transformMat4(eyePosition, rotation, eyePosition);

    const viewMatrix = mat4.inverse(mat4.lookAt(eyePosition, origin, upVector));

    mat4.multiply(projectionMatrix, viewMatrix, viewProjMatrix);

    return viewProjMatrix as Float32Array;
  }

  const passEncoders: (IGPUComputePassEncoder | IRenderPassEncoder)[] = [];
  passEncoders.push({
    renderPass: writeGBufferPassDescriptor,
    renderObjects: [
      {
        pipeline: writeGBuffersPipeline,
        bindingResources: {
          ...sceneUniformBindGroup,
        },
        vertices,
        index: { buffer: indexBuffer, indexFormat: "uint16" },
        drawIndexed: { indexCount },
      },
    ]
  });
  passEncoders.push({
    computeObjects: [
      {
        pipeline: lightUpdateComputePipeline,
        bindingResources: {
          ...lightsBufferComputeBindGroup,
        },
        workgroups: { workgroupCountX: Math.ceil(kMaxNumLights / 64) },
      },
    ]
  });

  const gBuffersPassEncoders: (IGPUComputePassEncoder | IRenderPassEncoder)[] = passEncoders.concat();

  gBuffersPassEncoders.push({
    renderPass: textureQuadPassDescriptor,
    renderObjects: [
      {
        pipeline: gBuffersDebugViewPipeline,
        bindingResources: {
          ...gBufferTexturesBindGroup,
        },
        draw: { vertexCount: 6 },
      },
    ]
  });

  passEncoders.push({
    renderPass: textureQuadPassDescriptor,
    renderObjects: [
      {
        pipeline: deferredRenderPipeline,
        bindingResources: {
          ...gBufferTexturesBindGroup,
          ...lightsBufferBindGroup,
        },
        draw: { vertexCount: 6 },
      },
    ]
  });

  function frame()
  {
    const cameraViewProj = getCameraViewProjMatrix();
    if (cameraUniformBuffer.writeBuffers)
    {
      cameraUniformBuffer.writeBuffers.push({ data: cameraViewProj });
    }
    else
    {
      cameraUniformBuffer.writeBuffers = [{ data: cameraViewProj }];
    }

    const submit: ISubmit = {
      commandEncoders: [
        {
          passEncoders: settings.mode === "gBuffers view" ? gBuffersPassEncoders : passEncoders,
        }
      ]
    };

    webgpu.submit(submit);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
