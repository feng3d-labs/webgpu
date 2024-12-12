import { GUI } from "dat.gui";

import { mat4, vec3, vec4 } from "wgpu-matrix";
import { mesh } from "../../meshes/stanfordDragon";

import fragmentDeferredRendering from "./fragmentDeferredRendering.wgsl";
import fragmentGBuffersDebugView from "./fragmentGBuffersDebugView.wgsl";
import fragmentWriteGBuffers from "./fragmentWriteGBuffers.wgsl";
import lightUpdate from "./lightUpdate.wgsl";
import vertexTextureQuad from "./vertexTextureQuad.wgsl";
import vertexWriteGBuffers from "./vertexWriteGBuffers.wgsl";

import { ITexture } from "@feng3d/render-api";
import { getIGPUBuffer, IGPUBindingResources, IGPUComputePass, IGPUComputePipeline, IGPURenderPass, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSubmit, IGPUTextureView, IGPUVertexAttributes, WebGPU } from "@feng3d/webgpu";

const kMaxNumLights = 1024;
const lightExtentMin = vec3.fromValues(-50, -30, -50);
const lightExtentMax = vec3.fromValues(50, 50, 50);

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const aspect = canvas.width / canvas.height;

  const webgpu = await new WebGPU().init();

  // Create the model vertex buffer.
  const kVertexStride = 8;
  const vertexBuffer = new Float32Array(mesh.positions.length * kVertexStride);
  for (let i = 0; i < mesh.positions.length; ++i)
  {
    vertexBuffer.set(mesh.positions[i], kVertexStride * i);
    vertexBuffer.set(mesh.normals[i], kVertexStride * i + 3);
    vertexBuffer.set(mesh.uvs[i], kVertexStride * i + 6);
  }

  const vertices: IGPUVertexAttributes = {
    position: { data: vertexBuffer, format: "float32x3", offset: 0, arrayStride: Float32Array.BYTES_PER_ELEMENT * 8 },
    normal: { data: vertexBuffer, format: "float32x3", offset: Float32Array.BYTES_PER_ELEMENT * 3, arrayStride: Float32Array.BYTES_PER_ELEMENT * 8 },
    uv: { data: vertexBuffer, format: "float32x2", offset: Float32Array.BYTES_PER_ELEMENT * 6, arrayStride: Float32Array.BYTES_PER_ELEMENT * 8 },
  };

  // Create the model index buffer.
  const indexCount = mesh.triangles.length * 3;
  const indexBuffer = new Uint16Array(indexCount);
  for (let i = 0; i < mesh.triangles.length; ++i)
  {
    indexBuffer.set(mesh.triangles[i], 3 * i);
  }

  // GBuffer texture render targets
  const gBufferTexture2DFloat32: ITexture = {
    size: [canvas.width, canvas.height],
    format: "rgba32float",
  };
  const gBufferTexture2DFloat16: ITexture = {
    size: [canvas.width, canvas.height],
    format: "rgba16float",
  };
  const gBufferTextureAlbedo: ITexture = {
    size: [canvas.width, canvas.height],
    format: "bgra8unorm",
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

  const writeGBuffersPipeline: IGPURenderPipeline = {
    vertex: {
      code: vertexWriteGBuffers,
    },
    fragment: {
      code: fragmentWriteGBuffers,
    },
    primitive,
  };

  const gBuffersDebugViewPipeline: IGPURenderPipeline = {
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
  const deferredRenderPipeline: IGPURenderPipeline = {
    vertex: {
      code: vertexTextureQuad,
    },
    fragment: {
      code: fragmentDeferredRendering,
    },
    primitive,
  };

  const depthTexture: ITexture = {
    size: [canvas.width, canvas.height],
    format: "depth24plus",
  };

  const writeGBufferPassDescriptor: IGPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: gBufferTextureViews[0],

        clearValue: [
          Number.MAX_VALUE,
          Number.MAX_VALUE,
          Number.MAX_VALUE,
          1.0,
        ],
      },
      {
        view: gBufferTextureViews[1],

        clearValue: [0.0, 0.0, 1.0, 1.0],
      },
      {
        view: gBufferTextureViews[2],

        clearValue: [0.0, 0.0, 0.0, 1.0],
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

        clearValue: [0.0, 0.0, 0.0, 1.0],
      }
    ],
  };

  const settings = {
    mode: "rendering",
    numLights: 128,
  };
  const configUniformBuffer = new Uint32Array([settings.numLights]);

  gui.add(settings, "mode", ["rendering", "gBuffers view"]);
  gui
    .add(settings, "numLights", 1, kMaxNumLights)
    .step(1)
    .onChange(() =>
    {
      if (getIGPUBuffer(configUniformBuffer).writeBuffers)
      {
        getIGPUBuffer(configUniformBuffer).writeBuffers.push({ data: new Uint32Array([settings.numLights]) });
      }
      else
      {
        getIGPUBuffer(configUniformBuffer).writeBuffers = [{ data: new Uint32Array([settings.numLights]) }];
      }
    });

  const modelUniformBuffer = new Uint8Array(4 * 16 * 2);

  const cameraUniformBuffer = new Uint8Array(4 * 16);

  const sceneUniformBindGroup: IGPUBindingResources = {
    uniforms: {
      bufferView: modelUniformBuffer,
    },
    camera: {
      bufferView: cameraUniformBuffer,
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
  const lightsBuffer = new Uint8Array(bufferSizeInByte);

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
  getIGPUBuffer(lightsBuffer).data = lightData;

  const lightExtentBuffer = new Uint8Array(4 * 8);
  const lightExtentData = new Float32Array(8);
  lightExtentData.set(lightExtentMin, 0);
  lightExtentData.set(lightExtentMax, 4);
  getIGPUBuffer(lightExtentBuffer).writeBuffers = [{ data: lightExtentData }];

  const lightUpdateComputePipeline: IGPUComputePipeline = {
    compute: {
      code: lightUpdate,
    },
  };
  const lightsBufferBindGroup: IGPUBindingResources = {
    lightsBuffer: {
      bufferView: lightsBuffer,
    },
    config: {
      bufferView: configUniformBuffer,
    },
  };
  const lightsBufferComputeBindGroup: IGPUBindingResources = {
    lightsBuffer: {
      bufferView: lightsBuffer,
    },
    config: {
      bufferView: configUniformBuffer,
    },
    lightExtent: {
      bufferView: lightExtentBuffer,
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

  const viewMatrix = mat4.lookAt(eyePosition, origin, upVector);

  const viewProjMatrix = mat4.multiply(projectionMatrix, viewMatrix);

  // Move the model so it's centered.
  const modelMatrix = mat4.translation([0, -45, 0]);

  const cameraMatrixData = viewProjMatrix as Float32Array;
  if (getIGPUBuffer(cameraUniformBuffer).writeBuffers)
  {
    getIGPUBuffer(cameraUniformBuffer).writeBuffers.push({ data: cameraMatrixData });
  }
  else
  {
    getIGPUBuffer(cameraUniformBuffer).writeBuffers = [{ data: cameraMatrixData }];
  }
  const modelData = modelMatrix as Float32Array;
  if (getIGPUBuffer(modelUniformBuffer).writeBuffers)
  {
    getIGPUBuffer(modelUniformBuffer).writeBuffers.push({ data: modelData });
  }
  else
  {
    getIGPUBuffer(modelUniformBuffer).writeBuffers = [{ data: modelData }];
  }
  const invertTransposeModelMatrix = mat4.invert(modelMatrix);
  mat4.transpose(invertTransposeModelMatrix, invertTransposeModelMatrix);
  const normalModelData = invertTransposeModelMatrix as Float32Array;
  if (getIGPUBuffer(modelUniformBuffer).writeBuffers)
  {
    getIGPUBuffer(modelUniformBuffer).writeBuffers.push({ bufferOffset: 64, data: normalModelData });
  }
  else
  {
    getIGPUBuffer(modelUniformBuffer).writeBuffers = [{ bufferOffset: 64, data: normalModelData }];
  }

  // Rotates the camera around the origin based on time.
  function getCameraViewProjMatrix()
  {
    const eyePosition = vec3.fromValues(0, 50, -100);

    const rad = Math.PI * (Date.now() / 5000);
    const rotation = mat4.rotateY(mat4.translation(origin), rad);
    vec3.transformMat4(eyePosition, rotation, eyePosition);

    const viewMatrix = mat4.lookAt(eyePosition, origin, upVector);

    mat4.multiply(projectionMatrix, viewMatrix, viewProjMatrix);

    return viewProjMatrix as Float32Array;
  }

  const passEncoders: (IGPUComputePass | IGPURenderPass)[] = [];
  passEncoders.push({
    descriptor: writeGBufferPassDescriptor,
    renderObjects: [
      {
        pipeline: writeGBuffersPipeline,
        bindingResources: {
          ...sceneUniformBindGroup,
        },
        vertices,
        indices: indexBuffer,
        drawIndexed: { indexCount },
      },
    ]
  });
  passEncoders.push({
    __type: "ComputePass",
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

  const gBuffersPassEncoders: (IGPUComputePass | IGPURenderPass)[] = passEncoders.concat();

  gBuffersPassEncoders.push({
    descriptor: textureQuadPassDescriptor,
    renderObjects: [
      {
        pipeline: gBuffersDebugViewPipeline,
        bindingResources: {
          ...gBufferTexturesBindGroup,
        },
        drawVertex: { vertexCount: 6 },
      },
    ]
  });

  passEncoders.push({
    descriptor: textureQuadPassDescriptor,
    renderObjects: [
      {
        pipeline: deferredRenderPipeline,
        bindingResources: {
          ...gBufferTexturesBindGroup,
          ...lightsBufferBindGroup,
        },
        drawVertex: { vertexCount: 6 },
      },
    ]
  });

  function frame()
  {
    const cameraViewProj = getCameraViewProjMatrix();
    if (getIGPUBuffer(cameraUniformBuffer).writeBuffers)
    {
      getIGPUBuffer(cameraUniformBuffer).writeBuffers.push({ data: cameraViewProj });
    }
    else
    {
      getIGPUBuffer(cameraUniformBuffer).writeBuffers = [{ data: cameraViewProj }];
    }

    const submit: IGPUSubmit = {
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
