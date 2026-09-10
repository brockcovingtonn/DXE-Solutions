import { TRAINING_CATEGORIES } from '@/lib/constants';

// A quiz counts as passed at 80% or better.
export const QUIZ_PASS_PCT = 80;

// Given the categories that actually have training steps, returns them
// in the canonical course order (TRAINING_CATEGORIES), dropping any that
// are empty. This is the module sequence the course walks through.
export function orderedModules(categoriesWithSteps) {
  const has = new Set(categoriesWithSteps);
  const known = TRAINING_CATEGORIES.filter((c) => has.has(c));
  // Anything with steps but not in the canonical list goes last, in
  // whatever order it arrived.
  const extra = [...has].filter((c) => !TRAINING_CATEGORIES.includes(c));
  return [...known, ...extra];
}

// A module is unlocked if it's the first one, or the module before it
// has been passed. progressByCategory: { [category]: { passed, reviewed, best_score } }
export function isModuleUnlocked(index, modules, progressByCategory) {
  if (index <= 0) return true;
  const prev = modules[index - 1];
  return Boolean(progressByCategory[prev]?.passed);
}

// The module the employee should resume on: the first not-yet-passed
// unlocked module, or the last module if everything is passed.
export function resumeModuleIndex(modules, progressByCategory) {
  for (let i = 0; i < modules.length; i++) {
    if (!progressByCategory[modules[i]]?.passed) return i;
  }
  return Math.max(0, modules.length - 1);
}

export function courseCompletion(modules, progressByCategory) {
  const passed = modules.filter((m) => progressByCategory[m]?.passed).length;
  return { passed, total: modules.length, pct: modules.length ? Math.round((passed / modules.length) * 100) : 0 };
}
