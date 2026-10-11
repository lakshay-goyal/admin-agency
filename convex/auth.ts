import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { APIError } from "better-auth/api";
import { username } from "better-auth/plugins";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { isAdminEmail } from "./admin";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

// Only the internal provisioning mutation enables password account creation.
export function createAuth(ctx: GenericCtx<DataModel>, provisionAdmin = false) {
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return betterAuth({
    baseURL: process.env.SITE_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !provisionAdmin,
      autoSignIn: false,
      minPasswordLength: 12,
    },
    socialProviders: googleConfigured
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        }
      : {},
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isAdminEmail(user.email)) {
              throw new APIError("FORBIDDEN", {
                message: "This account does not have admin access.",
              });
            }
            return { data: user };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const user = await authComponent.getAnyUserById(ctx, session.userId);
            if (!user || !isAdminEmail(user.email)) {
              throw new APIError("FORBIDDEN", {
                message: "This account does not have admin access.",
              });
            }
            const role: "admin" | null = await ctx.runQuery(
              internal.adminAccounts.getRole,
              { authUserId: user._id },
            );
            if (role !== "admin") {
              throw new APIError("FORBIDDEN", {
                message: "This account does not have admin access.",
              });
            }
            return { data: session };
          },
        },
      },
    },
    plugins: [username(), convex({ authConfig })],
  });
}

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      name: v.string(),
      email: v.string(),
      username: v.union(v.string(), v.null()),
      role: v.literal("admin"),
    }),
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user || !isAdminEmail(user.email)) return null;
    const account = await ctx.db
      .query("adminAccounts")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", user._id))
      .unique();
    if (!account) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username ?? null,
      role: account.role,
    };
  },
});

export const getLoginOptions = query({
  args: {},
  returns: v.object({ googleEnabled: v.boolean() }),
  handler: async () => ({
    googleEnabled: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
  }),
});
