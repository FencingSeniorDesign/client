PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_TeamMembers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teamid` integer NOT NULL,
	`fencerid` integer NOT NULL,
	`role` text DEFAULT 'starter' NOT NULL,
	`position` integer,
	FOREIGN KEY (`teamid`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fencerid`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_TeamMembers`("id", "teamid", "fencerid", "role", "position") SELECT "id", "teamid", "fencerid", "role", "position" FROM `TeamMembers`;--> statement-breakpoint
DROP TABLE `TeamMembers`;--> statement-breakpoint
ALTER TABLE `__new_TeamMembers` RENAME TO `TeamMembers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `TeamMembers_teamid_fencerid_unique` ON `TeamMembers` (`teamid`,`fencerid`);