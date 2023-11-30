import { config } from "dotenv";
config();

import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../client/database";
import { addPointsHistory, decryptRSA } from "../../utils/functions";
import moment from "moment";

import { info } from "../../utils/logger";

const router = Router();

interface meow {
    fingerprint: string;
    uid: string;
    time: number;
    version: number;
}

router.put(
    "/addRef/:param",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.body.encrypted) return res.status(403).send("INVALID REQUEST FORMAT");
            const encrypted = req.body.encrypted;
            const decrypted = await decryptRSA(encrypted);
            const obj: meow = JSON.parse(decrypted);

            if (!obj.version) return res.status(403).send("PLEASE UPDATE YOUR APP TO CLAIM!");
            if (obj.fingerprint != process.env.FINGERPRINT) return res.send("INVALID APP FINGERPRINT");
            if (obj.time + 5 > Date.now()) return res.status(409).send("REQUEST TIMED OUT");

            res.locals.uid = obj.uid;

            next()
        } catch (e) {
            console.log(e);
            res.status(500).send("INTERNAL SERVER ERROR");
        }
    },
    async (req: Request, res: Response) => {
        const ref = req.params.param;

        let conn;
        try {
            conn = await pool.getConnection();
            const check = await conn.query(`SELECT * FROM users WHERE referral=?`, [ref]);
            const user = await conn.query(`SELECT referral,referredBy FROM users WHERE uid=?`, [res.locals.uid]);

            if (user[0].referredBy) return res.status(403).send("REFERRAL CODE ALREADY APPLIED");
            if (!check[0]) return res.status(409).send("INVALID REFERRAL CODE");
            if (user[0].referral === ref) return res.status(403).send("YOU CANNOT REFER YOURSELF");

            await conn.query(`UPDATE users SET points=points+500,totalReferrals=totalReferrals+1,referralToday=referralToday+1 WHERE referral=?`, [ref]);
            await conn.query(`UPDATE users SET referredBy=?,points=points+400 WHERE uid=?`, [check[0].uid, res.locals.uid]);
            
            await addPointsHistory(res.locals.uid, 200, "Referral Applied", "referral_applied");
            await addPointsHistory(check[0].uid, 300, "Referral Added", "referral_add");
            
            res.status(201).send("REFERRAL CODE APPLIED SUCCESSFULLY!");
            info(`${ref} REFERRED ${user[0].referral}`);
        } catch (error) {
            console.log(error);
            res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
        } finally {
            if (conn) conn.release();
        }
    }
);

