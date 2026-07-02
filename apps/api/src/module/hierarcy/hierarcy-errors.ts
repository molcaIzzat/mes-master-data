class DuplicateHierarcyLineError extends Error {
  public readonly codeLine?: string;

  constructor(codeLine?: string) {
    super(codeLine ? `line with code "${codeLine}" already exists` : "line already exists");
    this.name = "DuplicateHierarcyLineError";
    this.codeLine = codeLine;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateHierarcyLineError.prototype);
  }
}

class InvalidHierarcyLineAreaIdReferenceError extends Error {
  public readonly areaId?: number;

  constructor(areaId?: number) {
    super(areaId ? `area "${areaId}" does not exist` : "area does not exist");
    this.name = "InvalidHierarcyLineAreaIdReferenceError";
    this.areaId = areaId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidHierarcyLineAreaIdReferenceError.prototype);
  }
}

class DuplicateHierarcyMachineError extends Error {
  public readonly codeMachine?: string;

  constructor(codeMachine?: string) {
    super(
      codeMachine ? `machine with code "${codeMachine}" already exists` : "machine already exists",
    );
    this.name = "DuplicateHierarcyMachineError";
    this.codeMachine = codeMachine;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateHierarcyMachineError.prototype);
  }
}

class InvalidHierarcyMachineLineIdReferenceError extends Error {
  public readonly lineId?: number;

  constructor(lineId?: number) {
    super(lineId ? `line "${lineId}" does not exist` : "line does not exist");
    this.name = "InvalidHierarcyMachineLineIdReferenceError";
    this.lineId = lineId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidHierarcyMachineLineIdReferenceError.prototype);
  }
}

class DuplicateHierarcySubMachineError extends Error {
  public readonly codeMachine?: string;

  constructor(codeMachine?: string) {
    super(
      codeMachine ? `machine with code "${codeMachine}" already exists` : "machine already exists",
    );
    this.name = "DuplicateHierarcySubMachineError";
    this.codeMachine = codeMachine;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateHierarcySubMachineError.prototype);
  }
}

class InvalidHierarcySubMachineMachineIdReferenceError extends Error {
  public readonly machineId?: number;

  constructor(machineId?: number) {
    super(machineId ? `machine "${machineId}" does not exist` : "machine does not exist");
    this.name = "InvalidHierarcySubMachineMachineIdReferenceError";
    this.machineId = machineId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidHierarcySubMachineMachineIdReferenceError.prototype);
  }
}

export {
  DuplicateHierarcyLineError,
  InvalidHierarcyLineAreaIdReferenceError,
  DuplicateHierarcyMachineError,
  InvalidHierarcyMachineLineIdReferenceError,
  DuplicateHierarcySubMachineError,
  InvalidHierarcySubMachineMachineIdReferenceError,
};
