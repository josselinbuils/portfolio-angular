import { M3 } from './matrix3';

export function M4(...args: number[][][]): Matrix4 {
  return new Matrix4(...args);
}

export class Matrix4 extends Array<number[]> {
  constructor(...args: number[][][]) {
    super(...args[0]);
    Object.setPrototypeOf(this, Matrix4.prototype);
  }

  det(): number {
    let det = 0;

    for (let x = 0; x < 4; x++) {
      det += Math.pow(-1, x) * this[0][x] * M3(this.getSubMatrix(this, x)).det();
    }
    return det;
  }

  mulVec(vector: number[]): number[] {
    const [
      [a, b, c, d],
      [e, f, g, h],
      [i, j, k, l],
      [m, n, o, p],
    ] = this;

    const [q, r, s, t] = vector;

    return [
      a * q + b * r + c * s + d * t,
      e * q + f * r + g * s + h * t,
      i * q + j * r + k * s + l * t,
      m * q + n * r + o * s + p * t,
    ];
  }

  private getSubMatrix(matrix: number[][], index: number): number[][] {
    const m: number[][] = [];

    for (let r = 1; r < 4; r++) {
      m.push([]);
      for (let c = 0; c < 4; c++) {
        if (c === index) {
          continue;
        }
        m[m.length - 1].push(matrix[r][c]);
      }
    }
    return m;
  }
}
