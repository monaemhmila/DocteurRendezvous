"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai";
        await mongoose_1.default.connect(mongoUri);
        console.log("🟢 Connected to MongoDB");
    }
    catch (error) {
        console.error("🔴 MongoDB connection warning: Could not connect to database.");
        console.error(`   (Assurez-vous que MongoDB est installé et tourne localement, ou ajoutez une URI Atlas dans .env)`);
        console.error(`   Détail: ${error.message}`);
        // We don't process.exit(1) here so the server can still start for frontend testing
    }
};
exports.default = connectDB;
//# sourceMappingURL=db.js.map