const t=`struct FragmentOut {
    @location(0) color0: vec4<f32>,
    @location(1) color1: vec4<f32>
}

@fragment
fn main() -> FragmentOut {

    var output: FragmentOut;
    output.color0 = vec4(1.0, 0.0, 0.0, 1.0);
    output.color1 = vec4(1.0, 1.0, 0.0, 1.0);

    return output;
}
`,e=`@vertex
fn main(
    @builtin(vertex_index) VertexIndex: u32
) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3>(
        vec2(0.0, 0.5),
        vec2(-0.5, -0.5),
        vec2(0.5, -0.5)
    );

    return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
`;export{t as r,e as t};
