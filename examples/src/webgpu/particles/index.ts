import { GUI } from "dat.gui";

import { mat4, vec3 } from "wgpu-matrix";

import importLevelWGSL from "./import_level.wgsl";
import particleWGSL from "./particle.wgsl";
import probabilityMapWGSL from "./probabilityMap.wgsl";
import simulateWGSL from "./simulate.wgsl";

import { IBindingResources, IGPUBuffer, IComputePassEncoder, IComputePipeline, IRenderPass, IRenderPassEncoder, IRenderPipeline, ISubmit, IGPUTexture, IVertexAttributes, WebGPU } from "webgpu-renderer";

const numParticles = 50000;
const particlePositionOffset = 0;
const particleColorOffset = 4 * 4;
const particleInstanceByteSize
  = 3 * 4 // position
  + 1 * 4 // lifetime
  + 4 * 4 // color
  + 3 * 4 // velocity
  + 1 * 4 // padding
  + 0;

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const webgpu = await WebGPU.init();

  const particlesBuffer: IGPUBuffer = {
    size: numParticles * particleInstanceByteSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
  };

  const particlesVertices: IVertexAttributes = {
    position: { buffer: particlesBuffer, offset: particlePositionOffset, vertexSize: particleInstanceByteSize, stepMode: "instance" },
    color: { buffer: particlesBuffer, offset: particleColorOffset, vertexSize: particleInstanceByteSize, stepMode: "instance" },
  };

  const renderPipeline: IRenderPipeline = {
    vertex: {
      code: particleWGSL,
    },
    fragment: {
      code: particleWGSL,
      targets: [
        {
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one",
              operation: "add",
            },
            alpha: {
              srcFactor: "zero",
              dstFactor: "one",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: {},

    depthStencil: {
      depthWriteEnabled: false,
    },
  };

  const uniformBufferSize
    = 4 * 4 * 4 // modelViewProjectionMatrix : mat4x4<f32>
    + 3 * 4 // right : vec3<f32>
    + 4 // padding
    + 3 * 4 // up : vec3<f32>
    + 4 // padding
    + 0;
  const uniformBuffer: IGPUBuffer = {
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  };

  const uniformBindGroup: IBindingResources = {
    render_params: {
      buffer: uniformBuffer,
    },
  };

  const renderPassDescriptor: IRenderPass = {
    colorAttachments: [
      {
        view: { texture: { context: { canvasId: canvas.id } } },
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      },
    ],
    depthStencilAttachment: {
      depthClearValue: 1,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };

  // ////////////////////////////////////////////////////////////////////////////
  // Quad vertex buffer
  // ////////////////////////////////////////////////////////////////////////////
  // prettier-ignore
  const vertexData = [
    -1.0, -1.0, +1.0, -1.0, -1.0, +1.0, -1.0, +1.0, +1.0, -1.0, +1.0, +1.0,
  ];
  const quadVertexBuffer: IGPUBuffer = {
    size: 6 * 2 * 4, // 6x vec2<f32>
    usage: GPUBufferUsage.VERTEX,
    data: new Float32Array(vertexData),
  };

  const quadVertices: IVertexAttributes = {
    quad_pos: { buffer: quadVertexBuffer }
  };

  // ////////////////////////////////////////////////////////////////////////////
  // Texture
  // ////////////////////////////////////////////////////////////////////////////
  let texture: IGPUTexture;
  let textureWidth = 1;
  let textureHeight = 1;
  let numMipLevels = 1;
  {
    const response = await fetch(
      new URL("../../../assets/img/webgpu.png", import.meta.url).toString()
    );
    const imageBitmap = await createImageBitmap(await response.blob());

    // Calculate number of mip levels required to generate the probability map
    while (
      textureWidth < imageBitmap.width
      || textureHeight < imageBitmap.height
    )
    {
      textureWidth *= 2;
      textureHeight *= 2;
      numMipLevels++;
    }
    texture = {
      size: [imageBitmap.width, imageBitmap.height, 1],
      mipLevelCount: numMipLevels,
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      source: [{ source: { source: imageBitmap }, destination: {}, copySize: { width: imageBitmap.width, height: imageBitmap.height } }],
    };
  }

  // ////////////////////////////////////////////////////////////////////////////
  // Probability map generation
  // The 0'th mip level of texture holds the color data and spawn-probability in
  // the alpha channel. The mip levels 1..N are generated to hold spawn
  // probabilities up to the top 1x1 mip level.
  // ////////////////////////////////////////////////////////////////////////////
  {
    const probabilityMapImportLevelPipeline: IComputePipeline = {
      compute: {
        code: importLevelWGSL,
      },
    };
    const probabilityMapExportLevelPipeline: IComputePipeline = {
      compute: {
        code: probabilityMapWGSL,
      },
    };

    const probabilityMapUBOBufferSize
      = 1 * 4 // stride
      + 3 * 4 // padding
      + 0;
    const probabilityMapUBOBuffer: IGPUBuffer = {
      size: probabilityMapUBOBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
    const bufferA: IGPUBuffer = {
      size: textureWidth * textureHeight * 4,
      usage: GPUBufferUsage.STORAGE,
    };
    const bufferB: IGPUBuffer = {
      size: textureWidth * textureHeight * 4,
      usage: GPUBufferUsage.STORAGE,
    };
    probabilityMapUBOBuffer.writeBuffers = [{ data: new Int32Array([textureWidth]) }];

    const passEncoders: IComputePassEncoder[] = [];

    const submit: ISubmit = {
      commandEncoders: [
        {
          passEncoders,
        }
      ]
    };

    for (let level = 0; level < numMipLevels; level++)
    {
      const levelWidth = textureWidth >> level;
      const levelHeight = textureHeight >> level;
      const probabilityMapBindGroup: IBindingResources = {
        ubo: { buffer: probabilityMapUBOBuffer },
        buf_in: { buffer: level & 1 ? bufferA : bufferB },
        buf_out: { buffer: level & 1 ? bufferB : bufferA },
        tex_in: {
          texture,
          format: "rgba8unorm",
          dimension: "2d",
          baseMipLevel: level,
          mipLevelCount: 1,
        },
        tex_out: {
          texture,
          format: "rgba8unorm",
          dimension: "2d",
          baseMipLevel: level,
          mipLevelCount: 1,
        },
      };
      if (level === 0)
      {
        passEncoders.push({
          computeObjects: [{
            pipeline: probabilityMapImportLevelPipeline,
            bindingResources: { ...probabilityMapBindGroup },
            workgroups: { workgroupCountX: Math.ceil(levelWidth / 64), workgroupCountY: levelHeight },
          }],
        });
      }
      else
      {
        passEncoders.push({
          computeObjects: [{
            pipeline: probabilityMapExportLevelPipeline,
            bindingResources: { ...probabilityMapBindGroup },
            workgroups: { workgroupCountX: Math.ceil(levelWidth / 64), workgroupCountY: levelHeight },
          }],
        });
      }
    }

    webgpu.submit(submit);
  }

  // ////////////////////////////////////////////////////////////////////////////
  // Simulation compute pipeline
  // ////////////////////////////////////////////////////////////////////////////
  const simulationParams = {
    simulate: true,
    deltaTime: 0.04,
  };

  const simulationUBOBufferSize
    = 1 * 4 // deltaTime
    + 3 * 4 // padding
    + 4 * 4 // seed
    + 0;
  const simulationUBOBuffer: IGPUBuffer = {
    size: simulationUBOBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  };

  Object.keys(simulationParams).forEach((k) =>
  {
    gui.add(simulationParams, k as any);
  });

  const computePipeline: IComputePipeline = {
    compute: {
      code: simulateWGSL,
    },
  };
  const computeBindGroup: IBindingResources = {
    sim_params: {
      buffer: simulationUBOBuffer,
    },
    data: {
      buffer: particlesBuffer,
      offset: 0,
      size: numParticles * particleInstanceByteSize,
    },
    texture: { texture },
  };

  const aspect = canvas.width / canvas.height;
  const projection = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
  const view = mat4.create();
  const mvp = mat4.create();

  const passEncoders: (IComputePassEncoder | IRenderPassEncoder)[] = [];

  const submit: ISubmit = {
    commandEncoders: [
      {
        passEncoders,
      }
    ]
  };

  passEncoders.push(
    {
      computeObjects: [{
        pipeline: computePipeline,
        bindingResources: { ...computeBindGroup },
        workgroups: { workgroupCountX: Math.ceil(numParticles / 64) },
      }]
    },
    {
      renderPass: renderPassDescriptor,
      renderObjects: [{
        pipeline: renderPipeline,
        bindingResources: { ...uniformBindGroup },
        vertices: { ...particlesVertices, ...quadVertices },
        draw: { vertexCount: 6, instanceCount: numParticles, firstVertex: 0, firstInstance: 0 },
      }],
    }
  );

  function frame()
  {
    simulationUBOBuffer.writeBuffers = [{
      data: new Float32Array([
        simulationParams.simulate ? simulationParams.deltaTime : 0.0,
        0.0,
        0.0,
        0.0, // padding
        Math.random() * 100,
        Math.random() * 100, // seed.xy
        1 + Math.random(),
        1 + Math.random(), // seed.zw
      ])
    }];

    mat4.identity(view);
    mat4.translate(view, vec3.fromValues(0, 0, -3), view);
    mat4.rotateX(view, Math.PI * -0.2, view);
    mat4.multiply(projection, view, mvp);

    // prettier-ignore
    uniformBuffer.writeBuffers = [{
      data: new Float32Array([
        // modelViewProjectionMatrix
        mvp[0], mvp[1], mvp[2], mvp[3],
        mvp[4], mvp[5], mvp[6], mvp[7],
        mvp[8], mvp[9], mvp[10], mvp[11],
        mvp[12], mvp[13], mvp[14], mvp[15],

        view[0], view[4], view[8], // right

        0, // padding

        view[1], view[5], view[9], // up

        0, // padding
      ])
    }];

    webgpu.submit(submit);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
