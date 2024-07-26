import { IBindingResources, IBuffer } from 'webgpu-renderer';
import { mat4, vec3 } from 'wgpu-matrix';
import commonWGSL from './common.wgsl';

/**
 * Common holds the shared WGSL between the shaders, including the common uniform buffer.
 */
export default class Common
{
  /** The WGSL of the common shader */
  readonly wgsl = commonWGSL;
  /** The common uniform buffer bind group and layout */
  readonly uniforms: {
    bindGroup: IBindingResources;
  };

  private readonly uniformBuffer: IBuffer;

  private frame = 0;

  constructor(quads: IBuffer)
  {
    this.uniformBuffer = {
      label: 'Common.uniformBuffer',
      size:
        0 //
        + 4 * 16 // mvp
        + 4 * 16 // inv_mvp
        + 4 * 4, // seed
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };

    const bindGroup: IBindingResources = {
      common_uniforms: {
        buffer: this.uniformBuffer,
        offset: 0,
        size: this.uniformBuffer.size,
      },
      quads: {
        buffer: quads,
        offset: 0,
        size: quads.size,
      },
    };

    this.uniforms = { bindGroup };
  }

  /** Updates the uniform buffer data */
  update(params: { rotateCamera: boolean; aspect: number })
  {
    const projectionMatrix = mat4.perspective(
      (2 * Math.PI) / 8,
      params.aspect,
      0.5,
      100
    );

    const viewRotation = params.rotateCamera ? this.frame / 1000 : 0;

    const viewMatrix = mat4.lookAt(
      vec3.fromValues(
        Math.sin(viewRotation) * 15,
        5,
        Math.cos(viewRotation) * 15
      ),
      vec3.fromValues(0, 5, 0),
      vec3.fromValues(0, 1, 0)
    );
    mat4.inverse(viewMatrix, viewMatrix);
    const mvp = mat4.multiply(projectionMatrix, viewMatrix);
    const invMVP = mat4.invert(mvp);

    const uniformDataF32 = new Float32Array(this.uniformBuffer.size / 4);
    const uniformDataU32 = new Uint32Array(uniformDataF32.buffer);
    for (let i = 0; i < 16; i++)
    {
      uniformDataF32[i] = mvp[i];
    }
    for (let i = 0; i < 16; i++)
    {
      uniformDataF32[i + 16] = invMVP[i];
    }
    uniformDataU32[32] = 0xffffffff * Math.random();
    uniformDataU32[33] = 0xffffffff * Math.random();
    uniformDataU32[34] = 0xffffffff * Math.random();

    this.uniformBuffer.writeBuffers = [{ data: uniformDataF32 }];

    this.frame++;
  }
}
