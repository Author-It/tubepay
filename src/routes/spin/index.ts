import { config } from "dotenv";
config();

import { Router, Request, Response, NextFunction } from 'express';
const router = Router();

import { pool } from "../../client/database";
import { addPointsHistory, decryptRSA } from "../../utils/functions";
import { spinArr } from "../../utils/constants";

router.put(
    "/claim",
    async (req: Request, res: Response, next: NextFunction) => {

        try {
            if (!req.body.encrypted) return res.status(403).send("INVALID REQUEST FORMAT");
            const encrypted = req.body.encrypted;
            const decrypted = await decryptRSA(encrypted);
            const obj = JSON.parse(decrypted);

            if (obj.fingerprint != process.env.FINGERPRINT) return res.send("INVALID APP FINGERPRINT");
            if (obj.time + 5 > Date.now()) return res.status(409).send("REQUEST TIMED OUT");

            res.locals.uid = obj.uid;
            res.locals.index = obj.index;
            res.locals.time = obj.time;
            next();
        } catch (e) {
            console.log(e);
            res.status(500).send("INTERNAL SERVER ERROR");
        }
    },
    async (req, res) => {

        let conn;
        try {
            conn = await pool.getConnection();
            if (res.locals.index > 5) return res.json({ "Fick": "dich" });

            const user = await conn.query(`SELECT spinTime,points FROM users WHERE uid=?`, [res.locals.uid]);
            const a = res.locals.time - user[0].spinTime;

            if (!(a > 900)) return res.status(406).send(`ERROR`)

            await conn.query(`UPDATE users SET points=points+?,spinTime=?,spinCount=spinCount+1 WHERE uid=?`, [spinArr[res.locals.index], res.locals.time, res.locals.uid]);
            await addPointsHistory(res.locals.uid, spinArr[res.locals.index], "Lucky Spin", "spin");
            res.send(`${spinArr[res.locals.index]} CLAIMED SUCCESSFULLY!`);
        } catch (error) {
            console.log(error);
            res.status(500).send("ERROR FEEDING DATA INTO THE DATABASE");
        } finally {
            if (conn) conn.release();
        }
    }
);

export default router;