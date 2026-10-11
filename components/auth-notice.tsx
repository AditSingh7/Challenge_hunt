"use client";

import { useEffect } from "react";
import { toast } from "./toast";

export default function AuthNotice() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("loggedOut") === "1") {
      toast("Signed out successfully. The arena is open to guests again.", "info");
      params.delete("loggedOut");
      const query = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
    }
  }, []);

  return null;
}
