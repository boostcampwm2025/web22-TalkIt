-- CreateTable
CREATE TABLE `Question` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `category` ENUM('OS', 'NETWORK', 'DB', 'DATA_STRUCTURE') NOT NULL,
    `difficulty` ENUM('EAZY', 'MEDIUM', 'HARD') NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `contentHash` CHAR(64) NOT NULL,
    `mustInclude` JSON NOT NULL,
    `timeLimitSec` INTEGER NOT NULL DEFAULT 180,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Question_category_difficulty_idx`(`category`, `difficulty`),
    INDEX `Question_category_difficulty_topicId_idx`(`category`, `difficulty`, `topicId`),
    UNIQUE INDEX `Question_category_difficulty_topicId_contentHash_key`(`category`, `difficulty`, `topicId`, `contentHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
