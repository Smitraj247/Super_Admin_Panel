"use client";

import { useEffect } from "react";

export default function SalesLeave() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/admin/hr/apply-leave";
    }
  }, []);

  return (
    <div className="p-6">
      <p>Redirecting to leave management...</p>
    </div>
  );
}
