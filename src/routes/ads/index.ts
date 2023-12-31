import { config } from 'dotenv';
config();

import { sha1 } from "node-forge"
import { Router, Request, Response } from 'express';
import { pool } from "../../client/database";
import { addPointsHistory } from '../../utils/functions';
import { warn } from '../../utils/logger';

const router = Router();

router.get("/verify", async (req: Request, res: Response) => {
    const userID = req.query.user_id;
    const event = req.query.event;
    const eventToekn = req.query.token;
    if (!userID || !event || !eventToekn) { res.status(422).send("Incomplete data sent"); warn("Incomplete data"); return; }

    const toCheck = sha1.create().update(event! + process.env.APPLOVIN_TOKEN!).digest().toHex().toString()
    const toCheck2 = sha1.create().update(event! + process.env.APPLOVIN_TOKEN_2!).digest().toHex().toString()

    if (toCheck != eventToekn || toCheck2 !=eventToekn) { res.status(400).send("PLEASE UPDATE YOUR APP TO CLAIM"); warn("PLEASE UPDATE YOUR APP TO CLAIM!"); return; };

    let conn;
    try {
        conn = await pool.getConnection();
        await addPointsHistory(`${userID}`, 30, "Video Gift", "vid_gift");
        await conn.query(`UPDATE users SET points=points+30 WHERE uid=?`, [userID]).then(v => (res.send("REWARD CLAIMED!")));
    } catch (error) {
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
})

router.get("/verify20", async (req: Request, res: Response) => {
    const userID = req.query.user_id;
    const event = req.query.event;
    const eventToekn = req.query.token;
    if (!userID || !event || !eventToekn) {
        warn("Incomplete data"); 
        return;
    }
    const toCheck = sha1.create().update(event! + process.env.APPLOVIN_TOKEN!).digest().toHex().toString()
    const toCheck2 = sha1.create().update(event! + process.env.APPLOVIN_TOKEN_2!).digest().toHex().toString()

    if (toCheck != eventToekn || toCheck2 !=eventToekn) { res.status(400).send("PLEASE UPDATE YOUR APP TO CLAIM"); warn("PLEASE UPDATE YOUR APP TO CLAIM!"); return; };

    let conn;
    try {
        conn = await pool.getConnection();
        const resp = await conn.query(`SELECT adsWatched,tasks FROM users WHERE uid=?`, [userID]);

        if (!resp[0]) return console.log("idhar");

        const uTask = JSON.parse(resp[0].tasks);
        
        if (resp[0].adsWatched === 19) uTask["5"]["claimed"] = true;
        if (resp[0].adsWatched <= 20) {
            await addPointsHistory(`${userID}`, 20, "Rewarded Ad", "verify20");
            await conn.query(`UPDATE users SET adsWatched=adsWatched+1,tasks=?,points=points+20 WHERE uid=? AND adsWatched<=20`, [JSON.stringify(uTask), userID]).then(v => (res.send("REWARD CLAIMED!")));
        } else {
            return res.status(200).send("DAILY LIMIT REACHED!");
        }
    } catch (error) {
        console.log(error)
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
})

export default router;
