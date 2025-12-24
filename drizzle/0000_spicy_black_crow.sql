CREATE TABLE `device_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`name` text NOT NULL,
	`romBasePath` text NOT NULL,
	`systemMappings` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `device_profiles_name_idx` ON `device_profiles` (lower("name"));--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`name` text NOT NULL,
	`profileId` text NOT NULL,
	`deviceInfo` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `devices_profile_id_idx` ON `devices` (`profileId`);--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roms` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`system` text NOT NULL,
	`displayName` text NOT NULL,
	`region` text NOT NULL,
	`filePath` text NOT NULL,
	`filename` text NOT NULL,
	`romFilename` text NOT NULL,
	`size` integer NOT NULL,
	`md5` text NOT NULL,
	`fileCrc32` text NOT NULL,
	`ramd5` text,
	`verified` integer DEFAULT false NOT NULL,
	`tags` text,
	`favorite` integer,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roms_md5_idx` ON `roms` (`md5`);--> statement-breakpoint
CREATE INDEX `roms_system_idx` ON `roms` (`system`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