router.get("/getInfo/:uid", async (req, res) => {
    const uid = req.params.uid;
    if (!uid) return;

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            `SELECT uid,points,referral,ban,totalReferrals,referredBy,referralToday,totalWatched,streak,streakClaimed,maxStreak,tasks,spinTime,spinCount,luckyNum,requests,adsWatched,payoutLock,videoWatched FROM users WHERE uid=?`,
            [uid]
        );
        const adminData = await conn.query(`SELECT dailyReset,number,luckyNumber FROM admin WHERE id=1`);

        if (!result[0]) return res.status(409).send("INVALID UID");

        let arr: number[] = [0, 0, 0, 0, 0, 0, 0];

        const streak = result[0].streak;
        const streakClaimed = result[0].streakClaimed;

        if (streakClaimed > streak) return;
        else if (streak === 0 && streakClaimed === -1) arr = [1, 0, 0, 0, 0, 0, 0];
        else if (streak === 0 && streakClaimed === 0) arr = [2, 0, 0, 0, 0, 0, 0];
        else if (streak === 1 && streakClaimed === 0) arr = [2, 1, 0, 0, 0, 0, 0];
        else if (streak === 1 && streakClaimed === 1) arr = [2, 2, 0, 0, 0, 0, 0];
        else if (streak === 2 && streakClaimed === 1) arr = [2, 2, 1, 0, 0, 0, 0];
        else if (streak === 2 && streakClaimed === 2) arr = [2, 2, 2, 0, 0, 0, 0];
        else if (streak === 3 && streakClaimed === 2) arr = [2, 2, 2, 1, 0, 0, 0];
        else if (streak === 3 && streakClaimed === 3) arr = [2, 2, 2, 2, 0, 0, 0];
        else if (streak === 4 && streakClaimed === 3) arr = [2, 2, 2, 2, 1, 0, 0];
        else if (streak === 4 && streakClaimed === 4) arr = [2, 2, 2, 2, 2, 0, 0];
        else if (streak === 5 && streakClaimed === 4) arr = [2, 2, 2, 2, 2, 1, 0];
        else if (streak === 5 && streakClaimed === 5) arr = [2, 2, 2, 2, 2, 2, 0];
        else if (streak === 6 && streakClaimed === 5) arr = [2, 2, 2, 2, 2, 2, 1];
        else if (streak === 6 && streakClaimed === 6) arr = [2, 2, 2, 2, 2, 2, 2];
        else {
            console.log("BC YE KY HO GYA");
            console.log(streak + "\n" + streakClaimed);
            return res.status(403).send("ERROR!");
        }

        Object.assign(result[0], { streakArr: arr }, { tasks: [JSON.parse(result[0].tasks)] }, { "dailyReset": parseInt(adminData[0].dailyReset), "number": parseInt(adminData[0].number), "luckyNumber": parseInt(adminData[0].luckyNumber), "timenow": moment(Date.now()).unix() });
        await conn.query(`UPDATE users SET requests=requests+1,lastRequest=? WHERE uid=?`, [Date.now(), uid]);
        res.json(result[0]);
    } catch (error) {
        console.log(error);
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
});

router.put(
    "/claimStreak",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.body.encrypted) return res.status(403).send("INVALID REQUEST FORMAT");
            const encrypted = req.body.encrypted;
            const decrypted = await decryptRSA(encrypted);
            const obj: meow = JSON.parse(decrypted);

            if (!obj.version) return res.status(403).send("PLEASE UPDATE YOUR APP TO CLAIM!");
            if (obj.fingerprint != process.env.FINGERPRINT) return res.send("INVALID APP FINGERPRINT");
            if (obj.time + 5 > Date.now()) return res.status(409).send("REQUEST TIMED OUT");

            res.locals.uid = obj.uid

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

            const check = await conn.query(
                `SELECT streakClaimed, streak FROM users WHERE uid=?`,
                [res.locals.uid]
            );
            if (!check[0]) return res.status(409).send("INVALID UID");

            let streakClaimed = check[0].streakClaimed;
            let streak = check[0].streak;

            if (streakClaimed === streak) return res.status(403).send("STREAK ALREADY CLAIMED!");

            if (streakClaimed == 6) {
                streakClaimed = -1;
            } else {
                streakClaimed += 1;
            }

            const points = [100, 150, 200, 300, 350, 400, 600];
            await conn
                .query(`UPDATE users SET streakClaimed=?, points=points+? WHERE uid=?`, [
                    streakClaimed,
                    points[streakClaimed],
                    res.locals.uid,
                ])
                .then((v) =>
                    res.status(201).send(`${points[streakClaimed]} POINTS CLAIMED`)
                );

            await addPointsHistory(res.locals.uid, points[streakClaimed], "Streak", "streak");
        } catch (error) {
            console.log(error);
            res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
        } finally {
            if (conn) conn.release();
        }
    }
);

// ٠ • —– ٠ • —– ٠ • —– ٠ ✤ ٠ —– • ٠ —– • ٠ —– • ٠·
//                       TASKS

router.get("/taskname", async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(`SELECT * FROM tasks;`);
        res.status(201).send(result)
    } catch (error) {
        console.log(error)
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
});

router.get("/delete", async (req, res) => {

    res.send("<p style=\"font-size: 1rem;\">To get your account deleted mail us at <b style=\"color: blue\">tubepay.team@gmail.com</b></p><br><br>Or <a href=\"mailto:tubepay.team@gmail.com?subject=Account deletion request\">Click Here</a>");
})

export default router;
