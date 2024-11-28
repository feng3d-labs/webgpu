import { IGPUCanvasContext, IGPURenderObject, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSubmit, IGPUTexture, IGPUTimestampQuery, IGPUVertexAttributes, WebGPU } from "@feng3d/webgpu-renderer";

import { mat4, vec3 } from 'wgpu-matrix';

import { cubePositionOffset, cubeUVOffset, cubeVertexArray, cubeVertexCount, cubeVertexSize, } from '../../meshes/cube';

import basicVertWGSL from '../../shaders/basic.vert.wgsl';
import fragmentWGSL from '../../shaders/black.frag.wgsl';

import { watcher } from "@feng3d/watcher";
import PerfCounter from './PerfCounter';

const init = async (canvas: HTMLCanvasElement) =>
{
  // if (!supportsTimestampQueries)
  // {
  //   perfDisplay.innerHTML = 'Timestamp queries are not supported';
  // }

  // GPU-side timer and the CPU-side counter where we accumulate statistics:
  // NB: Look for 'timestampQueryManager' in this file to locate parts of this
  // snippets that are related to timestamps. Most of the logic is in
  // TimestampQueryManager.ts.
  const timestampQuery: IGPUTimestampQuery = {};
  // const timestampQueryManager = new TimestampQueryManager(device);
  const renderPassDurationCounter = new PerfCounter();
  // 监听结果。
  watcher.watch(timestampQuery, "elapsedNs", () =>
  {
    // Show the last successfully downloaded elapsed time.
    const elapsedNs = timestampQuery.elapsedNs;
    // Convert from nanoseconds to milliseconds:
    const elapsedMs = Number(elapsedNs) * 1e-6;
    renderPassDurationCounter.addSample(elapsedMs);
    perfDisplay.innerHTML = `Render Pass duration: ${renderPassDurationCounter
      .getAverage()
      .toFixed(3)} ms ± ${renderPassDurationCounter.getStddev().toFixed(3)} ms`;
  });

  //
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const webgpu = await new WebGPU().init();
  //
  const context: IGPUCanvasContext = { canvasId: canvas.id };

  const perfDisplay = document.querySelector('#info pre');

  // Create a vertex buffer from the cube data.
  const vertices: IGPUVertexAttributes = {
    position: { data: cubeVertexArray, offset: cubePositionOffset, vertexSize: cubeVertexSize },
    uv: { data: cubeVertexArray, offset: cubeUVOffset, vertexSize: cubeVertexSize },
  };

  const uniforms = { modelViewProjectionMatrix: null };

  const pipeline: IGPURenderPipeline = {
    vertex: {
      code: basicVertWGSL,
    },
    fragment: {
      code: fragmentWGSL,
    },
    primitive: {
      topology: 'triangle-list',

      // Backface culling since the cube is solid piece of geometry.
      // Faces pointing away from the camera will be occluded by faces
      // pointing toward the camera.
      cullMode: 'back',
    },

    // Enable depth testing so that the fragment closest to the camera
    // is rendered in front.
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

  const renderPassDescriptor: IGPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: { texture: { context } }, // Assigned later

        clearValue: [0.95, 0.95, 0.95, 1.0],
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

  const renderObject: IGPURenderObject = {
    pipeline: pipeline,
    vertices,
    bindingResources: {
      uniforms: uniforms,
    },
    draw: { vertexCount: cubeVertexCount },
  };

  const submit: IGPUSubmit = {
    commandEncoders: [
      {
        passEncoders: [
          {
            descriptor: renderPassDescriptor, renderObjects: [renderObject],
            // 开启时间戳查询
            timestampQuery: timestampQuery,
          },
        ]
      }
    ],
  };

  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
  const modelViewProjectionMatrix = mat4.create();

  function getTransformationMatrix()
  {
    const viewMatrix = mat4.identity();
    mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
    const now = Date.now() / 1000;
    mat4.rotate(
      viewMatrix,
      vec3.fromValues(Math.sin(now), Math.cos(now), 0),
      1,
      viewMatrix
    );

    mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

    return modelViewProjectionMatrix;
  }

  function frame()
  {
    const transformationMatrix = getTransformationMatrix();
    uniforms.modelViewProjectionMatrix = new Float32Array(transformationMatrix);

    webgpu.submit(submit);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas);
