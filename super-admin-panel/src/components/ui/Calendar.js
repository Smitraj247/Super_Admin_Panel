"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function Calendar() {
  return (
    <div className="bg-white p-6 rounded-2xl  ">
      <h2 className="text-xl font-bold mb-4">System Calendar</h2>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        events={[
          { title: "Admin Meeting", date: "2026-03-20" },
          { title: "User Report Review", date: "2026-03-22" },
          { title: "Team Building", date: "2026-03-25" },
        ]}
      />
    </div>
  );
}
