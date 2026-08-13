import { useEffect, useState } from "react";
import api from "../services/api";

// Fetches a named option list (e.g. "missionTypes") from system settings —
// IT manages these from Settings -> "قوائم الخيارات" without touching code.
// Falls back to the given defaults if that list hasn't been customized yet
// (covers both a fresh install and an existing deployment that predates
// this feature), so behavior never breaks — it only ever adds capability.
export function useOptionList(key, fallback) {
  const [options, setOptions] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/system/settings")
      .then((res) => {
        if (cancelled) return;
        const custom = res.data?.lists?.[key];
        if (Array.isArray(custom) && custom.length > 0) setOptions(custom);
      })
      .catch(() => {
        // network/permission issue — keep the fallback, never break the form
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return options;
}
