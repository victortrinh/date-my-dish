/**
 * Shared recipe UI utilities.
 */

/** Tailwind classes for difficulty badge colors. */
export const difficultyColors: Record<"easy" | "medium" | "hard", string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

/** Full difficulty badge classes (structure + color). */
export const difficultyBadge: Record<"easy" | "medium" | "hard", string> = {
  easy: "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium " + difficultyColors.easy,
  medium: "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium " + difficultyColors.medium,
  hard: "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium " + difficultyColors.hard,
};
