import { buildCrudRouter } from "../utils/crudFactory.js";

const router = buildCrudRouter({
  file: "hazards",
  moduleLabel: "المخاطر",
  feature: "hazards",
});

export default router;
