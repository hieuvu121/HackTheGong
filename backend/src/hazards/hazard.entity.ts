import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Report } from '../reports/report.entity';

export type DangerLevel = 'dangerous' | 'moderate' | 'low';
export type HazardStatus = 'active' | 'fixed';
export type HazardKind =
  | 'construction'
  | 'unlit'
  | 'pothole'
  | 'highway'
  | 'debris'
  | 'no_bike_lane';

@Entity('hazards')
export class Hazard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('real')
  lng!: number;

  @Column('real')
  lat!: number;

  @Column('text')
  kind!: HazardKind;

  @Column('text')
  dangerLevel!: DangerLevel;

  @Column('text', { default: 'active' })
  status!: HazardStatus;

  @Column('text', { default: '' })
  streetName!: string;

  /**
   * Minutes from midnight. Set only for hazards that come and go — an unlit
   * road is not a hazard at noon. Wraps when start > end.
   */
  @Column('integer', { nullable: true })
  activeWindowStart!: number | null;

  @Column('integer', { nullable: true })
  activeWindowEnd!: number | null;

  @OneToMany(() => Report, (report) => report.hazard)
  reports!: Report[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
