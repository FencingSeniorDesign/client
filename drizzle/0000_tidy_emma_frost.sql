CREATE TABLE `Bouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lfencer` integer,
	`rfencer` integer,
	`victor` integer,
	`referee` integer,
	`eventid` integer,
	`roundid` integer,
	`tableof` integer,
	FOREIGN KEY (`lfencer`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rfencer`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`victor`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referee`) REFERENCES `Referees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eventid`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`roundid`) REFERENCES `Rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `DEBracketBouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roundid` integer,
	`bout_id` integer,
	`bracket_type` text,
	`bracket_round` integer,
	`bout_order` integer,
	`next_bout_id` integer,
	`loser_next_bout_id` integer,
	FOREIGN KEY (`roundid`) REFERENCES `Rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bout_id`) REFERENCES `Bouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`next_bout_id`) REFERENCES `Bouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loser_next_bout_id`) REFERENCES `Bouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `DETable` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roundid` integer,
	`tableof` integer,
	FOREIGN KEY (`roundid`) REFERENCES `Rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tname` text NOT NULL,
	`weapon` text NOT NULL,
	`gender` text NOT NULL,
	`age` text NOT NULL,
	`class` text NOT NULL,
	`seeding` text,
	FOREIGN KEY (`tname`) REFERENCES `Tournaments`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `FencerBouts` (
	`boutid` integer,
	`fencerid` integer,
	`score` integer,
	PRIMARY KEY(`boutid`, `fencerid`),
	FOREIGN KEY (`boutid`) REFERENCES `Bouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fencerid`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `FencerEvents` (
	`fencerid` integer NOT NULL,
	`eventid` integer NOT NULL,
	PRIMARY KEY(`fencerid`, `eventid`),
	FOREIGN KEY (`fencerid`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eventid`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `FencerPoolAssignment` (
	`roundid` integer NOT NULL,
	`poolid` integer NOT NULL,
	`fencerid` integer NOT NULL,
	`fenceridinpool` integer NOT NULL,
	PRIMARY KEY(`roundid`, `poolid`, `fencerid`),
	FOREIGN KEY (`roundid`) REFERENCES `Rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fencerid`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Fencers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fname` text NOT NULL,
	`lname` text NOT NULL,
	`nickname` text,
	`gender` text,
	`club` text,
	`erating` text DEFAULT 'U',
	`eyear` integer DEFAULT 0,
	`frating` text DEFAULT 'U',
	`fyear` integer DEFAULT 0,
	`srating` text DEFAULT 'U',
	`syear` integer DEFAULT 0,
	PRIMARY KEY(`fname`, `lname`)
);
--> statement-breakpoint
CREATE TABLE `OfficialEvents` (
	`officialid` integer NOT NULL,
	`eventid` integer NOT NULL,
	PRIMARY KEY(`officialid`, `eventid`),
	FOREIGN KEY (`officialid`) REFERENCES `Officials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eventid`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Officials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fname` text NOT NULL,
	`lname` text NOT NULL,
	`nickname` text,
	`device_id` text
);
--> statement-breakpoint
CREATE TABLE `RefereeEvents` (
	`refereeid` integer NOT NULL,
	`eventid` integer NOT NULL,
	PRIMARY KEY(`refereeid`, `eventid`),
	FOREIGN KEY (`refereeid`) REFERENCES `Referees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eventid`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Referees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fname` text NOT NULL,
	`lname` text NOT NULL,
	`nickname` text,
	`device_id` text
);
--> statement-breakpoint
CREATE TABLE `Rounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`eventid` integer NOT NULL,
	`type` text NOT NULL,
	`rorder` integer NOT NULL,
	`poolcount` integer,
	`poolsize` integer,
	`poolsoption` text DEFAULT 'promotion',
	`promotionpercent` integer DEFAULT 100,
	`targetbracket` integer,
	`usetargetbracket` integer DEFAULT false,
	`deformat` text,
	`detablesize` integer,
	`isstarted` integer DEFAULT false,
	`iscomplete` integer DEFAULT false,
	FOREIGN KEY (`eventid`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `SeedingFromRoundResults` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fencerid` integer,
	`eventid` integer,
	`roundid` integer,
	`seed` integer NOT NULL,
	FOREIGN KEY (`fencerid`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eventid`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`roundid`) REFERENCES `Rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Tournaments` (
	`name` text PRIMARY KEY NOT NULL,
	`iscomplete` integer DEFAULT false
);
