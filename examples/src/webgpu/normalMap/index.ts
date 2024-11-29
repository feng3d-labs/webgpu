import { IGPUBindingResources, IGPUBuffer, IGPURenderPassDescriptor, IGPURenderPipeline, IGPUSampler, IGPUSubmit, IGPUTexture, WebGPU } from "@feng3d/webgpu-renderer";
import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'wgpu-matrix';
import { createBoxMeshWithTangents } from '../../meshes/box';
import normalMapWGSL from './normalMap.wgsl';
import { create3DRenderPipeline, createBindGroupDescriptor, createTextureFromImage, } from './utils';

const init = async (canvas: HTMLCanvasElement, gui: GUI) =>
{
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const webgpu = await new WebGPU().init();

  const MAT4X4_BYTES = 64;
  enum TextureAtlas
  {
    Spiral,
    Toybox,
    BrickWall,
  }

  interface GUISettings
  {
    'Bump Mode':
    | 'Albedo Texture'
    | 'Normal Texture'
    | 'Depth Texture'
    | 'Normal Map'
    | 'Parallax Scale'
    | 'Steep Parallax';
    cameraPosX: number;
    cameraPosY: number;
    cameraPosZ: number;
    lightPosX: number;
    lightPosY: number;
    lightPosZ: number;
    lightIntensity: number;
    depthScale: number;
    depthLayers: number;
    Texture: string;
    'Reset Light': () => void;
  }

  const settings: GUISettings = {
    'Bump Mode': 'Normal Map',
    cameraPosX: 0.0,
    cameraPosY: 0.8,
    cameraPosZ: -1.4,
    lightPosX: 1.7,
    lightPosY: 0.7,
    lightPosZ: -1.9,
    lightIntensity: 5.0,
    depthScale: 0.05,
    depthLayers: 16,
    Texture: 'Spiral',
    'Reset Light': () =>
    {
      return;
    },
  };

  // Create normal mapping resources and pipeline
  const depthTexture: IGPUTexture = {
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  };

  const spaceTransformsBuffer: IGPUBuffer = {
    // Buffer holding projection, view, and model matrices plus padding bytes
    size: MAT4X4_BYTES * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  };

  const mapInfoBuffer: IGPUBuffer = {
    // Buffer holding mapping type, light uniforms, and depth uniforms
    size: Float32Array.BYTES_PER_ELEMENT * 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  };
  const mapInfoArray = new ArrayBuffer(mapInfoBuffer.size);
  const mapInfoView = new DataView(mapInfoArray, 0, mapInfoArray.byteLength);

  // Fetch the image and upload it into a GPUTexture.
  let woodAlbedoTexture: IGPUTexture;
  {
    const response = await fetch('../../../assets/img/wood_albedo.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    woodAlbedoTexture = createTextureFromImage(imageBitmap);
  }

  let spiralNormalTexture: IGPUTexture;
  {
    const response = await fetch('../../../assets/img/spiral_normal.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    spiralNormalTexture = createTextureFromImage(imageBitmap);
  }

  let spiralHeightTexture: IGPUTexture;
  {
    const response = await fetch('../../../assets/img/spiral_height.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    spiralHeightTexture = createTextureFromImage(imageBitmap);
  }

  let toyboxNormalTexture: IGPUTexture;
  {
    const response = await fetch('../../../assets/img/toybox_normal.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    toyboxNormalTexture = createTextureFromImage(imageBitmap);
  }

  let toyboxHeightTexture: IGPUTexture;
  {
    const response = await fetch('../../../assets/img/toybox_height.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    toyboxHeightTexture = createTextureFromImage(imageBitmap);
  }

  let brickwallAlbedoTexture: IGPUTexture;
  {
    const response = await fetch('../../../assets/img/brickwall_albedo.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    brickwallAlbedoTexture = createTextureFromImage(imageBitmap);
  }

  let brickwallNormalTexture: IGPUTexture;
  {
    const response = await fetch('../../../assets/img/brickwall_normal.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    brickwallNormalTexture = createTextureFromImage(imageBitmap);
  }

  let brickwallHeightTexture: IGPUTexture;
  {
    const response = await fetch('../../../assets/img/brickwall_height.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    brickwallHeightTexture = createTextureFromImage(imageBitmap);
  }

  // Create a sampler with linear filtering for smooth interpolation.
  const sampler: IGPUSampler = {
    magFilter: 'linear',
    minFilter: 'linear',
  };

  const renderPassDescriptor: IGPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: { texture: { context: { canvasId: canvas.id } } },

        clearValue: [0, 0, 0, 1],
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

  const box = createBoxMeshWithTangents(1.0, 1.0, 1.0);

  // Uniform bindGroups and bindGroupLayout
  const spaceTransform = {
    worldViewProjMatrix: undefined,
    worldViewMatrix: undefined,
  };
  const mapInfo = {
    lightPosVS: undefined,
    mode: undefined,
    lightIntensity: undefined,
    depthScale: undefined,
    depthLayers: undefined,
  };

  const bindingResources: IGPUBindingResources = {
    spaceTransform,
    mapInfo,
    // Texture bindGroups and bindGroupLayout
    textureSampler: sampler,
    albedoTexture: { texture: woodAlbedoTexture },
    normalTexture: { texture: spiralNormalTexture },
    depthTexture: { texture: spiralHeightTexture },
  };

  const bindingResourcesList = [
    bindingResources,
    {
      ...bindingResources,
      albedoTexture: { texture: woodAlbedoTexture },
      normalTexture: { texture: toyboxNormalTexture },
      depthTexture: { texture: toyboxHeightTexture },
    },
    {
      ...bindingResources,
      albedoTexture: { texture: brickwallAlbedoTexture },
      normalTexture: { texture: brickwallNormalTexture },
      depthTexture: { texture: brickwallHeightTexture },
    },
  ];

  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 0.1, 10.0);

  function getViewMatrix()
  {
    return mat4.lookAt(
      [settings.cameraPosX, settings.cameraPosY, settings.cameraPosZ],
      [0, 0, 0],
      [0, 1, 0]
    );
  }

  function getModelMatrix()
  {
    const modelMatrix = mat4.create();
    mat4.identity(modelMatrix);
    const now = Date.now() / 1000;
    mat4.rotateY(modelMatrix, now * -0.5, modelMatrix);
    return modelMatrix;
  }

  // Change the model mapping type
  const getMode = (): number =>
  {
    switch (settings['Bump Mode'])
    {
      case 'Albedo Texture':
        return 0;
      case 'Normal Texture':
        return 1;
      case 'Depth Texture':
        return 2;
      case 'Normal Map':
        return 3;
      case 'Parallax Scale':
        return 4;
      case 'Steep Parallax':
        return 5;
    }
  };

  const texturedCubePipeline: IGPURenderPipeline = create3DRenderPipeline(
    'NormalMappingRender',
    normalMapWGSL,
    // Position,   normal       uv           tangent      bitangent
    normalMapWGSL,
    true
  );

  let currentSurfaceBindGroup = 0;
  const onChangeTexture = () =>
  {
    currentSurfaceBindGroup = TextureAtlas[settings.Texture];
  };

  gui.add(settings, 'Bump Mode', [
    'Albedo Texture',
    'Normal Texture',
    'Depth Texture',
    'Normal Map',
    'Parallax Scale',
    'Steep Parallax',
  ]);
  gui
    .add(settings, 'Texture', ['Spiral', 'Toybox', 'BrickWall'])
    .onChange(onChangeTexture);
  const lightFolder = gui.addFolder('Light');
  const depthFolder = gui.addFolder('Depth');
  lightFolder.add(settings, 'Reset Light').onChange(() =>
  {
    lightPosXController.setValue(1.7);
    lightPosYController.setValue(0.7);
    lightPosZController.setValue(-1.9);
    lightIntensityController.setValue(5.0);
  });
  const lightPosXController = lightFolder
    .add(settings, 'lightPosX', -5, 5)
    .step(0.1);
  const lightPosYController = lightFolder
    .add(settings, 'lightPosY', -5, 5)
    .step(0.1);
  const lightPosZController = lightFolder
    .add(settings, 'lightPosZ', -5, 5)
    .step(0.1);
  const lightIntensityController = lightFolder
    .add(settings, 'lightIntensity', 0.0, 10)
    .step(0.1);
  depthFolder.add(settings, 'depthScale', 0.0, 0.1).step(0.01);
  depthFolder.add(settings, 'depthLayers', 1, 32).step(1);

  function frame()
  {
    // Update spaceTransformsBuffer
    const viewMatrix = getViewMatrix();
    const worldViewMatrix = mat4.mul(viewMatrix, getModelMatrix());
    const worldViewProjMatrix = mat4.mul(projectionMatrix, worldViewMatrix);

    spaceTransform.worldViewMatrix = worldViewMatrix;
    spaceTransform.worldViewProjMatrix = worldViewProjMatrix;
    spaceTransform.worldViewMatrix = new Float32Array([-1,0,0,0,0,0.8682431578636169,0.49613896012306213,0,0,0.49613896012306213,-0.8682431578636169,0,0,1.7881394143159923e-8,-1.6124515533447266,1]);
    spaceTransform.worldViewProjMatrix = new Float32Array([0.09264609962701797,0.6813279390335083,0.8750241994857788,0.8662739992141724,0,1.195034146308899,-0.5011504292488098,-0.49613896012306213,1.373260259628296,-0.04596533998847008,-0.05903293192386627,-0.058442603796720505,0,2.4611626514570162e-8,1.527728796005249,1.6124515533447266]);

    // Update mapInfoBuffer
    const lightPosWS = vec3.create(
      settings.lightPosX,
      settings.lightPosY,
      settings.lightPosZ
    );
    const lightPosVS = vec3.transformMat4(lightPosWS, viewMatrix);
    const mode = getMode();
    // struct MapInfo {
    //   lightPosVS: vec3f,
    //   mode: u32,
    //   lightIntensity: f32,
    //   depthScale: f32,
    //   depthLayers: f32,
    // }
    mapInfo.lightPosVS = lightPosVS;
    mapInfo.mode = mode;
    mapInfo.lightIntensity = settings.lightIntensity;
    mapInfo.depthScale = settings.depthScale;
    mapInfo.depthLayers = settings.depthLayers;

    const submit: IGPUSubmit = {
      commandEncoders: [{
        passEncoders: [{
          descriptor: renderPassDescriptor,
          renderObjects: [{
            pipeline: texturedCubePipeline,
            vertices: {
              position: { data: box.vertices, offset: 0, vertexSize: box.vertexStride },
              normal: { data: box.vertices, offset: 12, vertexSize: box.vertexStride },
              uv: { data: box.vertices, offset: 24, vertexSize: box.vertexStride },
              vert_tan: { data: box.vertices, offset: 32, vertexSize: box.vertexStride },
              vert_bitan: { data: box.vertices, offset: 44, vertexSize: box.vertexStride },
            },
            indices: box.indices,
            bindingResources: bindingResourcesList[currentSurfaceBindGroup],
            drawIndexed: { indexCount: box.indices.length },
          }],
        }]
      }]
    };
    webgpu.submit(submit);

    // const commandEncoder = device.createCommandEncoder();
    // const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    // // Draw textured Cube
    // passEncoder.setPipeline(texturedCubePipeline);
    // passEncoder.setBindGroup(0, frameBGDescriptor.bindGroups[0]);
    // passEncoder.setBindGroup(
    //   1,
    //   surfaceBGDescriptor.bindGroups[currentSurfaceBindGroup]
    // );
    // passEncoder.setVertexBuffer(0, box.vertexBuffer);
    // passEncoder.setIndexBuffer(box.indexBuffer, 'uint16');
    // passEncoder.drawIndexed(box.indexCount);
    // passEncoder.end();
    // device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const panel = new GUI();
const webgpuCanvas = document.getElementById("webgpu") as HTMLCanvasElement;
init(webgpuCanvas, panel);
