import { buildCrudRouter } from "../utils/crudFactory.js";

const router = buildCrudRouter({
  file: "announcements",
  moduleLabel: "الإعلانات",
  feature: "announcements",
});

export default router;
