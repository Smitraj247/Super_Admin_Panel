import mongoose from "mongoose";
import dotenv from "dotenv";
import Chat from "./models/Chat.js";

dotenv.config();

async function cleanupChats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all direct chats with only one participant
    const chatsToDeactivate = await Chat.find({  
      isGroupChat: false,
      $expr: { $eq: [{ $size: "$participants" }, 1] },
    });

    console.log(`Found ${chatsToDeactivate.length} chats to deactivate`);

    if (chatsToDeactivate.length > 0) {
      await Chat.updateMany(
        { _id: { $in: chatsToDeactivate.map(c => c._id) } },
        { isActive: false }
      );
      console.log("Successfully deactivated chats");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error cleaning up chats:", error);
    process.exit(1);
  }
}

cleanupChats();