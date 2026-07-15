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

class InvalidEquipmentUnitIdReferenceError extends Error {
  public readonly workUnitId?: number;

  constructor(workUnitId?: number) {
    super(workUnitId ? `work unit "${workUnitId}" does not exist` : "work unit does not exist");
    this.name = "InvalidEquipmentUnitIdReferenceError";
    this.workUnitId = workUnitId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidEquipmentUnitIdReferenceError.prototype);
  }
}

class InvalidEquipmentClassIdReferenceError extends Error {
  public readonly equipmentClassId?: number;

  constructor(equipmentClassId?: number) {
    super(equipmentClassId ? `class "${equipmentClassId}" does not exist` : "class does not exist");
    this.name = "InvalidEquipmentClassIdReferenceError";
    this.equipmentClassId = equipmentClassId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidEquipmentClassIdReferenceError.prototype);
  }
}

class InvalidEquipmentParentIdReferenceError extends Error {
  public readonly parentEquipmentId?: number;

  constructor(parentEquipmentId?: number) {
    super(
      parentEquipmentId ? `class "${parentEquipmentId}" does not exist` : "class does not exist",
    );
    this.name = "InvalidEquipmentParentIdReferenceError";
    this.parentEquipmentId = parentEquipmentId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidEquipmentParentIdReferenceError.prototype);
  }
}

export {
  DuplicateEquipmentError,
  InvalidEquipmentUnitIdReferenceError,
  InvalidEquipmentClassIdReferenceError,
  InvalidEquipmentParentIdReferenceError,
};
