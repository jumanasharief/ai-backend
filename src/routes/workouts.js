import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const submitSchema = z.object({
  body: z.object({
    type: z.string().min(2),
    reps: z.number().int().nonnegative(),
    accuracy: z.number().min(0).max(100),
    date: z.string().optional(), 
  }),
});

router.post("/submit-workout", requireAuth, validate(submitSchema), async (req, res) => {
  const { type, reps, accuracy, date } = req.valid.body;
  const workout = await prisma.workout.create({
    data: {
      userId: req.userId,
      type,
      reps,
      accuracy,
      date: date ? new Date(date) : undefined,
    },
  });

  const badges = [];
  if (reps >= 1) {
    const first = await prisma.badge.findFirst({
      where: { userId: req.userId, name: "First workout" },
    });
    if (!first) {
      const b = await prisma.badge.create({
        data: { userId: req.userId, name: "First workout" },
      });
      badges.push(b);
    }
  }
  if (accuracy >= 90) {
    const ninety = await prisma.badge.create({
      data: { userId: req.userId, name: "90% accuracy" },
    });
    badges.push(ninety);
  }

  return res.json({ workout, newBadges: badges });
});

export default router;
