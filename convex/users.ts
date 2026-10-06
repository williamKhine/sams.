import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

const nullableString = v.union(v.string(), v.null())

// Profile availability is separate from authentication: null can mean the
// authenticated user's profile webhook has not arrived yet.
export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      name: nullableString,
      imageUrl: nullableString,
      email: nullableString,
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query("users")
      .withIndex("by_issuer_and_clerkId", (q) =>
        q.eq("issuer", identity.issuer).eq("clerkId", identity.subject)
      )
      .unique()
    if (!user || user.deletedAt !== null) return null

    return {
      _id: user._id,
      name: user.name,
      imageUrl: user.imageUrl,
      email: user.email,
    }
  },
})

export const upsertFromClerk = internalMutation({
  args: {
    issuer: v.string(),
    clerkId: v.string(),
    name: nullableString,
    imageUrl: nullableString,
    email: nullableString,
    sourceUpdatedAt: v.number(),
    eventTimestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_issuer_and_clerkId", (q) =>
        q.eq("issuer", args.issuer).eq("clerkId", args.clerkId)
      )
      .unique()

    if (existing) {
      // Clerk user IDs are not reused. A delayed update must never resurrect
      // a deleted account, including when deletion arrived before creation.
      if (existing.deletedAt !== null) return null
      if (
        args.sourceUpdatedAt < existing.sourceUpdatedAt ||
        (args.sourceUpdatedAt === existing.sourceUpdatedAt &&
          args.eventTimestamp <= existing.eventTimestamp)
      ) {
        return null
      }
      await ctx.db.patch("users", existing._id, args)
    } else {
      await ctx.db.insert("users", { ...args, deletedAt: null })
    }
    return null
  },
})

export const deleteFromClerk = internalMutation({
  args: {
    issuer: v.string(),
    clerkId: v.string(),
    eventTimestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_issuer_and_clerkId", (q) =>
        q.eq("issuer", args.issuer).eq("clerkId", args.clerkId)
      )
      .unique()
    if (existing?.deletedAt !== undefined && existing.deletedAt !== null) {
      return null
    }

    // Retain only identity and ordering metadata after account deletion.
    const tombstone = {
      ...args,
      name: null,
      imageUrl: null,
      email: null,
      sourceUpdatedAt: existing?.sourceUpdatedAt ?? 0,
      deletedAt: args.eventTimestamp,
    }
    if (existing) {
      await ctx.db.patch("users", existing._id, tombstone)
    } else {
      await ctx.db.insert("users", tombstone)
    }
    return null
  },
})
