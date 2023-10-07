import { Router } from 'express';
import { pool } from "../client/database"
const router = Router();

import loginRoute from "./login/index"
import payoutRoute from "./payout/index";
import tastsRoute from "./tasks/index";
import dashRoute from "./dash/index";
import adminRoute from "./admin/index";
import adsRoute from "./ads/index";
import youtubeRoute from "./youtube/index";
import spinRoute from "./spin/index";
import LN from "./luckyNum/index";
import history from "./history/index";

router.use("/login", loginRoute);
router.use("/payout", payoutRoute);
router.use("/tasks", tastsRoute);
router.use("/dash", dashRoute);
router.use("/admin", adminRoute);
router.use("/ads", adsRoute);
router.use("/youtube", youtubeRoute);
router.use("/spin", spinRoute);
router.use("/lucky", LN);
router.use("/history", history);

router.get("/", async (req, res) => {
    try {
        res.send("Welcome to our API! 🌎🌎");
    } catch (err) {
        console.log(err);
    }
})
export default router;