export class Model {
  fillProperties(model: any, config: any): void {
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined) {
        model[key] = value;
      }
    }
  }
}
