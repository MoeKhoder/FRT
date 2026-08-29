import { buildCrudRouter } from "../utils/crudFactory.js";

// Each record is one donor's contribution. finances/status reads this list
// directly (not a cached total) to build the bar chart, which is what makes
// it update automatically the moment a new donation is added — there's no
// separate "total" field to keep in sync, it's always computed fresh.
const router = buildCrudRouter({
  file: "donations",
  moduleLabel: "التبرعات",
  feature: "finances",
});

export default router;
