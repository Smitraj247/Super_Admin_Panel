"use client";

import { Users, Clock, AlertCircle, UserX, Coffee } from "lucide-react";

export default function AttendanceStats({ stats }) {
  const statCards = [
    {
      title: "Present Today",
      value: stats?.presentToday ?? 0,
      change: "Live data",
      changeType: "positive",
      icon: Users,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: [20, 22, 19, 23, 21, stats?.presentToday ?? 0],
    },
    {
      title: "Total Work Hours",
      value:
        typeof stats?.totalWorkHours === "number"
          ? `${stats.totalWorkHours}h`
          : "0h",
      change: "Live data",
      changeType: "neutral",
      icon: Clock,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      trend: [95, 96, 97, 98, 99, stats?.totalWorkHours ?? 0],
    },
    {
      title: "Late Check-ins",
      value: stats?.lateCheckIns ?? 0,
      change: "Live data",
      changeType: "negative",
      icon: AlertCircle,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      trend: [5, 4, 6, 3, 4, stats?.lateCheckIns ?? 0],
    },
    {
      title: "Absent Today",
      value: stats?.absentToday ?? 0,
      change: "Live data",
      changeType: "negative",
      icon: UserX,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      trend: [3, 2, 4, 3, 2, stats?.absentToday ?? 0],
    },
    {
      title: "On Break",
      value: stats?.onBreak ?? 0,
      change: "Live data",
      changeType: "neutral",
      icon: Coffee,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      trend: [3, 5, 4, 6, 5, stats?.onBreak ?? 0],
    },
  ];
  //
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {statCards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}
            >
              <card.icon className={card.iconColor} size={24} />
            </div>
          </div>

          <div className="mb-2">
            <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
            <p className="text-sm text-slate-600 mt-1">{card.title}</p>
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium ${
                card.changeType === "positive"
                  ? "text-green-600"
                  : card.changeType === "negative"
                    ? "text-red-600"
                    : "text-slate-600"
              }`}
            >
              {card.changeType === "positive" && "↑ "}
              {card.changeType === "negative" && "↓ "}
              {card.change}
            </span>

            {/* Mini trend chart */}
            <div className="flex items-end gap-0.5 h-6">
              {card.trend.map((height, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full ${
                    card.changeType === "positive"
                      ? "bg-green-300"
                      : card.changeType === "negative"
                        ? "bg-red-300"
                        : "bg-blue-300"
                  }`}
                  style={{
                    height: `${(height / Math.max(...card.trend)) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
