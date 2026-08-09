import { buildCrudRouter } from "../utils/crudFactory.js";

const router = buildCrudRouter({
  file: "missionLogs",
  moduleLabel: "سجلات المهام",
  writeRoles: ["IT", "Administrator", "Assistant"],
});

export default router;
