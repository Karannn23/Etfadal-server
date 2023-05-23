import express from "express";
import { getAdmins } from "../controllers/management.js";
import ensureAuth from "../middleware/auth.js";

const router = express.Router();

router.get("/employees", ensureAuth, getAdmins);

export default router;