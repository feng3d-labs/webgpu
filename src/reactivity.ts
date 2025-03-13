import { UnReadonly } from "@feng3d/render-api";
import { reactive as vueReactive } from "@vue/reactivity";

export { computed, type ComputedRef, effect } from "@vue/reactivity";

/**
 * Vue响应式。
 * 
 * 额外把只读属性去掉（引擎希望原始数据只用于访问，不直接修改，通过修改响应式数据来触发引擎更新逻辑并间接修改原始数据）。
 */
export const reactive: <T extends object>(target: T) => UnReadonly<T> = vueReactive as any;

