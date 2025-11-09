import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import workoutsRoutes from "./routes/workouts.js";
import dashboardRoutes from "./routes/dashboard.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.use("/api", authRoutes);
app.use("/api", workoutsRoutes);
app.use("/api", dashboardRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running: http://localhost:${PORT}`));
