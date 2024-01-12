const logger = require("../../utils/logger.js");
import { Router, Request, Response } from 'express';
import { pool } from "../../client/database";
import { decryptRSA, addPointsHistory } from '../../utils/functions';

const router = Router();

interface meow {
    fingerprint: string;
    uid: string;
    time: number;
    version: number;
}

router.get("/getvideo", async (req: Request, res: Response) => {

    let conn;
    const my_vid = [
        {
            title: 'How to make rose from number 2',
            description: 'This is demonstrating how to make a rose flower with butterflies using mathematical numbers like (2,3)',
            videoID: 0,
            uid: 123,
            visibility: 0,
            link: '89blpMzo0BU'
        }
    ]

    try {
        conn = await pool.getConnection();
        const result = await conn.query(`SELECT * FROM videos;`)
        result.sort(() => Math.random() - 0.5);

        res.send([...my_vid, ...result]);
    } catch (error) {
        logger.error(error)
        res.status(500).send("ERROR FETCHING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
})

router.put(
    "/claim",
    async (req, res, next) => {
        if (!req.body.encrypted) return res.status(403).send("INVALID REQUEST FORMAT");
        const encrypted = req.body.encrypted;
        const decrypted = await decryptRSA(encrypted);

        try {
            const obj: meow = JSON.parse(decrypted);

            if (!obj.version) return res.status(403).send("PLEASE UPDATE YOUR APP TO CLAIM!");
            if (obj.fingerprint != process.env.FINGERPRINT) return res.send("INVALID APP FINGERPRINT");
            if (obj.time + 35 > Date.now()) return res.status(409).send("REQUEST TIMED OUT");

            res.locals.time = obj.time;
            res.locals.uid = obj.uid;

            next()
        } catch (err) {
            console.log(err);
            res.status(409).send(":)");
        }
    },
    async (req, res) => {

        let conn;
        try {
            conn = await pool.getConnection();

            const user = await conn.query(`SELECT youtubeTime,points FROM users WHERE uid=?`, [res.locals.uid]);
            if (!user[0]) return res.status(400).send("BAD REQUEST");

            const p = Math.floor(Math.random() * (28 - 20 + 1) + 20)
            const a = res.locals.time - user[0].youtubeTime;
            if (!(a > 20)) return;

            await conn.query(`UPDATE users SET points=points+?,youtubeTime=?,totalWatched=totalWatched+1 WHERE uid=?`, [p, res.locals.time, res.locals.uid]);
            await addPointsHistory(res.locals.uid, p, "YouTube", "youtube");
            res.status(201).send(`${p} POINTS ADDED.`);
        } catch (error) {
            console.log(error);
            res.status(409).send("ERROR");
        } finally {
            if (conn) conn.release();
        }
    }
);

router.get(
    "/getChannel",
    async (req, res) => {

        let conn;
        try {
            conn = await pool.getConnection();
            const mail = await conn.query(`SELECT youtubeURL FROM admin WHERE ID=1`);

            res.send(mail[0].youtubeURL);
        } catch (error) {
            console.log(error);
            res.status(409).send("ERROR");
        } finally {
            if (conn) conn.release();
        }
    }
)
export default router;
