const KEY = "startup-projections/plans/v1";
const MAX_PLANS = 20;

const read = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (plans) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(plans.slice(0, MAX_PLANS)));
  } catch {
    /* storage disabled — the library is a convenience, not a requirement */
  }
};

export function listPlans() {
  return read().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export function makePlan(inputs, name) {
  const stamp = new Date();
  return {
    id: `plan-${stamp.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    name: (name || inputs.companyName || "Untitled plan").trim().slice(0, 60),
    savedAt: stamp.getTime(),
    inputs,
  };
}

export function savePlan(inputs, name) {
  const plan = makePlan(inputs, name);
  const plans = read().filter((item) => item.name !== plan.name || item.id === plan.id);
  plans.unshift(plan);
  write(plans);
  return plan;
}

export function overwritePlan(id, inputs) {
  const plans = read().map((plan) =>
    plan.id === id ? { ...plan, inputs, savedAt: Date.now() } : plan
  );
  write(plans);
  return plans.find((plan) => plan.id === id) || null;
}

export function deletePlan(id) {
  write(read().filter((plan) => plan.id !== id));
}

export function renamePlan(id, name) {
  const clean = (name || "").trim().slice(0, 60);
  if (!clean) return;
  write(read().map((plan) => (plan.id === id ? { ...plan, name: clean } : plan)));
}

export function formatSavedAt(timestamp) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
