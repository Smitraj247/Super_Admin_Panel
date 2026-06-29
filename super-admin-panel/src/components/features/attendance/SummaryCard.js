import React from "react";

export default function SummaryCard({ title, value, icon, color }) {
  return (
    <div
      className={`bg-gradient-to-r ${color} text-white rounded-xl p-3 shadow-sm`}
    >
      <div className="flex justify-between items-center mb-3">{icon}</div>
      <h2 className="text-3xl font-bold">{value}</h2>
      <p className="text-sm opacity-90">{title}</p>
    </div>
  );
}
