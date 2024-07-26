export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

export function isTypedArray(arg: any): arg is TypedArray
{
    return !!(arg as TypedArray).buffer;
}
