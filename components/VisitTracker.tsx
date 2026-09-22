"use client";

import { useEffect } from "react";
import { trackVisit } from "@/lib/analytics";

export function VisitTracker() {
  useEffect(() => {
    void trackVisit();
  }, []);

  return null;
}
