import { asClass, type AwilixContainer } from "awilix";

import { TimezoneReaderRepository } from "./timezone-repository.js";
import { TimezoneService } from "./timezone-service.js";

function registerTimezone(container: AwilixContainer) {
  container.register({
    timezoneReaderRepository: asClass(TimezoneReaderRepository).scoped(),
    timezoneService: asClass(TimezoneService).scoped(),
  });
}

export { registerTimezone };
