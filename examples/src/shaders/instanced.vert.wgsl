struct Uniforms {
  modelViewProjectionMatrix: array<mat4x4<f32>, 16>,
}

@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>,
  @location(1) fragPosition: vec4<f32>,
}

@vertex
fn main(
    @builtin(instance_index) instanceIdx: u32,
    @location(0) position: vec4<f32>,
    @location(1) uv: vec2<f32>
) -> VertexOutput {
    var output: VertexOutput;
    output.Position = uniforms.modelViewProjectionMatrix[instanceIdx] * position;
    output.fragUV = uv;
    output.fragPosition = 0.5 * (position + vec4(1.0));
    return output;
}
