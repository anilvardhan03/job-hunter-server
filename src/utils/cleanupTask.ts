import { PrismaClient } from "@prisma/client";
import { userService } from "../modules/user/services/user.service";

/**
 * Periodically purges accounts soft-deleted more than 7 days (1 week) ago.
 * Runs initial check shortly after startup and repeats on the given interval.
 */
export function startAccountPurgeScheduler(
  prisma: PrismaClient,
  intervalMs: number = 24 * 60 * 60 * 1000 // default 24 hours
) {
  const runPurge = async () => {
    try {
      const result = await userService.purgeExpiredDeletedUsers(prisma);
      if (result.purgedCount > 0) {
        console.log(`[AutoPurge] ${result.message}`);
      }
    } catch (err: any) {
      console.error("[AutoPurge] Failed to run expired accounts purge:", err.message);
    }
  };

  // Run initial purge check 5 seconds after startup
  const initialTimeout = setTimeout(runPurge, 5000);

  // Repeat every intervalMs
  const intervalTimer = setInterval(runPurge, intervalMs);

  return {
    stop: () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalTimer);
    },
  };
}
