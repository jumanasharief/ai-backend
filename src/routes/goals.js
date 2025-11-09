import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const goalSchema = z.object({
  body: z.object({
    targetWorkoutsPerWeek: z.coerce.number().int().min(0).optional(),
    targetWeight: z.coerce.number().min(0).optional(),
  }).refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" })
});

router.get("/", requireAuth, async (req, res) => {
  const goal = await prisma.goal.findUnique({ where: { userId: req.userId } });
  res.json(goal);
});

router.post("/", requireAuth, validate(goalSchema), async (req, res) => {
  const { targetWorkoutsPerWeek, targetWeight } = req.valid.body;
  const goal = await prisma.goal.upsert({
    where: { userId: req.userId },
    update: {
      ...(targetWorkoutsPerWeek !== undefined && { targetWorkoutsPerWeek }),
      ...(targetWeight !== undefined && { targetWeight }),
    },
    create: { userId: req.userId, targetWorkoutsPerWeek, targetWeight }
  });
  res.json(goal);
});

export default router;
