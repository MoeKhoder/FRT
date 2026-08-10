import { buildCrudRouter } from "../utils/crudFactory.js";

const router = buildCrudRouter({
  file: "missions",
  moduleLabel: "المهام",
  feature: "missions",
});

export default router;
