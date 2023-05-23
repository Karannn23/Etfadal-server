import User from "../models/User.js";
import OTP from "../models/OTP.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const MAX_LOGIN_ATTEMPTS = 3;
const LOCK_TIME_IN_MINUTES = 15 * 60 * 1000;

export const postLogin = async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  });

  if (!user) {
    res.send({ error: "Account not found" });
    return;
  }

  if (user.role != "superadmin") {
    res.send({ error: "Not authorized" });
    return;
  }

  const now = Date.now();
  const failedAttempts = user.failedLoginAttempts;
  const lastLoginAttempt = user.lastLoginAttempt.getTime();
  const oldDate = now - LOCK_TIME_IN_MINUTES - 1000000;
  // Check if user is locked out
  if (
    failedAttempts >= MAX_LOGIN_ATTEMPTS &&
    now - lastLoginAttempt < LOCK_TIME_IN_MINUTES
  ) {
    res.send({
      error: "Too many failed login attempts. Please try again in 15 minutes.",
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(
    req.body.password,
    user.password
  );

  if (isPasswordValid) {
    await User.findOneAndUpdate(
      { email: user.email },
      { failedLoginAttempts: 0, lastLoginAttempt: oldDate }
    );

    const u = await OTP.findOne({ email: user.email });
    var otpGen = Math.floor(100000 + Math.random() * 900000);
    var expiry = now + LOCK_TIME_IN_MINUTES;

    if (!u) {
      const newUser = {
        email: user.email,
        otp: parseInt(otpGen),
        expiresAt: expiry,
      };

      OTP.create(newUser)
        .then((otpuser) => console.log(`User created: ${otpuser.email}`))
        .catch((error) => console.error(error));
    } else if (
      u.failedAttempts >= MAX_LOGIN_ATTEMPTS &&
      now - u.lastLoginAttempt < LOCK_TIME_IN_MINUTES
    ) {
      res.send({
        error: "Too many failed otp attempts. Please try again in some time.",
      });
      return;
    } else {
      otpGen = Math.floor(100000 + Math.random() * 900000);
      await OTP.findOneAndUpdate(
        { email: u.email },
        {
          otp: parseInt(otpGen),
          expiresAt: expiry,
          resendAttempts: 0,
          failedLoginAttempts: 0,
          lastLoginAttempt: oldDate,
        }
      );
      const transpoter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.USER,
          pass: process.env.PASS,
        },
      });
      const msg = "Your otp is " + otpGen + ". It is valid for 15mins.";
      const mailOptions = {
        from: "karansingh.k2312@gmail.com",
        to: u.email,
        subject: "Your Admin OTP",
        text: msg,
      };
      transpoter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          res.send({ error: "Could not send Mail" });
          return;
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    }

    const token = jwt.sign(
      {
        name: user.name,
        email: user.email,
      },
      process.env.SECRET_KEY,
      { expiresIn: "15m" }
    );

    return res.json(token);
  } else {
    console.log("updating login attempts values");
    await User.findOneAndUpdate(
      { email: user.email },
      { $inc: { failedLoginAttempts: 1 }, lastLoginAttempt: Date.now() }
    );
    res.send({ error: "Invalid password" });
    return;
  }
};

export const getOTP = async (req, res) => {
  const user = await OTP.findOne({
    email: req.body.email,
  });

  const now = Date.now();
  const failedAttempts = user.failedLoginAttempts;
  const lastLoginAttempt = user.lastLoginAttempt.getTime();
  const oldDate = now - LOCK_TIME_IN_MINUTES - 1000000;
  // Check if user is locked out
  if (
    failedAttempts >= MAX_LOGIN_ATTEMPTS &&
    now - lastLoginAttempt < LOCK_TIME_IN_MINUTES
  ) {
    // console.log("in maxed out");
    res.send({
      error: "Too many failed otp attempts. Please try again in some time.",
    });
    return;
  } else {
    if (user.expiresAt < now) {
      res.send({ error: "OTP expired" });
      return;
    }
    const isOTPValid = req.body.otp == user.otp;
    console.log(isOTPValid);
    if (isOTPValid) {
      await OTP.findOneAndUpdate(
        { email: user.email },
        { failedLoginAttempts: 0, lastLoginAttempt: oldDate }
      );
      const otpToken = jwt.sign(
        {
          email: user.email,
        },
        process.env.SECRET_KEY,
        { expiresIn: "15m" }
      );

      return res.json(otpToken);
    } else {
      console.log("updating otp attempts values");
      await OTP.findOneAndUpdate(
        { email: user.email },
        { $inc: { failedLoginAttempts: 1 }, lastLoginAttempt: Date.now() }
      );
      res.send({ error: "Invalid OTP" });
      return;
    }
  }
};

export const getReOTP = async (req, res) => {
  const token = req.headers["x-access-token"];
  const user = await OTP.findOne({
    email: req.body.email,
  });
  const now = Date.now();
  const failedAttempts = user.failedLoginAttempts;
  const lastLoginAttempt = user.lastLoginAttempt.getTime();
  const oldDate = now - LOCK_TIME_IN_MINUTES - 1000000;
  var expiry = now + LOCK_TIME_IN_MINUTES;
  // Check if user is locked out
  if (
    failedAttempts >= MAX_LOGIN_ATTEMPTS &&
    now - lastLoginAttempt < LOCK_TIME_IN_MINUTES
  ) {
    res.send({
      error:
        "Too many failed OTP login attempts. Please try again in some time.",
    });
    return;
  } else if (user.resendAttempts >= MAX_LOGIN_ATTEMPTS) {
    res.send({
      error: "Too many resend otp attempts. Please log back in some time.",
    });
    return;
  } else {
    var otpGen = Math.floor(100000 + Math.random() * 900000);
    await OTP.findOneAndUpdate(
      { email: user.email },
      {
        otp: parseInt(otpGen),
        expiresAt: expiry,
        $inc: { resendAttempts: 1 },
        failedLoginAttempts: 0,
        lastLoginAttempt: oldDate,
      }
    );
    const transpoter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });
    const msg = "Your otp is " + otpGen + ". It is valid for 15mins.";
    const mailOptions = {
      from: "karansingh.k2312@gmail.com",
      to: user.email,
      subject: "Resending your Admin OTP",
      text: msg,
    };
    transpoter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        res.send({ error: "Could not resend Mail" });
        return;
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    res.send({
      error: "Sending new OTP.",
    });
    return;
  }
};

export const logout = async (req, res) => {
  const token = req.headers["x-access-token"];

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const email = decoded.email;
    const user = await User.findOne({ email: email });

    return res.json({ status: "ok", quote: user.quote });
  } catch (error) {
    // console.log(error);
    res.json({ status: "error", error: "invalid token" });
  }
};
