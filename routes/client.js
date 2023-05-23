import express from "express";
import {
  getProducts,
  getCustomers,
  getTransactions
} from "../controllers/client.js";
import ensureAuth from "../middleware/auth.js";

const router = express.Router();

router.get("/dishes", ensureAuth, getProducts);
router.get("/customers", ensureAuth, getCustomers);
router.get("/transactions", ensureAuth, getTransactions);

export default router;