import * as _math from 'mathjs';
import { MathArray, MathJsChain, MathJsStatic, MathType, Matrix } from 'mathjs';

(_math as any).import({
  angle: (a, b) => {
    return Math.acos(math.chain(a).dot(b).divide((math.norm(a) as number) * (math.norm(b) as number)).done());
  },
  normalize: (array) => _math.dotDivide(array, _math.norm(array)),
});

export interface MathJsStaticExt extends MathJsStatic {
  angle(vector1: MathArray, vector2: MathArray): number;
  chain(value?: any): MathJsChainExt;
  normalize(array: MathArray): MathArray;
}

interface MathJsChainExt extends MathJsChain {
  angle(vector2: MathArray): MathJsChainExt;
  cross(y: MathArray | Matrix): MathJsChainExt;
  multiply(y: MathType): MathJsChainExt;
  normalize(): MathJsChainExt;
  subtract(y: MathType): MathJsChainExt;
}

export const math = _math as MathJsStaticExt;
