@group(0) @binding(0) var gBufferPosition: texture_2d<f32>;
@group(0) @binding(1) var gBufferNormal: texture_2d<f32>;
@group(0) @binding(2) var gBufferAlbedo: texture_2d<f32>;

override canvasSizeWidth: f32;
override canvasSizeHeight: f32;

@fragment
fn main(
    @builtin(position) coord: vec4<f32>
) -> @location(0) vec4<f32> {
    var result: vec4<f32>;
    let c = coord.xy / vec2<f32>(canvasSizeWidth, canvasSizeHeight);
    if c.x < 0.33333 {
        result = textureLoad(
            gBufferPosition,
            vec2<i32>(floor(coord.xy)),
            0
        );
    } else if c.x < 0.66667 {
        result = textureLoad(
            gBufferNormal,
            vec2<i32>(floor(coord.xy)),
            0
        );
        result.x = (result.x + 1.0) * 0.5;
        result.y = (result.y + 1.0) * 0.5;
        result.z = (result.z + 1.0) * 0.5;
    } else {
        result = textureLoad(
            gBufferAlbedo,
            vec2<i32>(floor(coord.xy)),
            0
        );
    }
    return result;
}
