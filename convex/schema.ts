import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  adminAccounts: defineTable({
    // Better Auth user IDs belong to the component, not an application table.
    authUserId: v.string(),
    role: v.literal("admin"),
  }).index("by_authUserId", ["authUserId"]),
});
