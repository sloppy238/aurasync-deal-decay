CREATE TABLE `dealSignals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`kind` enum('response_latency','engagement_decline','stakeholder_coverage','communication_gap') NOT NULL,
	`riskScore` int NOT NULL,
	`contribution` int NOT NULL,
	`trend` enum('rising','stable','improving') NOT NULL,
	`baselineValue` int NOT NULL,
	`currentValue` int NOT NULL,
	`unit` varchar(40) NOT NULL,
	`sourceSystem` varchar(40) NOT NULL,
	`observedAtMs` bigint NOT NULL,
	`provenance` text NOT NULL,
	CONSTRAINT `dealSignals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`externalId` varchar(128) NOT NULL,
	`name` varchar(240) NOT NULL,
	`accountName` varchar(200) NOT NULL,
	`ownerName` varchar(160) NOT NULL,
	`stage` varchar(120) NOT NULL,
	`valueCents` bigint NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`closeDateMs` bigint NOT NULL,
	`lastActivityAtMs` bigint NOT NULL,
	`decayScore` int NOT NULL,
	`riskLevel` enum('critical','high','medium','low') NOT NULL,
	`predictedStallDateMs` bigint,
	`recommendedAction` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governancePolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`retentionDays` int NOT NULL DEFAULT 90,
	`contentCollectionDisabled` boolean NOT NULL DEFAULT true,
	`contentStorageDisabled` boolean NOT NULL DEFAULT true,
	`participantHashingEnabled` boolean NOT NULL DEFAULT true,
	`auditLoggingEnabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governancePolicies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`provider` enum('gmail','outlook','slack','teams','salesforce','hubspot') NOT NULL,
	`category` enum('email','collaboration','crm') NOT NULL,
	`status` enum('connected','attention','available') NOT NULL,
	`connectionName` varchar(200),
	`collectedFields` text NOT NULL,
	`lastSyncAtMs` bigint,
	`eventCount` int NOT NULL DEFAULT 0,
	`metadataScopeVerified` boolean NOT NULL DEFAULT true,
	CONSTRAINT `integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`mode` enum('demo','live') NOT NULL DEFAULT 'demo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
