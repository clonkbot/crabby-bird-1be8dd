import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});

export const getCurrentPlayer = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});

export const createPlayer = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("players")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("players", {
      username: args.username,
      highScore: 0,
      gamesPlayed: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateHighScore = mutation({
  args: { username: v.string(), score: v.number(), coralsPassed: v.number() },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!player) {
      throw new Error("Player not found");
    }

    // Record the game score
    await ctx.db.insert("gameScores", {
      playerId: player._id,
      score: args.score,
      coralsPassed: args.coralsPassed,
      playedAt: Date.now(),
    });

    // Update player stats
    const newHighScore = Math.max(player.highScore, args.score);
    await ctx.db.patch(player._id, {
      highScore: newHighScore,
      gamesPlayed: player.gamesPlayed + 1,
    });

    return newHighScore;
  },
});

export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("players")
      .withIndex("by_high_score")
      .order("desc")
      .take(10);
  },
});
