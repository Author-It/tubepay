import { config } from "dotenv";
config();

import { Router, Request, Response, NextFunction } from 'express';
const router = Router();

import { pool } from "../../client/database";
import { decryptRSA, addPointsHistory } from "../../utils/functions";


interface meow {
    fingerprint: string;
    uid: string;
    time: number;
    version: number;
}

interface task{
    taskID: number;
    name: string;
    points: number;
    max: number;
    claimed: number;
}

router.put(
    "/claim/:taskID", 
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.body.encrypted) return res.status(403).send("INVALID REQUEST FORMAT");
            const encrypted = req.body.encrypted;
            const decrypted = await decryptRSA(encrypted);

            const obj: meow = JSON.parse(decrypted);
        
            if (!obj.version || obj.version != 3) return res.status(403).send("PLEASE UPDATE YOUR APP TO CLAIM!");
            if (obj.fingerprint != process.env.FINGERPRINT) return res.send("INVALID APP FINGERPRINT");
            if (obj.time + 5 > Date.now()) return res.status(409).send("REQUEST TIMED OUT");

            res.locals.uid = obj.uid;

            next();
        } catch (e) {
            console.log(e);
        }
    },
    async (req, res) => {
    const id = req.params.taskID;

        let conn;
        try {
            conn = await pool.getConnection();
            const result = await conn.query(`SELECT * from users WHERE uid=?`, [res.locals.uid]);
            const taskList:task[] = await conn.query(`SELECT * FROM tasks WHERE taskID=?`, [id]);
            const tasks = JSON.parse(result[0].tasks);   
            
            if (!tasks[id]) return res.status(500).send("BSDK");

            function addData(id:string) {
                let obj = {
                    id : {
                        "claimed": false,
                        "progress": 0
                    }
                }
                return obj
            }

            if (tasks[id]["claimed"]) return res.status(403).send("TASK ALREADY CLAIMED.");
            if (!tasks[id]) Object.assign(tasks, addData(id));

            let taskName:string = "";
            let taskID:string= "";

            if (id === "1"){
                if (result[0].maxStreak === 0) return res.status(403).send("CANNOT CLAIM TASK.");
                taskName = "Claim Streak";
                taskID = "claim_streak";

            } else if (id === "2") {
                if (result[0].referralToday < taskList[0].max) return res.status(403).send("CANNOT CLAIM TASK.");
                taskName = "Share App Daily";
                taskID = "daily_share";
            } else if (id === "3") {

                // TOTALWATCHED = VID COUNT WITH ADS
                // USE WATCHVIDS = COUNT USING 1MIN WATCHTIME :D

                if (result[0].totalWatched < taskList[0].max) return res.status(403).send("CANNOT CLAIM TASK.");
                taskName = "Watch 20 Videos";
                taskID = "watch_vids";
            } else if (id === "4"){
                if (result[0].spinCount < taskList[0].max) return res.status(403).send("CANNOT CLAIM TASK.");
                taskName = "Spin 15 Times";
                taskID = "spin";
            }  else if (id === "6"){
                if (result[0].requests < 3600) return res.status(403).send("CANNOT CLAIM TASK.");
                taskName = "Use App For 1 Hour";
                taskID = "usage";
            } else if (id === "7"){
                taskName = "Subscribe YouTube";
                taskID = "youtube_sub";
            } else if (id === "8"){
                taskName = "Follow TikTok";
                taskID = "tiktok";
            } else {
                return res.status(403).send("INVALID TASK ID")
            }
            tasks[id]["claimed"] = true;

            await addPointsHistory(res.locals.uid, taskList[0].points, taskName, taskID);
            await conn.query(`UPDATE users SET points=points+?,tasks=? WHERE uid=?`, [taskList[0].points, JSON.stringify(tasks),res.locals.uid]);
            await conn.query(`UPDATE tasks SET claimed=claimed+1 WHERE taskID=?`, [id]);

            if (id == "1") await conn.query(`UPDATE users SET maxStreak=0 WHERE uid=?`, [res.locals.uid]);
            res.send(`CLAIMED TASK ${id} FOR ${taskList[0].points} points!`);
        } catch (error) {
            console.log(error);
            res.status(500).send("ERROR FEEDING DATA INTO THE DATABASE");
        } finally {
            if (conn) conn.release();
        }
    }
);

export default router;