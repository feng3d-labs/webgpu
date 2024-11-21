/**
 * 有类型数组构造器。
 */
export type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor;

/**
 * GPU顶点数据类型
 */
export type GPUVertexDataType =
    | "unsigned int"
    | "signed int"
    | "unsigned normalized"
    | "signed normalized"
    | "float"
    ;

/**
 * 顶点数据在WGSL中的类型。
 */
export type WGSLVertexType =
    | "vec2<u32>"
    | "vec4<u32>"
    | "vec2<i32>"
    | "vec4<i32>"
    | "vec2<f32>"
    | "vec4<f32>"
    | "vec2<f16>"
    | "vec4<f16>"
    | "f32"
    | "vec3<f32>"
    | "u32"
    | "vec3<u32>"
    | "i32"
    | "vec3<i32>"
    // 别名
    | "vec3f"
    | "vec4f"
    ;

/**
 * GPU顶点格式对应的信息
 */
export type GPUVertexFormatValue = {
    /**
     * 数据类型。
     */
    dataType: GPUVertexDataType,

    /**
     * 部件数量。
     */
    components: 1 | 2 | 3 | 4,

    /**
     * 所占字节尺寸。
     */
    byteSize: 2 | 4 | 8 | 12 | 16,

    /**
     * 在着色器中对应类型。
     */
    wgslType: WGSLVertexType,

    /**
     * 对应类型数组构造器。
     */
    typedArrayConstructor: TypedArrayConstructor,
};

/**
 * 顶点格式对应信息映射
 *
 * 以 {@link GPUVertexFormat} 为键值。
 *
 * @see https://www.orillusion.com/zh/webgpu.html#vertex-formats
 */
export const gpuVertexFormatMap: Record<GPUVertexFormat, GPUVertexFormatValue> = {
    uint8x2: { dataType: "unsigned int", components: 2, byteSize: 2, wgslType: "vec2<u32>", typedArrayConstructor: Uint8Array },
    uint8x4: { dataType: "unsigned int", components: 4, byteSize: 4, wgslType: "vec4<u32>", typedArrayConstructor: Uint8Array },
    sint8x2: { dataType: "signed int", components: 2, byteSize: 2, wgslType: "vec2<i32>", typedArrayConstructor: Int8Array },
    sint8x4: { dataType: "signed int", components: 4, byteSize: 4, wgslType: "vec4<i32>", typedArrayConstructor: Int8Array },
    unorm8x2: { dataType: "unsigned normalized", components: 2, byteSize: 2, wgslType: "vec2<f32>", typedArrayConstructor: Uint8Array },
    unorm8x4: { dataType: "unsigned normalized", components: 4, byteSize: 4, wgslType: "vec4<f32>", typedArrayConstructor: Uint8Array },
    snorm8x2: { dataType: "signed normalized", components: 2, byteSize: 2, wgslType: "vec2<f32>", typedArrayConstructor: Int8Array },
    snorm8x4: { dataType: "signed normalized", components: 4, byteSize: 4, wgslType: "vec4<f32>", typedArrayConstructor: Int8Array },
    uint16x2: { dataType: "unsigned int", components: 2, byteSize: 4, wgslType: "vec2<u32>", typedArrayConstructor: Uint16Array },
    uint16x4: { dataType: "unsigned int", components: 4, byteSize: 8, wgslType: "vec4<u32>", typedArrayConstructor: Uint16Array },
    sint16x2: { dataType: "signed int", components: 2, byteSize: 4, wgslType: "vec2<i32>", typedArrayConstructor: Int16Array },
    sint16x4: { dataType: "signed int", components: 4, byteSize: 8, wgslType: "vec4<i32>", typedArrayConstructor: Int16Array },
    unorm16x2: { dataType: "unsigned normalized", components: 2, byteSize: 4, wgslType: "vec2<f32>", typedArrayConstructor: Uint16Array },
    unorm16x4: { dataType: "unsigned normalized", components: 4, byteSize: 8, wgslType: "vec4<f32>", typedArrayConstructor: Uint16Array },
    snorm16x2: { dataType: "signed normalized", components: 2, byteSize: 4, wgslType: "vec2<f32>", typedArrayConstructor: Int16Array },
    snorm16x4: { dataType: "signed normalized", components: 4, byteSize: 8, wgslType: "vec4<f32>", typedArrayConstructor: Int16Array },
    float16x2: { dataType: "float", components: 2, byteSize: 4, wgslType: "vec2<f16>", typedArrayConstructor: undefined }, // 没有找到与之对应的 typedArrayConstructor
    float16x4: { dataType: "float", components: 4, byteSize: 8, wgslType: "vec4<f16>", typedArrayConstructor: undefined }, // 没有找到与之对应的 typedArrayConstructor
    float32: { dataType: "float", components: 1, byteSize: 4, wgslType: "f32", typedArrayConstructor: Float32Array },
    float32x2: { dataType: "float", components: 2, byteSize: 8, wgslType: "vec2<f32>", typedArrayConstructor: Float32Array },
    float32x3: { dataType: "float", components: 3, byteSize: 12, wgslType: "vec3<f32>", typedArrayConstructor: Float32Array },
    float32x4: { dataType: "float", components: 4, byteSize: 16, wgslType: "vec4<f32>", typedArrayConstructor: Float32Array },
    uint32: { dataType: "unsigned int", components: 1, byteSize: 4, wgslType: "u32", typedArrayConstructor: Uint32Array },
    uint32x2: { dataType: "unsigned int", components: 2, byteSize: 8, wgslType: "vec2<u32>", typedArrayConstructor: Uint32Array },
    uint32x3: { dataType: "unsigned int", components: 3, byteSize: 12, wgslType: "vec3<u32>", typedArrayConstructor: Uint32Array },
    uint32x4: { dataType: "unsigned int", components: 4, byteSize: 16, wgslType: "vec4<u32>", typedArrayConstructor: Uint32Array },
    sint32: { dataType: "signed int", components: 1, byteSize: 4, wgslType: "i32", typedArrayConstructor: Int32Array },
    sint32x2: { dataType: "signed int", components: 2, byteSize: 8, wgslType: "vec2<i32>", typedArrayConstructor: Int32Array },
    sint32x3: { dataType: "signed int", components: 3, byteSize: 12, wgslType: "vec3<i32>", typedArrayConstructor: Int32Array },
    sint32x4: { dataType: "signed int", components: 4, byteSize: 16, wgslType: "vec4<i32>", typedArrayConstructor: Int32Array },
    "unorm10-10-10-2": { dataType: "unsigned normalized", components: 4, byteSize: 4, wgslType: "vec4<f32>", typedArrayConstructor: Int32Array },
};

