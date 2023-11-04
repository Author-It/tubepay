import { config } from "dotenv";
import express, { Express } from "express";
import routes from "../routes";

config();

export function createApp(): Express {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use("/api", routes);


    app.get("/", (req, res) => {
        res.send("Works")
    })

    return app;
}