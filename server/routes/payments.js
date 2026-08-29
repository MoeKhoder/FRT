import { buildCrudRouter } from "../utils/crudFactory.js";

// Each record is one payment/expense line item — "ما تم الدفع مقابله" and the
// amount. Combined with donations.js, this is how finances/status computes
// "what's left" (total donations - total payments), so this module and
// donations.js are two halves of one system, not independent lists.
const router = buildCrudRouter({
  file: "payments",
  moduleLabel: "المدفوعات",
  feature: "finances",
});

export default router;
