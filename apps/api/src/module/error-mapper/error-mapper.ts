import { DrizzleQueryError } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { DuplicateAreaError } from "../area/area-errors.js";
import { DuplicateLineError, InvalidLineAreaIdReferenceError } from "../line/line-errors.js";
import {
  DuplicateMachineError,
  DuplicateSubMachineError,
  InvalidMachineLineIdReferenceError,
  InvalidSubMachineMachineIdReferenceError,
} from "../machine/machine-errors.js";
import {
  DuplicateProductError,
  InvalidProductAreaIdReferenceError,
  InvalidProductLineIdReferenceError,
} from "../product/product-errors.js";
import { DuplicateDowntimeReasonError } from "../downtime-reason/downtime-reason-errors.js";
import { DuplicateRejectReasonError } from "../reject-reason/reject-reason-errors.js";
import { DuplicateDowntimeActionError } from "../downtime-action/downtime-action-errors.js";
import {
  DuplicateHierarcyLineError,
  InvalidHierarcyLineAreaIdReferenceError,
  DuplicateHierarcyMachineError,
  InvalidHierarcyMachineLineIdReferenceError,
  DuplicateHierarcySubMachineError,
  InvalidHierarcySubMachineMachineIdReferenceError,
} from "../hierarcy/hierarcy-errors.js";

function mapDomainError(err: unknown): HTTPException | null {
  if (err instanceof HTTPException) return err;

  if (err instanceof InvalidHierarcySubMachineMachineIdReferenceError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateHierarcySubMachineError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof InvalidHierarcyMachineLineIdReferenceError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateHierarcyMachineError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof InvalidHierarcyLineAreaIdReferenceError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateHierarcyLineError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateDowntimeReasonError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateRejectReasonError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateDowntimeActionError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateProductError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof InvalidProductAreaIdReferenceError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof InvalidProductLineIdReferenceError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateAreaError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateLineError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof InvalidLineAreaIdReferenceError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateMachineError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof InvalidMachineLineIdReferenceError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DuplicateSubMachineError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof InvalidSubMachineMachineIdReferenceError) {
    return new HTTPException(409, { message: err.message });
  }

  if (err instanceof DrizzleQueryError) {
    const errCode = (err.cause as Error & { code?: string }).code;

    switch (errCode) {
      case "23505":
        return new HTTPException(409, { message: `[${errCode}] ${err.message}` });
      case "23503":
        return new HTTPException(409, { message: `[${errCode}] ${err.message}` });
      default:
        return new HTTPException(409, { message: `[UNKNOWN_CODE] ${err.message}` });
    }
  }

  return null;
}

export { mapDomainError };
