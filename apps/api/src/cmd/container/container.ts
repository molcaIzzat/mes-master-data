import {
  type AwilixContainer,
  createContainer as newContainer,
  InjectionMode,
  asValue,
  asFunction,
} from "awilix";

import type { Probe } from "../../module/health/health-service.js";
import type { AppConfig } from "../../shared/config/config.js";
import type { PostgresDB } from "../../shared/database/postgres.js";

import { baseLogger } from "@molca/observability";
import { registerInfra } from "../../shared/infra-module.js";
import { registerHealth } from "../../module/health/health-module.js";
import { registerComment } from "../../module/comment/comment-module.js";
import { registerPost } from "../../module/post/post-module.js";
import type { CommentReader, CommentWriter } from "../../module/comment/comment-repository.js";
import type { TCommentService } from "../../module/comment/comment-service.js";
import type { CommentClientContract } from "@molca/contract-client";
import type { PostReader, PostWriter } from "../../module/post/post-repository.js";
import type { TPostService } from "../../module/post/post-service.js";
import type { AuthMiddleware } from "@molca/security";

type Cradle = {
  db: PostgresDB;
  authMw: AuthMiddleware;
  keycloakProbe: Probe;
  postgresProbe: Probe;
  commentReaderRepository: CommentReader;
  commentWriterRepository: CommentWriter;
  commentService: TCommentService;
  commentClient: CommentClientContract;
  postReaderRepository: PostReader;
  postWriterRepository: PostWriter;
  postService: TPostService;
};

function createContainer(config: AppConfig): AwilixContainer<Cradle> {
  const container: AwilixContainer<Cradle> = newContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    region: asValue(config.region),
    logger: asFunction(() => baseLogger).singleton(),
  });
  registerInfra(container, config);
  registerHealth(container, config);
  registerComment(container);
  registerPost(container);

  return container;
}

export { createContainer };
export type { Cradle };
