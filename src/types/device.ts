import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { DeviceStatus } from "./device-status.js";

@Entity()
export class Device {
    @PrimaryGeneratedColumn()
    public id!: number;

    @Column()
    public name!: string;

    @Column()
    public token!: string;

    @Column()
    public lastUpdatedAt!: Date;

    @Column()
    public lastOnline!: Date;

    @Column()
    public status!: DeviceStatus;

    @Column()
    public message!: string;

    @Column()
    public ignored!: boolean;
}