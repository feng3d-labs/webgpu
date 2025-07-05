import { effect, EffectScope, Reactive, reactive } from '@feng3d/reactivity';

export class ReactiveClass
{
    /** 响应式实例 */
    readonly _r_this: Reactive<this> = reactive(this);

    /** 副作用作用域 */
    private _effectScope = new EffectScope();

    /**
     * 运行副作用，在销毁时会自动停止
     * @param fn 副作用函数
     */
    effect(fn: () => void)
    {
        this._effectScope.run(() =>
        {
            effect(fn);
        });
    }

    /**
     * 销毁
     */
    destroy()
    {
        // 停止副作用作用域
        this._effectScope.stop();
        this._effectScope = null;
    }
}
