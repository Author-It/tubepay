import { config } from 'dotenv';
config();
import axios from "axios";
import e, { Router, Request, Response } from 'express';
import { pool } from "../../client/database";
import { getAccessToken, addPointsHistory } from '../../utils/functions';
const logger = require("../../utils/logger.js");

const router = Router();

interface e {
    uid: string;
    lastRequest: number;
}

router.get("/reset/day", async (req:Request, res:Response) => {
    const pass = req.query.p;
    
    if (!pass || pass != process.env.ADMIN_PASS) return res.status(403).send("INVALID KEY " + pass);
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        getAccessToken().then(function(token){

            axios.post(
                "https://fcm.googleapis.com/v1/projects/tubepay-8a666/messages:send", 
                {
                    "message": {
                        "topic": "topic",
                        "notification": {
                            "title": "Daily Reset",
                            "body": "All tasks have been reset start earning again!"
                        },
                        "android": {
                            "notification": {
                                "image": "https://i.imgur.com/XGIQD5e.jpg"
                            }
                        }
                    }
                },
                {
                    headers: {Authorization: `Bearer ${token}`}
                }
            )
        })
        
        await conn.query(`UPDATE users SET maxStreak=1 WHERE streakClaimed=6;`);
        await conn.query(`UPDATE users SET streak=streak+1,dailyAds=0,referralToday=0,spinCount=0,adsWatched=0,requests=0,videoWatched=0 WHERE 1;`);
        await conn.query(`UPDATE users SET streak=0,streakClaimed=-1 WHERE streak=7;`);
        await conn.query(`UPDATE users SET streak=0,streakClaimed=-1 WHERE (streak-streakClaimed)>=2;`);
        await conn.query(`UPDATE admin SET dailyReset=? WHERE id=1`, [Math.floor(Date.now()/1000)]);

        // Ma chudegi server ki :)
        const user = await conn.query("SELECT tasks,uid FROM users;");
        for (let i=0; i<user.length; i++) {

            const uTask = JSON.parse(user[i].tasks);
            // console.log(uTask)
            uTask["1"]["claimed"] = false;
            uTask["2"]["claimed"] = false;
            uTask["3"]["claimed"] = false;
            uTask["4"]["claimed"] = false; 
            uTask["5"]["claimed"] = false;
            uTask["6"]["claimed"] = false;
            uTask["9"]["claimed"] = false;
            uTask["10"]["claimed"] = false;
            
            await conn.query("UPDATE users SET tasks=? WHERE uid=?", [JSON.stringify(uTask), user[i].uid])
        }
        res.send("Daily Reset Occured")
        logger.event("Daily Reset Occured")
    } catch (error) {
        console.error(error)
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
})

router.get("/draw/luckynumber", async (req:Request, res:Response) => {
    const pass = req.query.p;
    
    if (pass != process.env.ADMIN_PASS) return res.status(403).send("INVALID KEY " + pass);

    let conn;
    try {
        conn = await pool.getConnection();
        

        const sendNotif = () => {
            getAccessToken().then(function(token){

                axios.post(
                    "https://fcm.googleapis.com/v1/projects/tubepay-8a666/messages:send", 
                    {
                        "message": {
                            "topic": "topic",
                            "notification": {
                                "title": "Lucky Number",
                                "body": "Check results now!"
                            },
                            "android": {
                                "notification": {
                                    "image": "https://i.imgur.com/lT4ctOt.jpg"
                                }
                            }
                        }
                    },
                    {headers: {Authorization: `Bearer ${token}`}}
                )
            })
        }

        const num = Math.floor(Math.random() * (10 - 1 + 1) + 1);
        if (num >= 8) {
            sendNotif();
        }

        const get = await conn.query(`SELECT luckyNum, COUNT(luckyNum) AS occurrence FROM users GROUP BY luckyNum ORDER BY occurrence LIMIT 1;`)

        if (get[0].luckyNum === 0) { 
            await conn.query(`UPDATE admin SET luckyNumber=?,number=5 WHERE id=1`, [Math.floor(Date.now()/1000)]);
            await conn.query(`UPDATE users SET luckyNum=0 WHERE 1;`);
            res.send("LuckyNumber draw success with no winner...");
            logger.warn("LuckyNumber draw success with no winner...");
            return
        }
        const users = await conn.query(`SELECT uid FROM users WHERE luckyNum=?`, get[0].luckyNum);
        for (let i=0; i<users.length; i++) {
            await addPointsHistory(users[0].uid, 50, "Lucky Number", "lucky_num")
        }
        await conn.query(`UPDATE users SET points=points+50 WHERE luckyNum=?`, [get[0].luckyNum]);
        await conn.query(`UPDATE users SET luckyNum=0 WHERE 1;`);
        await conn.query(`UPDATE admin SET luckyNumber=?,number=? WHERE id=1`, [Math.floor(Date.now()/1000), get[0].luckyNum]);
        res.send(`LuckyNumber draw success with ${get[0].luckyNum} as winner...`);
        logger.event(`LuckyNumber draw success with ${get[0].luckyNum} as winner...`);
    } catch (error) {
        console.log(error);
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
})

router.get("/terimakichu", async (req, res) => {
    const pass = req.query.p;
    
    if (pass != process.env.ADMIN_PASS) return

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(`TRUNCATE TABLE requests;`);
        res.send("TABLE TRUNCATED SUCCESSFULLY");
        logger.event("MEOW")
    } catch (error) {
        console.log(error)
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
})

router.get("/getactive", async (req, res) => {
    let conn;
    let arr:string[] = [];

    try {
        conn = await pool.getConnection();

        const resu:e[] = await conn.query(`SELECT uid,lastRequest FROM users`);

        resu.forEach((element) => {
            
            if (element.lastRequest + 2 >= Date.now()) return;

            arr.push(element.uid)
        })

        res.send(arr)
    } catch (error) {
        res.send("meow");
        console.log(error)
    } finally {
        if (conn) conn.release();
    }
})


export default router;