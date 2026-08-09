import { buildCrudRouter } from "../utils/crudFactory.js";

const router = buildCrudRouter({
  file: "facilities",
  moduleLabel: "المرافق والنقاط الجغرافية",
  feature: "facilities",
});

export default router;
