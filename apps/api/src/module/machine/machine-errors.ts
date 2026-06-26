class DuplicateMachineError extends Error {
  public readonly codeMachine?: string;

  constructor(codeMachine?: string) {
    super(
      codeMachine ? `machine with code "${codeMachine}" already exists` : "machine already exists",
    );
    this.name = "DuplicateMachineError";
    this.codeMachine = codeMachine;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateMachineError.prototype);
  }
}

class DuplicateSubMachineError extends Error {
  public readonly codeSubMachine?: string;

  constructor(codeSubMachine?: string) {
    super(
      codeSubMachine
        ? `sub machine with code "${codeSubMachine}" already exists`
        : "sub machine already exists",
    );
    this.name = "DuplicateSubMachineError";
    this.codeSubMachine = codeSubMachine;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DuplicateSubMachineError.prototype);
  }
}

class InvalidMachineLineIdReferenceError extends Error {
  public readonly lineId?: number;

  constructor(lineId?: number) {
    super(lineId ? `line "${lineId}" does not exist` : "line does not exist");
    this.name = "InvalidMachineLineIdReferenceError";
    this.lineId = lineId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidMachineLineIdReferenceError.prototype);
  }
}

class InvalidSubMachineMachineIdReferenceError extends Error {
  public readonly machineId?: number;

  constructor(machineId?: number) {
    super(machineId ? `machine "${machineId}" does not exist` : "machine does not exist");
    this.name = "InvalidSubMachineMachineIdReferenceError";
    this.machineId = machineId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidSubMachineMachineIdReferenceError.prototype);
  }
}

export {
  DuplicateMachineError,
  DuplicateSubMachineError,
  InvalidMachineLineIdReferenceError,
  InvalidSubMachineMachineIdReferenceError,
};
