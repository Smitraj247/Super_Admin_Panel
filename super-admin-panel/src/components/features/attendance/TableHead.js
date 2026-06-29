import React from "react";

export default function TableHead({ icon, title }) {
  return (
    <th className="p-4 text-left font-semibold text-gray-700">
      <div className="flex items-center gap-2">
        {icon}
        {title}
      </div>
    </th>
  );
}
