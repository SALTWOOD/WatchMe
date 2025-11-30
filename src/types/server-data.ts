import { Hono } from "hono";
import { DataSource } from "typeorm";

export interface ServerData {
    hono: Hono;
    db: DataSource;
}