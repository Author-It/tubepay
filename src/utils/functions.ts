import forge from "node-forge";
import { privateKey } from "./constants";
import { pool } from "../client/database";
const https = require("https");
const { google } = require("googleapis");

const MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const SCOPES = [MESSAGING_SCOPE];

export async function storeHash(hash: string) {
    let conn;
    try {
        conn = await pool.getConnection();
        const check = await conn.query("SELECT * FROM requests WHERE reqs=?", [hash]);
        if (check[0]) return -1;

        await conn.query("INSERT INTO requests (reqs) VALUES (?)", [hash]);
        return 0;
    } catch (err) {
        console.log(err);
        return -1;
    } finally {
        if (conn) conn.release();
    }
}

export async function decryptRSA(encryptedBase64: string) {
    try {
        const privateKeyPem = forge.pki.privateKeyFromPem(privateKey);
        const encryptedBytes = forge.util.decode64(encryptedBase64);

        const store = await storeHash(encryptedBase64);
        if (store === -1) return `{fingerprint: "meow"}`;

        const decrypted = privateKeyPem.decrypt(encryptedBytes, "RSAES-PKCS1-V1_5");
        const decryptedString = decrypted.toString();

        return decryptedString;
    } catch (err) {
        return "1";
    }
}

export async function addPointsHistory(
    uid: string,
    amount: number,
    source: string,
    id: string
) {
    if (!uid || !amount || !source || !id) return;

    let conn;
    try {
        conn = await pool.getConnection();
        const user = await conn.query(
            `SELECT pointsHistory from users WHERE uid=?`,
            [uid]
        );
        const pointHistory = JSON.parse(user[0].pointsHistory).history;

        const data = {};
        Object.assign(data, { amount: amount }, { source: source }, { id: id });
        pointHistory.push(data);
        await conn.query(`UPDATE users SET pointsHistory=? WHERE uid=?`, [
            JSON.stringify({ history: pointHistory }),
            uid,
        ]);
    } catch (error) {
        console.log(error);
    } finally {
        if (conn) conn.release();
    }
}

export async function addPayoutHistory(
    uid: string,
    amount: number,
    source: string,
    id: string
) {
    if (!uid || !amount || !source || !id) return;

    let conn;
    try {
        conn = await pool.getConnection();
        const user = await conn.query(
            `SELECT payoutHistory from users WHERE uid=?`,
            [uid]
        );
        const payoutHistory = JSON.parse(user[0].payoutHistory).history;

        const data = {};
        Object.assign(data, { amount: amount }, { source: source }, { id: id });
        payoutHistory.push(data);
        await conn.query(`UPDATE users SET payoutHistory=? WHERE uid=?`, [
            JSON.stringify({ history: payoutHistory }),
            uid,
        ]);
    } catch (error) {
        console.log(error);
    } finally {
        if (conn) conn.release();
    }
}

export function getAccessToken() {
    return new Promise(function (resolve, reject) {
        const key = require("../../assets/service.json");
        const jwtClient = new google.auth.JWT(
            key.client_email,
            null,
            key.private_key,
            SCOPES,
            null
        );
        jwtClient.authorize(function (err: any, tokens: any) {
            if (err) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
}