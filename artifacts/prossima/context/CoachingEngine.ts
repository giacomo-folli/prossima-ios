import { ReadinessBreakdown } from './ReadinessEngine';

/**
 * CoachingEngine — pure, rule-based generation of coaching prompts.
 *
 * Evaluates the ReadinessBreakdown and provides an actionable insight
 * mimicking an experienced fitness coach.
 */
export function generateCoachingPrompt(breakdown: Omit<ReadinessBreakdown, 'prompt'>): string {
  if (!breakdown.hasData) {
    return "Wear your Apple Watch or track a workout to get personalized coaching insights.";
  }

  const { hrv, sleep, load, score } = breakdown;
  const isSleepTracked = sleep !== null;

  // 1. Extreme low score (Red Zone)
  if (score < 40) {
    if (hrv < 40 && load < 50) {
      return "Your nervous system is heavily fatigued. Take a full rest day, hydrate, and focus entirely on recovery.";
    }
    if (isSleepTracked && sleep < 40) {
      return "Sleep debt is severely impacting your readiness. Prioritize going to bed early tonight. Skip the gym.";
    }
    return "Your body is waving a red flag today. Keep movement light, like a restorative walk or stretching.";
  }

  // 2. High Sleep, Tanked HRV, High/Moderate Load (Overreaching)
  if (isSleepTracked && sleep >= 70 && hrv < 45) {
    return "You're sleeping well, but you're overreaching. Your central nervous system needs an active recovery day to adapt. Keep your heart rate under 130bpm.";
  }

  // 3. Low Sleep, High HRV (Under-slept but primed)
  if (isSleepTracked && sleep < 50 && hrv >= 65) {
    return "Your nervous system is primed, but you are under-slept. Keep the intensity high but the volume very low today. Get in, hit it hard, get out.";
  }

  // 4. Detraining or very low load recently (Score is decent, but load is low)
  if (score >= 60 && load < 40) {
    return "You are well-recovered but your recent training volume is low. It's a great day to gradually ramp up the intensity and rebuild your base.";
  }

  // 5. Optimal all around (Green Zone)
  if (score >= 80) {
    if (load >= 80) {
      return "All systems go. You are in the optimal zone for both recovery and training load. Push the pace and go for a PR today!";
    }
    return "You're perfectly primed to perform. Don't waste this readiness—hit your hardest workout of the week today.";
  }

  // 6. Moderate readiness / Middle ground
  if (score >= 60) {
    if (hrv < 55) {
      return "Solid readiness, but your HRV is slightly suppressed. Focus on technique over max effort today.";
    }
    return "Good to go. A standard training day is perfect here. Listen to your body during warm-ups to gauge your top-end strength.";
  }

  // 7. Fallback for 40-59 range
  return "You have moderate fatigue. It's a good day for maintenance work or steady-state cardio. Avoid pushing to absolute failure.";
}
