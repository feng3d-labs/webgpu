import { GUI } from 'dat.gui';

import Common from './common';
import Radiosity from './radiosity';
import Rasterizer from './rasterizer';
import Raytracer from './raytracer';
import Scene from './scene';
import Tonemapper from './tonemapper';

import { ICanvasContext, ICommandEncoder, ISubmit, ITexture, WebGPU } from 'webgpu-renderer';

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const requiredFeatures: GPUFeatureName[]
    = presentationFormat === 'bgra8unorm' ? ['bgra8unorm-storage'] : [];

  const context: ICanvasContext = {
    canvasId: canvas.id,
    configuration: {
      format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
    }
  };

  const params: {
    renderer: 'rasterizer' | 'raytracer';
    rotateCamera: boolean;
  } = {
    renderer: 'rasterizer',
    rotateCamera: true,
  };

  gui.add(params, 'renderer', ['rasterizer', 'raytracer']);
  gui.add(params, 'rotateCamera', true);

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const webgpu = await WebGPU.init(undefined, { requiredFeatures });

  const framebuffer: ITexture = {
    label: 'framebuffer',
    size: [canvas.width, canvas.height],
    format: 'rgba16float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  };

  const scene = new Scene();
  const common = new Common(scene.quadBuffer);
  const radiosity = new Radiosity(common, scene);
  const rasterizer = new Rasterizer(common, scene, radiosity, framebuffer);
  const raytracer = new Raytracer(common, radiosity, framebuffer);
  const tonemapper = new Tonemapper(common, framebuffer, { context });

  // 光栅化渲染
  const rasterizerCommandEncoder: ICommandEncoder = { passEncoders: [] };
  radiosity.encode(rasterizerCommandEncoder);
  rasterizer.encode(rasterizerCommandEncoder);
  tonemapper.encode(rasterizerCommandEncoder);

  // 光线追踪渲染
  const raytracerCommandEncoder: ICommandEncoder = { passEncoders: [] };
  radiosity.encode(raytracerCommandEncoder);
  raytracer.encode(raytracerCommandEncoder);
  tonemapper.encode(raytracerCommandEncoder);

  function frame()
  {
    common.update({
      rotateCamera: params.rotateCamera,
      aspect: canvas.width / canvas.height,
    });
    radiosity.run();

    const submit: ISubmit = {
      commandEncoders: [params.renderer === 'rasterizer' ? rasterizerCommandEncoder : raytracerCommandEncoder]
    };

    webgpu.submit(submit);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

const panel = new GUI({ width: 310 });
const webgpuCanvas = document.getElementById('webgpu') as HTMLCanvasElement;
init(webgpuCanvas, panel);
