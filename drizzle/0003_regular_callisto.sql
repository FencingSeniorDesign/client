CREATE TABLE `TeamDEBracketBouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roundid` integer,
	`team_bout_id` integer,
	`bracket_type` text,
	`bracket_round` integer,
	`bout_order` integer,
	`next_bout_id` integer,
	`loser_next_bout_id` integer,
	FOREIGN KEY (`roundid`) REFERENCES `Rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_bout_id`) REFERENCES `TeamBouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`next_bout_id`) REFERENCES `TeamBouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loser_next_bout_id`) REFERENCES `TeamBouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `TeamBouts` ADD `eventid` integer NOT NULL REFERENCES Events(id);--> statement-breakpoint
ALTER TABLE `TeamBouts` ADD `team_format` text DEFAULT 'NCAA';--> statement-breakpoint
ALTER TABLE `TeamBouts` ADD `bout_type` text DEFAULT 'pool';--> statement-breakpoint
ALTER TABLE `TeamBouts` ADD `table_of` integer;