import { asClass, type AwilixContainer } from "awilix";

import {
  RejectReasonReaderRepository,
  RejectReasonWriterRepository,
} from "./reject-reason-repository.js";
import { RejectReasonService } from "./reject-reason-service.js";

function registerRejectReason(container: AwilixContainer) {
  container.register({
    rejectReasonReaderRepository: asClass(RejectReasonReaderRepository).scoped(),
    rejectReasonWriterRepository: asClass(RejectReasonWriterRepository).scoped(),
    rejectReasonService: asClass(RejectReasonService).scoped(),
  });
}

export { registerRejectReason };
