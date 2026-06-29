import React from "react";

export default function StatusBadge({ status }) {
  const statusStyles = {
    CHECKED_OUT: "bg-green-100 text-green-700",
    CHECKED_IN: "bg-blue-100 text-blue-700",
    LATE: "bg-orange-100 text-orange-700",
    ON_BREAK: "bg-yellow-100 text-yellow-700",
    BACK_TO_WORK: "bg-blue-100 text-blue-700",
    ON_LEAVE: "bg-red-100 text-red-700",
    HALF_DAY_LEAVE: "bg-purple-100 text-purple-700",
  };

  const labels = {
    CHECKED_OUT: "Checked Out",
    CHECKED_IN: "Checked In",
    LATE: "Late",
    ON_BREAK: "On Break",
    BACK_TO_WORK: "Back to Work",
    ON_LEAVE: "On Leave",
    HALF_DAY_LEAVE: "Half Day Leave",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        statusStyles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
