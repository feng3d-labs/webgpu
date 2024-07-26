import { assert, describe, it } from "vitest";
const { ok, equal, deepEqual, strictEqual } = assert;

import { GPUVertexFormatValue, WGSLVertexType, gpuVertexFormatMap, wgslVertexTypeMap } from "../../src/types/VertexFormat";

describe("VertexFormat", () =>
{
    const WGSLVertexTypes: WGSLVertexType[] = [
        "vec2<u32>",
        "vec4<u32>",
        "vec2<i32>",
        "vec4<i32>",
        "vec2<f32>",
        "vec4<f32>",
        "vec2<f16>",
        "vec4<f16>",
        "f32",
        "vec3<f32>",
        "u32",
        "vec3<u32>",
        "i32",
        "vec3<i32>",
    ];

    const GPUVertexFormats: GPUVertexFormat[] = [
        "uint8x2",
        "uint8x4",
        "sint8x2",
        "sint8x4",
        "unorm8x2",
        "unorm8x4",
        "snorm8x2",
        "snorm8x4",
        "uint16x2",
        "uint16x4",
        "sint16x2",
        "sint16x4",
        "unorm16x2",
        "unorm16x4",
        "snorm16x2",
        "snorm16x4",
        "float16x2",
        "float16x4",
        "float32",
        "float32x2",
        "float32x3",
        "float32x4",
        "uint32",
        "uint32x2",
        "uint32x3",
        "uint32x4",
        "sint32",
        "sint32x2",
        "sint32x3",
        "sint32x4",
    ];

    it("constructor", () =>
    {
        const wgslVertexTypes = Object.keys(wgslVertexTypeMap) as WGSLVertexType[];
        equal(wgslVertexTypes.length, WGSLVertexTypes.length);

        const gpuVertexFormats = Object.keys(gpuVertexFormatMap) as GPUVertexFormat[];
        equal(gpuVertexFormats.length, GPUVertexFormats.length);

        //
        wgslVertexTypes.forEach((wgslVertexType) =>
        {
            const wgslVertexTypeValue = wgslVertexTypeMap[wgslVertexType];
            ok(wgslVertexTypeValue.possibleFormats.includes(wgslVertexTypeValue.format));

            wgslVertexTypeValue.possibleFormats.forEach((gpuVertexFormat) =>
            {
                const gpuVertexFormatValue = gpuVertexFormatMap[gpuVertexFormat] as GPUVertexFormatValue;

                equal(gpuVertexFormatValue.wgslType, wgslVertexType);
            });
        });
    });
});