/**
 * WGSL着色器中顶点类型对应的GPU顶点数据格式。
 */
export type WGSLVertexTypeValue = {
    /**
     * 默认对应的GPU顶点数据格式。
     */
    format: GPUVertexFormat,

    /**
     * 可能对应的GPU顶点数据格式列表。
     */
    possibleFormats: GPUVertexFormat[],
};

/**
 * WGSL着色器中顶点类型对应的GPU顶点数据格式映射。
 */
export const wgslVertexTypeMap: Record<WGSLVertexType, WGSLVertexTypeValue> = {
    "vec2<u32>": { format: "uint32x2", possibleFormats: ["uint8x2", "uint16x2", "uint32x2"] },
    "vec4<u32>": { format: "uint32x4", possibleFormats: ["uint8x4", "uint16x4", "uint32x4"] },
    "vec2<i32>": { format: "sint32x2", possibleFormats: ["sint8x2", "sint16x2", "sint32x2"] },
    "vec4<i32>": { format: "sint32x4", possibleFormats: ["sint8x4", "sint16x4", "sint32x4"] },
    "vec2<f32>": { format: "float32x2", possibleFormats: ["unorm8x2", "snorm8x2", "unorm16x2", "snorm16x2", "float32x2"] },
    "vec4<f32>": { format: "float32x4", possibleFormats: ["unorm8x4", "snorm8x4", "unorm16x4", "snorm16x4", "float32x4"] },
    "vec2<f16>": { format: "float16x2", possibleFormats: ["float16x2"] },
    "vec4<f16>": { format: "float16x4", possibleFormats: ["float16x4"] },
    f32: { format: "float32", possibleFormats: ["float32"] },
    "vec3<f32>": { format: "float32x3", possibleFormats: ["float32x3"] },
    u32: { format: "uint32", possibleFormats: ["uint32"] },
    "vec3<u32>": { format: "uint32x3", possibleFormats: ["uint32x3"] },
    i32: { format: "sint32", possibleFormats: ["sint32"] },
    "vec3<i32>": { format: "sint32x3", possibleFormats: ["sint32x3"] },
    // 别名
    "vec3f": { format: "float32x3", possibleFormats: ["float32x3"] },
    "vec4f": { format: "float32x4", possibleFormats: ["unorm8x4", "snorm8x4", "unorm16x4", "snorm16x4", "float32x4"] },
};
