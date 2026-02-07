import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "orchestrator-daily-run",
  { hourUTC: 7, minuteUTC: 0 },
  internal.orchestrator.dailyAutonomousRun,
  {}
);

crons.weekly(
  "orchestrator-weekly-brief",
  { dayOfWeek: "monday", hourUTC: 7, minuteUTC: 30 },
  internal.orchestrator.weeklyBriefRun,
  {}
);

export default crons;
