import { config } from "dotenv";
config();
import { unix } from "moment";
import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../client/database";
import { decryptRSA } from "../../utils/functions";
const logger = require("../../utils/logger.js");

const router = Router();

interface meow {
    uid: string;
    fingerprint: string;
    email: string;
    method: string;
    amount: number;
    time: number; // epoch time
    country: string;
}

router.get(
    "/150rupiyanidega",
    async (req: Request, res: Response) => {

        let conn;
        try {
            conn = await pool.getConnection();
            await conn.query("UPDATE users SET payoutLock=0 WHERE 1;");
        } catch (error) {
            console.log(error)
        } finally {
            if (conn) conn.release();
        }
    }
);

router.post(
    "/",
    async (req: Request, res: Response, next: NextFunction) => {

        if (!req.body.encrypted) return res.status(403).send("INVALID REQUEST FORMAT");
        const encrypted = req.body.encrypted;
        const decrypted = await decryptRSA(encrypted);

        try {
            const obj: meow = JSON.parse(decrypted);

            if (obj.fingerprint != process.env.FINGERPRINT) return res.send("INVALID APP FINGERPRINT");
            if (obj.time + 5 > Date.now()) return res.status(409).send("REQUEST TIMED OUT");

            res.locals.uid = obj.uid
            res.locals.method = obj.method
            res.locals.amount = obj.amount
            res.locals.email = obj.email
            res.locals.country = obj.country
            res.locals.time = obj.time

            if (res.locals.country === "BR" && res.locals.amount === "0.04" && res.locals.method === "PayPal") return res.send("$0.04 IS OUT OF STOCK | PLEASE REQUEST OTHER AMOUNTS.")
            next()
        } catch (err) {
            console.log(err)
            res.status(409).send(":)")
        }
    },
    async (req, res) => {

        let conn;
        try {
            conn = await pool.getConnection();

            const check = await conn.query("SELECT points,payoutLock FROM users WHERE uid=?", [res.locals.uid]);
            if (res.locals.method === "PayPal" && res.locals.amount==="0.04" && check[0].payoutLock === 1) return res.status(403).send("PLEASE WAIT A FEW DAYS BEFORE SENDING THIS AMOUNT AGAIN")
            if (check[0].points < res.locals.amount * 50000) return res.status(403).send("POINTS LESS THAN REQUIRED");

            await conn.query(`INSERT INTO payout (method, amt, email, country, uid, date) VALUES (?,?,?,?,?,?);`, [res.locals.method, res.locals.amount, res.locals.email, res.locals.country, res.locals.uid, unix(res.locals.time).format("DD-MM-YY")])
            await conn.query(`UPDATE users SET points=points-?,payoutLock=1 WHERE uid=?`, [res.locals.amount * 50000, res.locals.uid]);
            logger.success(`Payout requested by ${res.locals.uid}`)
            res.status(201).send("PAYOUT SUCCESSFULLY REQUESTED.")
        } catch (error) {
            console.log(error);
            res.status(500).send("ERROR FEEDING DATA INTO THE DATABASE")
        } finally {
            if (conn) conn.release();
        }
    }
);

export default router;