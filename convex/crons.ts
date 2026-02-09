import { cronJobs } from "convex/server";

const crons = cronJobs();

// M0 baseline: no autonomous schedule enabled until approval flow is fully wired.

export default crons;
