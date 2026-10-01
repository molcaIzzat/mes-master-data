class DuplicateEquipmentClassError extends Error {
  public readonly codeEquipmentClass?: string;

  constructor(codeEquipmentClass?: string) {
    super(
      codeEquipmentClass
        ? `class with code "${codeEquipmentClass}" already exists`
        : "class already exists",
    );
    this.name = "DuplicateEquipmentClassError";
    this.codeEquipmentClass = codeEquipmentClass;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateEquipmentClassError.prototype);
  }
}

export { DuplicateEquipmentClassError };
