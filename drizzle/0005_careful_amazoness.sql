CREATE TABLE `RelayLegHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_bout_id` integer NOT NULL,
	`leg_number` integer NOT NULL,
	`fencer_a_id` integer NOT NULL,
	`fencer_b_id` integer NOT NULL,
	`score_a` integer NOT NULL,
	`score_b` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`team_bout_id`) REFERENCES `TeamBouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fencer_a_id`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fencer_b_id`) REFERENCES `Fencers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `RelayLegHistory_team_bout_id_leg_number_unique` ON `RelayLegHistory` (`team_bout_id`,`leg_number`);