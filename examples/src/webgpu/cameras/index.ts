import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'wgpu-matrix';
import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize, } from '../../meshes/cube';
import { ArcballCamera, WASDCamera } from './camera';
import cubeWGSL from './cube.wgsl';
import { createInputHandler } from './input';

import { IGPURenderObject, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSampler, IGPUSubmit, IGPUTexture, IGPUVertexAttributes, WebGPU } from "@feng3d/webgpu-renderer";

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{

  // The input handler
  const inputHandler = createInputHandler(window, canvas);

  // The camera types
  const initialCameraPosition = vec3.create(3, 2, 5);
  const cameras = {
    arcball: new ArcballCamera({ position: initialCameraPosition }),
    WASD: new WASDCamera({ position: initialCameraPosition }),
  };

  // GUI parameters
  const params: { type: 'arcball' | 'WASD' } = {
    type: 'arcball',
  };

  // Callback handler for camera mode
  let oldCameraType = params.type;
  gui.add(params, 'type', ['arcball', 'WASD']).onChange(() =>
  {
    // Copy the camera matrix from old to new
    const newCameraType = params.type;
    cameras[newCameraType].matrix = cameras[oldCameraType].matrix;
    oldCameraType = newCameraType;
  });

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const webgpu = await new WebGPU().init();

  // Create a vertex buffer from the cube data.
  const vertices: IGPUVertexAttributes = {
    position: { data: cubeVertexArray, format: "float32x4", offset: cubePositionOffset, arrayStride: cubeVertexSize },
    uv: { data: cubeVertexArray, format: "float32x2", offset: cubeUVOffset, arrayStride: cubeVertexSize },
  };

  const pipeline: IGPURenderPipeline = {
    vertex: {
      code: cubeWGSL,
    },
    fragment: {
      code: cubeWGSL,
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
  };

  const depthTexture: IGPUTexture = {
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  };

  // Fetch the image and upload it into a GPUTexture.
  let cubeTexture: IGPUTexture;
  {
    const response = await fetch('../../../assets/img/Di-3d.png');
    const imageBitmap = await createImageBitmap(await response.blob());

    cubeTexture = {
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
      source: [{ source: { source: imageBitmap }, destination: {}, copySize: [imageBitmap.width, imageBitmap.height] }]
    };
  }

  // Create a sampler with linear filtering for smooth interpolation.
  const sampler: IGPUSampler = {
    magFilter: 'linear',
    minFilter: 'linear',
  };

  const bindingResources = {
    uniforms: {
      modelViewProjectionMatrix: new Float32Array(16)
    },
    mySampler: sampler,
    myTexture: { texture: cubeTexture },
  }

  const renderObject: IGPURenderObject = {
    pipeline: pipeline,
    vertices: vertices,
    bindingResources: bindingResources,
    draw: { vertexCount: cubeVertexCount },
  };

  const renderPassDescriptor: IGPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: { texture: { context: { canvasId: canvas.id } } },

        clearValue: [0.5, 0.5, 0.5, 1.0],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: { texture: depthTexture },

      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  const data: IGPUSubmit = {
    commandEncoders: [
      {
        passEncoders: [
          { descriptor: renderPassDescriptor, renderObjects: [renderObject] },
        ]
      }
    ],
  };

  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
  const modelViewProjectionMatrix = mat4.create();

  function getModelViewProjectionMatrix(deltaTime: number)
  {
    const camera = cameras[params.type];
    const viewMatrix = camera.update(deltaTime, inputHandler());
    mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);
    return modelViewProjectionMatrix;
  }

  let lastFrameMS = Date.now();

  function frame()
  {
    const now = Date.now();
    const deltaTime = (now - lastFrameMS) / 1000;
    lastFrameMS = now;

    const modelViewProjection = getModelViewProjectionMatrix(deltaTime);
    bindingResources.uniforms.modelViewProjectionMatrix = new Float32Array(modelViewProjection); // 使用 new Float32Array 是因为赋值不同的对象才会触发数据改变重新上传数据到GPU

    webgpu.submit(data);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const panel = new GUI();
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
