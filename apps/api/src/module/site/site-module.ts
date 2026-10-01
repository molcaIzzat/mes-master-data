import { asClass, type AwilixContainer } from "awilix";
import { SiteReaderRepository, SiteWriterRepository } from "./site-repository.js";
import { SiteService } from "./site-service.js";

function registerSite(container: AwilixContainer) {
  container.register({
    siteReaderRepository: asClass(SiteReaderRepository).scoped(),
    siteWriterRepository: asClass(SiteWriterRepository).scoped(),
    siteService: asClass(SiteService).scoped(),
  });
}

export { registerSite };
