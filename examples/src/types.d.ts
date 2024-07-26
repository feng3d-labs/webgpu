declare global
{
  interface HTMLCanvasElement extends HTMLElement
  {
    getContext(contextId: 'webgpu'): GPUPresentationContext | null;
  }
}

declare module '*.module.css' {
  const styles: { [className: string]: string };
  export default styles;
}

/**
 * @const
 * @readonly
 * @kind module
 * @description Generic shaders
 */
declare module '*.glsl' {
  const shader: string;
  export default shader;
}

/**
 * @const
 * @readonly
 * @kind module
 * @description WebGPU shaders
 */
declare module '*.wgsl' {
  const shader: string;
  export default shader;
}

/**
 * @const
 * @readonly
 * @kind module
 * @description Vertex shaders
 */
declare module '*.vert' {
  const shader: string;
  export default shader;
}

/**
 * @const
 * @readonly
 * @kind module
 * @description Fragment shaders
 */
declare module '*.frag' {
  const shader: string;
  export default shader;
}

/**
 * @const
 * @readonly
 * @kind module
 * @description Vertex shaders
 */
declare module '*.vs' {
  const shader: string;
  export default shader;
}

/**
 * @const
 * @readonly
 * @kind module
 * @description Fragment shaders
 */
declare module '*.fs' {
  const shader: string;
  export default shader;
}
