CREATE TABLE `Clubs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`abbreviation` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Clubs_name_unique` ON `Clubs` (`name`);--> statement-breakpoint
CREATE TABLE `RelayBoutState` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_bout_id` integer NOT NULL,
	`current_fencer_a_id` integer,
	`current_fencer_b_id` integer,
	`rotation_count_a` integer DEFAULT 0,
	`rotation_count_b` integer DEFAULT 0,
	`last_rotation_score_a` integer DEFAULT 0,
	`last_rotation_score_b` integer DEFAULT 0,
	FOREIGN KEY (`team_bout_id`) REFERENCES `TeamBouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_fencer_a_id`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_fencer_b_id`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `RelayBoutState_team_bout_id_unique` ON `RelayBoutState` (`team_bout_id`);--> statement-breakpoint
CREATE TABLE `TeamBoutScores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_bout_id` integer NOT NULL,
	`bout_number` integer NOT NULL,
	`fencer_a_id` integer,
	`fencer_b_id` integer,
	`fencer_a_score` integer DEFAULT 0,
	`fencer_b_score` integer DEFAULT 0,
	`winner_id` integer,
	`is_complete` integer DEFAULT false,
	FOREIGN KEY (`team_bout_id`) REFERENCES `TeamBouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fencer_a_id`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fencer_b_id`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_id`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `TeamBouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roundid` integer NOT NULL,
	`team_a_id` integer,
	`team_b_id` integer,
	`format` text NOT NULL,
	`status` text DEFAULT 'pending',
	`winner_id` integer,
	`team_a_score` integer DEFAULT 0,
	`team_b_score` integer DEFAULT 0,
	`tableof` integer,
	FOREIGN KEY (`roundid`) REFERENCES `Rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_a_id`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_b_id`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_id`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `TeamMembers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teamid` integer NOT NULL,
	`fencerid` integer NOT NULL,
	`role` text DEFAULT 'starter' NOT NULL,
	`position` integer,
	PRIMARY KEY(`teamid`, `fencerid`),
	FOREIGN KEY (`teamid`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fencerid`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `TeamPoolAssignment` (
	`roundid` integer NOT NULL,
	`poolid` integer NOT NULL,
	`teamid` integer NOT NULL,
	`teamidinpool` integer NOT NULL,
	PRIMARY KEY(`roundid`, `poolid`, `teamid`),
	FOREIGN KEY (`roundid`) REFERENCES `Rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teamid`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`eventid` integer NOT NULL,
	`clubid` integer,
	`seed` integer,
	FOREIGN KEY (`eventid`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`clubid`) REFERENCES `Clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Bouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lfencer` integer,
	`rfencer` integer,
	`victor` integer,
	`referee` integer,
	`eventid` integer,
	`roundid` integer,
	`tableof` integer,
	PRIMARY KEY(`roundid`, `lfencer`, `rfencer`),
	FOREIGN KEY (`lfencer`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rfencer`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`victor`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referee`) REFERENCES `Referees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eventid`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`roundid`) REFERENCES `Rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_Bouts`("id", "lfencer", "rfencer", "victor", "referee", "eventid", "roundid", "tableof") SELECT "id", "lfencer", "rfencer", "victor", "referee", "eventid", "roundid", "tableof" FROM `Bouts`;--> statement-breakpoint
DROP TABLE `Bouts`;--> statement-breakpoint
ALTER TABLE `__new_Bouts` RENAME TO `Bouts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `Events` ADD `event_type` text DEFAULT 'individual';--> statement-breakpoint
ALTER TABLE `Events` ADD `team_format` text;--> statement-breakpoint
ALTER TABLE `Fencers` ADD `clubid` integer REFERENCES Clubs(id);