import User from "../models/User.models.js";

/**
 * Middleware to automatically manage cycle boundary leaf resets.
 *
 * Policy:
 *  - PL/SL : 6 credited per cycle at the start.
 *          6-month cycles are fixed calendar windows:
 *            Cycle 1 → January  – June
 *            Cycle 2 → July     – December
 *          At the START of each new cycle (1 Jan or 1 Jul), any UNUSED PL
 *          from the previous cycle is carried forward into the fresh balance.
 *          If user joins in middle of a cycle, pro-rate PL/SL based on joining month.
 *
 *  - SL : Reset to 6 at cycle start. No carry-forward ever.
 *  - DL : Computed dynamically on the fly. No longer stored/updated here.
 *  - CL : Unlimited — stored as sentinel value 9999. Never changed.
 */

const getCurrentCycleStart = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  return month < 6
    ? new Date(year, 0, 1) // January 1
    : new Date(year, 6, 1); // July 1
};

const getNextCycleStart = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  return month < 6
    ? new Date(year, 6, 1) // Next is July 1
    : new Date(year + 1, 0, 1); // Next is Jan 1
};

// Helper to calculate pro-rated PL/SL for a cycle based on joining month
const getProRatedLeave = (joiningMonth, cycleStartMonth) => {
  // joiningMonth and cycleStartMonth are 0-indexed (0 = Jan, 6 = July)
  const monthsInCycle = 6;
  // Calculate how many months are left in the cycle after (and including) joining month
  let remainingMonths;
  if (cycleStartMonth === 0) {
    // Jan-Jun cycle
    if (joiningMonth < 0 || joiningMonth > 5) return 0;
    remainingMonths = 6 - joiningMonth;
  } else {
    // July-Dec cycle (cycleStartMonth = 6)
    if (joiningMonth < 6 || joiningMonth > 11) return 0;
    remainingMonths = 12 - joiningMonth;
  }
  // 6 days per cycle → 1 day per month
  return remainingMonths;
};

export const autoRefillLeaves = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) return next();

    const user = await User.findById(req.user._id);
    if (!user) return next();

    const now = new Date();
    const currentCycleStart = getCurrentCycleStart(now);

    // Leaves (PL/SL/DL) are available only after probation bonding starts.
    // If probationStartDate is missing, user can only take CL.
    const isLeavesOnboarded = !!user.probationStartDate;

    if (!isLeavesOnboarded) {
      user.leaveBalance.PL = 0;
      user.leaveBalance.SL = 0;
      user.leaveBalance.DL = 0;
      user.leaveBalance.CL = 9999;

      // Save to database to ensure consistency
      await user.save();

      // Do not advance lastCycleRefill while not onboarded.
      req.user.leaveBalance = user.leaveBalance;
      return next();
    }

    // Leave credits start after probation (bonding) begins.
    const effectiveDate = user.probationStartDate
      ? new Date(user.probationStartDate)
      : user.joiningDate
        ? new Date(user.joiningDate)
        : new Date(user.createdAt);

    const userLastCycleRefill = user.lastCycleRefill
      ? new Date(user.lastCycleRefill)
      : null;

    // If user has no lastCycleRefill, or lastCycleRefill is before the user's joining date!
    if (
      !user.lastCycleRefill ||
      (userLastCycleRefill && userLastCycleRefill < effectiveDate)
    ) {
      // Pro-rate PL/SL for the current cycle
      const joiningMonth = effectiveDate.getMonth();
      const cycleStartMonth = currentCycleStart.getMonth();
      const proRated = getProRatedLeave(joiningMonth, cycleStartMonth);

      user.leaveBalance.PL = proRated;
      user.leaveBalance.SL = proRated;
      user.lastCycleRefill = currentCycleStart;
      // console.log(
      //   `📊 First cycle refill: Pro-rated PL/SL to ${proRated} for user joining in ${joiningDate.toLocaleDateString()}`,
      // );
      await user.save();
    } else {
      // Normal cycle processing
      let lastCycleRefill = new Date(user.lastCycleRefill);
      let processDate = getNextCycleStart(lastCycleRefill);
      let changed = false;

      // Loop through every cycle boundary missed until we catch up to currentCycleStart
      while (processDate <= currentCycleStart) {
        // Carry forward PL for this boundary
        const carryForwardPL = Math.max(0, user.leaveBalance.PL || 0);
        user.leaveBalance.PL = 6 + carryForwardPL;
        user.leaveBalance.SL = 6;
        user.leaveBalance.DL = 0; // reset DL DB state for cleanliness
        user.lastCycleRefill = processDate;

        console.log(
          `🔁 Cycle boundary hit (${processDate.toLocaleDateString()}): Carried forward ${carryForwardPL} PL. Reset SL to 6.`,
        );

        processDate = getNextCycleStart(processDate);
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    if (!user.leaveBalance.CL || user.leaveBalance.CL !== 9999) {
      user.leaveBalance.CL = 9999;
    }

    // Only save if we need to (don't always save to avoid unnecessary writes)
    if (user.isModified()) {
      await user.save();
    }

    // Keep req.user in sync so downstream handlers see the fresh balance
    req.user.leaveBalance = user.leaveBalance;

    next();
  } catch (error) {
    console.error("Error in autoRefillLeaves middleware:", error);
    next(); // Don't block request even if refill fails
  }
};
