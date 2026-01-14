-- CreateTable
CREATE TABLE `Question` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `domain` ENUM('OS', 'NETWORK', 'DB', 'DATA_STRUCTURE') NOT NULL,
    `difficulty` ENUM('Basic', 'Intermediate', 'Advanced') NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `contentHash` CHAR(64) NOT NULL,
    `mustInclude` JSON NOT NULL,
    `timeLimitSec` INTEGER NOT NULL DEFAULT 180,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Question_domain_difficulty_idx`(`domain`, `difficulty`),
    INDEX `Question_domain_difficulty_topicId_idx`(`domain`, `difficulty`, `topicId`),
    UNIQUE INDEX `Question_domain_difficulty_topicId_contentHash_key`(`domain`, `difficulty`, `topicId`, `contentHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
