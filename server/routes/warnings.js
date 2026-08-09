import { buildCrudRouter } from "../utils/crudFactory.js";

// Disciplinary warnings/notes on a member's file. Governed by the same
// "members" feature permission as the rest of member-file management.
const router = buildCrudRouter({
  file: "warnings",
  moduleLabel: "إنذارات الأعضاء",
  feature: "members",
});

export default router;
