import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Role from "./models/Roles.models.js";
import Holiday from "./models/Holiday.js";
import User from "./models/User.models.js";
import Department from "./models/Department.models.js";

dotenv.config();
await connectDB();

const seedData = async () => {
  try {
    const roles = [
      {
        name: "SUPER_ADMIN",
        description: "Super Administrator",
        isSystemRole: true,
      },
      { name: "ADMIN", description: "Administrator", isSystemRole: true },
      { name: "USER", description: "Regular User", isSystemRole: true },
    ];

    for (const role of roles) {
      const existing = await Role.findOne({ name: role.name });
      if (!existing) {
        await Role.create(role);
        console.log(`Created role: ${role.name}`);
      } else {
        console.log(`Role ${role.name} already exists`);
      }
    }

    // Create departments
    const departments = [
      { name: "Employee", description: "Employee Department" },
      { name: "HR", description: "Human Resources Department" },
      { name: "SALES", description: "Sales Department" },
    ];

    const deptMap = {};
    for (const dept of departments) {
      const existing = await Department.findOne({ name: dept.name });
      if (existing) {
        deptMap[dept.name] = existing._id;
        console.log(`Department ${dept.name} already exists`);
      } else {
        const created = await Department.create(dept);
        deptMap[dept.name] = created._id;
        console.log(`Created department: ${dept.name}`);
      }
    }


    const superAdminRole = await Role.findOne({ name: "SUPER_ADMIN" });
    const adminRole = await Role.findOne({ name: "ADMIN" });
    const userRole = await Role.findOne({ name: "USER" });

    const testUsers = [
      {
        name: "Super Admin",
        email: "super@admin.com",
        password: "password123",
        role: superAdminRole._id,
        department: null,
      },
      {
        name: "HR User",
        email: "user@hr.com",
        password: "password123",
        role: userRole._id,
        department: deptMap.HR,
      },
      {
        name: "Sales User",
        email: "user@sales.com",
        password: "password123",
        role: userRole._id,
        department: deptMap.SALES,
      },
    ];

    for (const testUser of testUsers) {
      const existing = await User.findOne({ email: testUser.email });
      if (existing) {
        console.log(`User ${testUser.email} already exists`);
      } else {
        await User.create(testUser);
        console.log(
          `Created user: ${testUser.email} (password: ${testUser.password})`,
        );
      }
    }

    await Holiday.deleteMany({});
    const holidays = [
      {
        title: "New Year's Day",
        date: new Date("2026-01-01"),
        type: "national",
        description: "Celebration of the new year",
      },
      {
        title: "Republic Day",
        date: new Date("2026-01-26"),
        type: "national",
        description: "Commemoration of the adoption of the Indian Constitution",
      },
      {
        title: "Maha Shivaratri",
        date: new Date("2026-03-01"),
        type: "festival",
        description: "Festival celebrating Lord Shiva",
      },
      {
        title: "Holi",
        date: new Date("2026-03-14"),
        type: "festival",
        description: "Festival of colors",
      },
      {
        title: "Ram Navami",
        date: new Date("2026-04-06"),
        type: "festival",
        description: "Celebration of Lord Rama's birth",
      },
      {
        title: "Good Friday",
        date: new Date("2026-04-18"),
        type: "national",
        description: "Christian holiday commemorating the crucifixion of Jesus",
      },
      {
        title: "Labour Day",
        date: new Date("2026-05-01"),
        type: "national",
        description: "International Workers' Day",
      },
      {
        title: "Independence Day",
        date: new Date("2026-08-15"),
        type: "national",
        description: "Celebration of India's independence",
      },
      {
        title: "Raksha Bandhan",
        date: new Date("2026-08-16"),
        type: "festival",
        description:
          "Festival celebrating the bond between brothers and sisters",
      },
      {
        title: "Janmashtami",
        date: new Date("2026-08-24"),
        type: "festival",
        description: "Celebration of Lord Krishna's birth",
      },
      {
        title: "Ganesh Chaturthi",
        date: new Date("2026-09-07"),
        type: "festival",
        description: "Festival celebrating Lord Ganesha",
      },
      {
        title: "Dussehra",
        date: new Date("2026-10-12"),
        type: "festival",
        description: "Victory of good over evil",
      },
      {
        title: "Diwali",
        date: new Date("2026-11-01"),
        type: "festival",
        description: "Festival of lights",
      },
      {
        title: "Christmas",
        date: new Date("2026-12-25"),
        type: "national",
        description: "Christian holiday celebrating the birth of Jesus Christ",
      },
    ];

    for (const holiday of holidays) {
      const existing = await Holiday.findOne({
        title: holiday.title,
        date: holiday.date,
      });
      if (!existing) {
        await Holiday.create(holiday);
        console.log(`Created holiday: ${holiday.title}`);
      } else {
        console.log(`Holiday ${holiday.title} already exists`);
      }
    }

    console.log("Seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedData();
