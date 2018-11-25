export class Model {
  fillProperties(config: any): void {
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined) {
        this[key] = value;
      }
    }
  }

  checkMandatoryFieldsPresence(fields: string[]): void {
    for (const field of fields) {
      if (this[field] === undefined) {
        throw new Error(`Field ${field} is mandatory`);
      }
    }
  }
}
