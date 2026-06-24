import * as p from "drizzle-orm/pg-core";
import { ulid } from "ulidx";

const defaultColumns = () => ({
  id: p
    .varchar({ length: 26 })
    .primaryKey()
    .$defaultFn(() => ulid()),
  region: p.varchar({ length: 10 }).notNull(),
  createdAt: p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const defaultIndexes = (
  t: {
    region: p.PgColumn;
    updatedAt: p.PgColumn;
  },
  tableName: string,
) => [p.index(`${tableName}_region_org_updated_idx`).on(t.region, t.updatedAt)];

export const postTable = p.pgTable(
  "posts",
  {
    ...defaultColumns(),
    content: p.varchar({ length: 255 }).notNull(),
    mediaUrl: p.text().notNull(),
    userId: p.varchar("user_id", { length: 255 }).notNull(),
    name: p.varchar({ length: 255 }).notNull(),
  },
  (t) => [...defaultIndexes(t, "posts"), p.index("posts_user_id_idx").on(t.userId)],
);

export const commentTable = p.pgTable(
  "comments",
  {
    ...defaultColumns(),
    content: p.varchar({ length: 255 }).notNull(),
    userId: p.varchar("user_id", { length: 255 }).notNull(),
    postId: p.varchar("post_id", { length: 26 }).notNull(),
    name: p.varchar({ length: 255 }).notNull(),
  },
  (t) => [
    ...defaultIndexes(t, "comments"),
    p.index("comments_user_id_idx").on(t.userId),
    p.index("comments_post_id_idx").on(t.postId),
  ],
);
