import { verifyWebhook } from "@clerk/backend/webhooks"
import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import { httpAction } from "./_generated/server"

const http = httpRouter()

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET
    const issuer = process.env.CLERK_FRONTEND_API_URL
    if (!signingSecret || !issuer) {
      console.error("Clerk webhook environment variables are missing")
      return new Response("Webhook is not configured", { status: 503 })
    }

    let event
    try {
      // Verify the original request body before reading any event data.
      event = await verifyWebhook(request, { signingSecret })
    } catch {
      return new Response("Invalid webhook signature", { status: 400 })
    }

    // Keep write errors outside the verification catch. A failed transaction
    // must produce a failure response so Clerk can retry the delivery.
    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const user = event.data
        const primaryEmail = user.email_addresses.find(
          (email) => email.id === user.primary_email_address_id
        )
        await ctx.runMutation(internal.users.upsertFromClerk, {
          issuer,
          clerkId: user.id,
          name:
            [user.first_name, user.last_name].filter(Boolean).join(" ") || null,
          imageUrl: user.image_url || null,
          email: primaryEmail?.email_address ?? null,
          sourceUpdatedAt: user.updated_at,
          eventTimestamp: event.timestamp,
        })
        break
      }
      case "user.deleted": {
        const clerkId = event.data.id
        if (!clerkId) {
          return new Response("Missing user ID", { status: 400 })
        }
        await ctx.runMutation(internal.users.deleteFromClerk, {
          issuer,
          clerkId,
          eventTimestamp: event.timestamp,
        })
        break
      }
    }

    return new Response(null, { status: 204 })
  }),
})

export default http
