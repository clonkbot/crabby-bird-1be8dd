import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  players: defineTable({
    username: v.string(),
    odUserId: v.optional(v.id("users")),
    highScore: v.number(),
    gamesPlayed: v.number(),
    createdAt: v.number(),
  }).index("by_username", ["username"])
    .index("by_high_score", ["highScore"]),
  gameScores: defineTable({
    playerId: v.id("players"),
    score: v.number(),
    coralsPassed: v.number(),
    playedAt: v.number(),
  }).index("by_player", ["playerId"])
    .index("by_score", ["score"]),
});
