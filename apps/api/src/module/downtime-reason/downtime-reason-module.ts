import { asClass, type AwilixContainer } from "awilix";

import {
  DowntimeReasonReaderRepository,
  DowntimeReasonWriterRepository,
} from "./downtime-reason-repository.js";
import { DowntimeReasonService } from "./downtime-reason-service.js";

function registerDowntimeReason(container: AwilixContainer) {
  container.register({
    downtimeReasonReaderRepository: asClass(DowntimeReasonReaderRepository).scoped(),
    downtimeReasonWriterRepository: asClass(DowntimeReasonWriterRepository).scoped(),
    downtimeReasonService: asClass(DowntimeReasonService).scoped(),
  });
}

export { registerDowntimeReason };
