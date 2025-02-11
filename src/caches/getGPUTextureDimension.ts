import { ITextureDimension } from "@feng3d/render-api";

export function getGPUTextureDimension(dimension: ITextureDimension)
{
    const textureDimension: GPUTextureDimension = dimensionMap[dimension];

return textureDimension;
}
const dimensionMap: { [key: string]: GPUTextureDimension } = {
    "1d": "1d",
    "2d": "2d",
    "2d-array": "2d",
    cube: "2d",
    "cube-array": "3d",
    "3d": "3d",
};
