import { config } from "dotenv";
import { createApp } from "./utils/createApp";
import { pool } from "./client/database";
const logger = require("./utils/logger.js")
config();

const PORT = process.env.PORT || 3000;

async function main() {
    try {
        const app = createApp();
        app.listen(PORT, () => logger.event(`Running on Port ${PORT}`));
    } catch (err) {
        console.log(err);
    }

    try {
        pool.getConnection().then((con) => {
            logger.info("Connected to database.");
            con.release();
        });
    } catch (error) {
        logger.error(error)
    }
}

main();
