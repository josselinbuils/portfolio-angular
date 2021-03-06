export function V(...args: number[] | number[][]): Vector {
  return new Vector(...args);
}

export class Vector extends Array<number> {
  constructor(...args: number[] | number[][]) {
    if (Array.isArray(args[0])) {
      args = args[0] as number[];
    }
    super(...(args as number[]));
    Object.setPrototypeOf(this, Vector.prototype);
  }

  add(vector: number[]): Vector {
    this[0] += vector[0];
    this[1] += vector[1];
    this[2] += vector[2];
    return this;
  }

  angle(vector: number[]): number {
    return Math.acos(this.dot(vector) / (this.norm() * V(vector).norm()));
  }

  clone(): Vector {
    return V(this);
  }

  cross(vector: number[]): Vector {
    return V(
      this[1] * vector[2] - this[2] * vector[1],
      this[2] * vector[0] - this[0] * vector[2],
      this[0] * vector[1] - this[1] * vector[0],
    );
  }

  distance(point: number[]): number {
    const [x1, y1, z1] = this;
    const [x2, y2, z2] = point;
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
  }

  dot(vector: number[]): number {
    return this[0] * vector[0] + this[1] * vector[1] + this[2] * vector[2];
  }

  mul(factor: number): Vector {
    this[0] *= factor;
    this[1] *= factor;
    this[2] *= factor;
    return this;
  }

  div(factor: number): Vector {
    return this.mul(1 / factor);
  }

  neg(): Vector {
    return this.mul(-1);
  }

  norm(): number {
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
  }

  normalize(): Vector {
    return this.div(this.norm());
  }

  sub(vector: number[]): Vector {
    this[0] -= vector[0];
    this[1] -= vector[1];
    this[2] -= vector[2];
    return this;
  }
}
