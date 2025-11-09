import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  const userId = req.userId;

  const [workouts, badges, goals] = await Promise.all([
    prisma.workout.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.badge.findMany({ where: { userId }, orderBy: { awardedAt: "desc" } }),
    prisma.goal.findMany({ where: { userId } }),
  ]);

  const totalReps = workouts.reduce((s, w) => s + w.reps, 0);
  const avgAccuracy = workouts.length
    ? Number((workouts.reduce((s, w) => s + w.accuracy, 0) / workouts.length).toFixed(1))
    : 0;

  const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklySessions = workouts.filter((w) => w.date >= last7).length;

  res.json({
    summary: {
      totalReps,
      avgAccuracy,
      weeklySessions,
    },
    recentWorkouts: workouts.slice(0, 10),
    badges,
    goals,
  });
});

export default router;
