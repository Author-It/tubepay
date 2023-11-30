import { config } from "dotenv";
config();

import { Router, Request, Response } from 'express';
import { decryptRSA } from "../../utils/functions"
import { pool } from "../../client/database";

import { success } from "../../utils/logger";

const router = Router();

interface meow {
    fingerprint: string;
    uid: string;
    deviceID: string;
    time: number;
}

router.post("/", async (req:Request, res:Response) => {
    if (!req.body.encrypted) return res.status(403).send("INVALID REQUEST FORMAT");

    const encrypted = req.body.encrypted;
    
    const decrypted = await decryptRSA(encrypted);
    const obj:meow = JSON.parse(decrypted);
    let a = Array.from(Array(8), () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();

    if (obj.fingerprint != process.env.FINGERPRINT) return res.send("INVALID APP FINGERPRINT")

    success("New Account Created: " + obj.uid);
    let conn;
    try {
        conn = await pool.getConnection();
        const findUID = await conn.query(`SELECT * FROM users WHERE uid=?`, [obj.uid]);
        const findDeviceID = await conn.query(`SELECT * FROM users WHERE deviceID=?`, [obj.deviceID]);
        const findRef = await conn.query(`SELECT * FROM users WHERE referral=?`, [a]);

        if (findDeviceID[0]) return res.status(409).send("ACCOUNT ALREADY CREATED FROM THIS DEVICE. LOGIN FROM THAT ACCOUND INSTEAD");
        if (findRef[0]) a = a.replace(a[0], "0");
        if (findUID[0]) return res.status(409).send("ACCOUNT ALREADY EXISTS WITH THIS EMAIL");

        await conn.query(`INSERT INTO users (uid, referral, deviceID) VALUES (?, ?, ?)`, [obj.uid, a, obj.deviceID]);
        res.status(201).send("Data Creation Success!");
    } catch (error) {
        console.log(error)   
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
})

export default router;
