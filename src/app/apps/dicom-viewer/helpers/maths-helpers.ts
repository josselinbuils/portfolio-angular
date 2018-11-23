import * as _math from 'mathjs';
import { MathArray, MathJsChain, MathJsStatic, MathType, Matrix } from 'mathjs';

(_math as any).import({
  normalize: (array) => _math.dotDivide(array, _math.norm(array)),
});

export interface MathJsStaticExt extends MathJsStatic {
  chain(value?: any): MathJsChainExt;
  normalize(array: MathArray): MathArray;
}

interface MathJsChainExt extends MathJsChain {
  cross(y: MathArray | Matrix): MathJsChainExt;
  normalize(): MathJsChainExt;
  subtract(y: MathType): MathJsChainExt;
}

export const math = _math as MathJsStaticExt;
