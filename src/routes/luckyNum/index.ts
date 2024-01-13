import { config } from "dotenv";
config();

import { NextFunction, Request, Response, Router } from 'express';
const router = Router();

import { pool } from "../../client/database";
import { decryptRSA } from "../../utils/functions";

interface meow {
    fingerprint: string;
    uid: string;
    time: number;
    number: number;
    version: number;
}

router.put("/add", 
    async (req:Request, res:Response, next:NextFunction) => {
        try {
            if (!req.body.encrypted) return res.status(403).send("INVALID REQUEST FORMAT");
            const encrypted = req.body.encrypted;
            const decrypted = await decryptRSA(encrypted);
            const obj: meow = JSON.parse(decrypted);

            if (!obj.version || obj.version != 3) return res.status(403).send("PLEASE UPDATE YOUR APP TO CLAIM!");
            if (obj.fingerprint != process.env.FINGERPRINT) return res.send("INVALID APP FINGERPRINT");
            if (obj.time + 5 > Date.now()) return res.status(409).send("REQUEST TIMED OUT");

            res.locals.uid = obj.uid;
            res.locals.number = obj.number;
            next()
        } catch (e) {
            console.log(e);
            res.status(500).send("INTERNAL SERVER ERROR");
        }
    },
    async (req, res) => {
        let conn;
        try {
            conn = await pool.getConnection();
            conn.query(`UPDATE users SET luckyNum=? WHERE uid=?`, [res.locals.number, res.locals.uid])
            res.status(201).send(`SUCCESSFULLY SELECTED ${res.locals.number} FOR THE DRAW!`)
        } catch (error) {
            console.log(error)
            res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
        } finally {
            if (conn) conn.release();
        }
    }
);
export default router;