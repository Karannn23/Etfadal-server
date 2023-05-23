import express from "express";
import  { logout, postLogin }  from "../controllers/auth.js";
import { getUser, getDashboardStats } from "../controllers/general.js";
import ensureAuth from "../middleware/auth.js";

const router = express.Router();


router.get("/logout", logout);
router.get("/user/:id", getUser);
router.get("/dashboard", ensureAuth, getDashboardStats);

export default router;