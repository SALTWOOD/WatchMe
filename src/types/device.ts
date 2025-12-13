import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { DeviceStatus } from "./device-status.js";

type Battery = {
    power: number; // 0 <= power <= 100
    charging: boolean | null;
}

@Entity()
export class Device {
    @PrimaryGeneratedColumn()
    public id!: number;

    @Column()
    public name!: string;

    @Column()
    public token!: string;

    @Column({
        type: "timestamp",
    })
    public lastUpdatedAt!: Date;

    @Column({
        type: "timestamp",
    })
    public lastOnline!: Date;

    @Column()
    public status!: DeviceStatus;

    @Column()
    public message!: string;

    @Column({
        default: false,
    })
    public ignored!: boolean;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    public battery!: Battery | null;
}