CREATE TABLE `document_collection_items` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`collectionId` text NOT NULL,
	`documentId` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_collection_items_unique_idx` ON `document_collection_items` (`collectionId`,`documentId`);--> statement-breakpoint
CREATE INDEX `document_collection_items_collection_idx` ON `document_collection_items` (`collectionId`);--> statement-breakpoint
CREATE INDEX `document_collection_items_document_idx` ON `document_collection_items` (`documentId`);--> statement-breakpoint
CREATE TABLE `document_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_collections_name_idx` ON `document_collections` (lower("name"));--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`fileType` text NOT NULL,
	`title` text NOT NULL,
	`filePath` text NOT NULL,
	`filename` text NOT NULL,
	`extension` text NOT NULL,
	`mimeType` text,
	`size` integer NOT NULL,
	`checksum` text NOT NULL,
	`author` text,
	`subject` text,
	`pageCount` integer,
	`sheetCount` integer,
	`language` text,
	`textContent` text,
	`tags` text,
	`favorite` integer DEFAULT false,
	`notes` text,
	`importedAt` integer NOT NULL,
	`modifiedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_file_path_idx` ON `documents` (`filePath`);--> statement-breakpoint
CREATE INDEX `documents_type_idx` ON `documents` (`fileType`);--> statement-breakpoint
CREATE INDEX `documents_title_idx` ON `documents` (lower("title"));--> statement-breakpoint
CREATE INDEX `documents_checksum_idx` ON `documents` (`checksum`);