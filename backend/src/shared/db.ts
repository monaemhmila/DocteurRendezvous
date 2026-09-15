import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai";
    await mongoose.connect(mongoUri);
    console.log("🟢 Connected to MongoDB");
  } catch (error: any) {
    console.error("🔴 MongoDB connection warning: Could not connect to database.");
    console.error(`   (Assurez-vous que MongoDB est installé et tourne localement, ou ajoutez une URI Atlas dans .env)`);
    console.error(`   Détail: ${error.message}`);
    // We don't process.exit(1) here so the server can still start for frontend testing
  }
};

export default connectDB;
