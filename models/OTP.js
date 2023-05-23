import mongoose from "mongoose";
const OtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      max: 50,
      unique: true,
    },
    otp: {
      type: Number,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    resendAttempts: {
      type: Number,
      default: 0,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lastLoginAttempt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const OTP = mongoose.model("OTP", OtpSchema);
export default OTP;
