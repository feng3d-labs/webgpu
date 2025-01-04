import { GUI } from "dat.gui";

import { mat4, vec3 } from "wgpu-matrix";

import importLevelWGSL from "./import_level.wgsl";
import particleWGSL from "./particle.wgsl";
import probabilityMapWGSL from "./probabilityMap.wgsl";
import simulateWGSL from "./simulate.wgsl";

import { IRenderPass, IRenderPassDescriptor, IRenderPipeline, ISubmit, ITexture, IVertexAttributes } from "@feng3d/render-api";
import { getIGPUBuffer, IGPUBindingResources, IGPUComputePass, IGPUComputePipeline, WebGPU } from "@feng3d/webgpu";

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

  const webgpu = await new WebGPU().init();

  const particlesBuffer = new Float32Array(numParticles * particleInstanceByteSize / 4);

  const particlesVertices: IVertexAttributes = {
    position: { data: particlesBuffer, format: "float32x3", offset: particlePositionOffset, arrayStride: particleInstanceByteSize, stepMode: "instance" },
    color: { data: particlesBuffer, format: "float32x4", offset: particleColorOffset, arrayStride: particleInstanceByteSize, stepMode: "instance" },
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
  const uniformBuffer = new Uint8Array(uniformBufferSize);

  const uniformBindGroup: IGPUBindingResources = {
    render_params: {
      bufferView: uniformBuffer,
    },
  };

  const renderPassDescriptor: IRenderPassDescriptor = {
    colorAttachments: [
      {
        view: { texture: { context: { canvasId: canvas.id } } },
        clearValue: [0.0, 0.0, 0.0, 1.0],
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
  const quadVertexBuffer = new Float32Array(vertexData);

  const quadVertices: IVertexAttributes = {
    quad_pos: { data: quadVertexBuffer, format: "float32x2" }
  };

  // ////////////////////////////////////////////////////////////////////////////
  // Texture
  // ////////////////////////////////////////////////////////////////////////////
  let texture: ITexture;
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
      size: [imageBitmap.width, imageBitmap.height],
      mipLevelCount: numMipLevels,
      format: "rgba8unorm",
      sources: [{ image: imageBitmap }],
    };
  }

  // ////////////////////////////////////////////////////////////////////////////
  // Probability map generation
  // The 0'th mip level of texture holds the color data and spawn-probability in
  // the alpha channel. The mip levels 1..N are generated to hold spawn
  // probabilities up to the top 1x1 mip level.
  // ////////////////////////////////////////////////////////////////////////////
  {
    const probabilityMapImportLevelPipeline: IGPUComputePipeline = {
      compute: {
        code: importLevelWGSL,
      },
    };
    const probabilityMapExportLevelPipeline: IGPUComputePipeline = {
      compute: {
        code: probabilityMapWGSL,
      },
    };

    const probabilityMapUBOBufferSize
      = 1 * 4 // stride
      + 3 * 4 // padding
      + 0;
    const probabilityMapUBOBuffer = new Uint8Array(probabilityMapUBOBufferSize);
    const bufferA = new Uint8Array(textureWidth * textureHeight * 4);
    const bufferB = new Uint8Array(textureWidth * textureHeight * 4);
    getIGPUBuffer(probabilityMapUBOBuffer).writeBuffers = [{ data: new Int32Array([textureWidth]) }];

    const passEncoders: IGPUComputePass[] = [];

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
      const probabilityMapBindGroup: IGPUBindingResources = {
        ubo: { bufferView: probabilityMapUBOBuffer },
        buf_in: { bufferView: level & 1 ? bufferA : bufferB },
        buf_out: { bufferView: level & 1 ? bufferB : bufferA },
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
          __type: "ComputePass",
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
          __type: "ComputePass",
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
  const simulationUBOBuffer = new Uint8Array(simulationUBOBufferSize);

  Object.keys(simulationParams).forEach((k) =>
  {
    gui.add(simulationParams, k as any);
  });

  const computePipeline: IGPUComputePipeline = {
    compute: {
      code: simulateWGSL,
    },
  };
  const computeBindGroup: IGPUBindingResources = {
    sim_params: {
      bufferView: simulationUBOBuffer,
    },
    data: {
      bufferView: particlesBuffer,
      offset: 0,
      size: numParticles * particleInstanceByteSize,
    },
    texture: { texture },
  };

  const aspect = canvas.width / canvas.height;
  const projection = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
  const view = mat4.create();
  const mvp = mat4.create();

  const passEncoders: (IGPUComputePass | IRenderPass)[] = [];

  const submit: ISubmit = {
    commandEncoders: [
      {
        passEncoders,
      }
    ]
  };

  passEncoders.push(
    {
      __type: "ComputePass",
      computeObjects: [{
        pipeline: computePipeline,
        bindingResources: { ...computeBindGroup },
        workgroups: { workgroupCountX: Math.ceil(numParticles / 64) },
      }]
    },
    {
      descriptor: renderPassDescriptor,
      renderObjects: [{
        pipeline: renderPipeline,
        uniforms: { ...uniformBindGroup },
        vertices: { ...particlesVertices, ...quadVertices },
        drawVertex: { vertexCount: 6, instanceCount: numParticles, firstVertex: 0, firstInstance: 0 },
      }],
    }
  );

  function frame()
  {
    getIGPUBuffer(simulationUBOBuffer).writeBuffers = [{
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
    getIGPUBuffer(uniformBuffer).writeBuffers = [{
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
