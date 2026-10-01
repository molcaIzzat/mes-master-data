import { asClass, type AwilixContainer } from "awilix";
import {
  DowntimeActionReaderRepository,
  DowntimeActionWriterRepository,
} from "./downtime-action-repository.js";
import { DowntimeActionService } from "./downtime-action-service.js";

function registerDowntimeAction(container: AwilixContainer) {
  container.register({
    downtimeActionReaderRepository: asClass(DowntimeActionReaderRepository).scoped(),
    downtimeActionWriterRepository: asClass(DowntimeActionWriterRepository).scoped(),
    downtimeActionService: asClass(DowntimeActionService).scoped(),
  });
}

export { registerDowntimeAction };
