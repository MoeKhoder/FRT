import { buildCrudRouter } from "../utils/crudFactory.js";

const router = buildCrudRouter({
  file: "ratings",
  moduleLabel: "التقييمات",
  feature: "ratings",
});

export default router;
