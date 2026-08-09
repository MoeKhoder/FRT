import { buildCrudRouter } from "../utils/crudFactory.js";

const router = buildCrudRouter({
  file: "inventory",
  moduleLabel: "المخزون",
  feature: "inventory",
  uniqueFields: ["serialNumber"],
});

export default router;
