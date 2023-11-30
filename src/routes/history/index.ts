import { Router } from 'express';
const router = Router();

import { pool } from "../../client/database";

router.get("/points/:uid", async (req, res) => {
    const uid = req.params.uid;

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(`SELECT pointsHistory FROM users WHERE uid=?`, [uid]);
        if (!result[0]) return res.json({ "history": [] });
        
        const points = JSON.parse(result[0].pointsHistory).history;

        res.send(points);
    } catch (error) {
        console.log(error)
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
});

router.get("/payout/:uid", async (req, res) => {
    const uid = req.params.uid;

    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(`SELECT payoutHistory FROM users WHERE uid=?`, [uid]);

        const payout = JSON.parse(result[0].payoutHistory).history;

        res.send(payout);
    } catch (error) {
        console.log(error)
        res.status(500).send("ERROR FEEDING VALUES INTO DATABASE");
    } finally {
        if (conn) conn.release();
    }
});

export default router;