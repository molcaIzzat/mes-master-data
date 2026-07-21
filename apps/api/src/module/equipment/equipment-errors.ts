class DuplicateEquipmentError extends Error {
  public readonly codeEquipment?: string;

  constructor(codeEquipment?: string) {
    super(
      codeEquipment
        ? `equipment with code "${codeEquipment}" already exists`
        : "equipment already exists",
    );
    this.name = "DuplicateEquipmentError";
    this.codeEquipment = codeEquipment;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateEquipmentError.prototype);
  }
}

class InvalidEquipmentReferenceError extends Error {
  public readonly columnName?: string;
  public readonly targetId?: string;

  constructor(columnName?: string, targetId?: string) {
    super(
      columnName && targetId
        ? `"${columnName}" with value "${targetId}" does not exist`
        : "references does not exist",
    );
    this.name = "InvalidEquipmentReferenceError";
    this.columnName = columnName;
    this.targetId = targetId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidEquipmentReferenceError.prototype);
  }
}

export { DuplicateEquipmentError, InvalidEquipmentReferenceError };
