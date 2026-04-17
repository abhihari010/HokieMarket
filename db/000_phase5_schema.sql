CREATE DATABASE IF NOT EXISTS `{{DB_NAME}}`;
USE `{{DB_NAME}}`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `bid`;
DROP TABLE IF EXISTS `message`;
DROP TABLE IF EXISTS `report`;
DROP TABLE IF EXISTS `review`;
DROP TABLE IF EXISTS `transaction`;
DROP TABLE IF EXISTS `auction`;
DROP TABLE IF EXISTS `conversation`;
DROP TABLE IF EXISTS `usersession`;
DROP TABLE IF EXISTS `listingimage`;
DROP TABLE IF EXISTS `listing`;
DROP TABLE IF EXISTS `course`;
DROP TABLE IF EXISTS `subjectarea`;
DROP TABLE IF EXISTS `category`;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS `department`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `department` (
    `departmentNo` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`departmentNo`)
);

CREATE TABLE `subjectarea` (
    `subjectPrefix` VARCHAR(16) NOT NULL,
    `departmentNo` INT NOT NULL,
    PRIMARY KEY (`subjectPrefix`),
    CONSTRAINT `fk_subjectarea_department`
        FOREIGN KEY (`departmentNo`) REFERENCES `department` (`departmentNo`)
);

CREATE TABLE `course` (
    `courseID` INT NOT NULL AUTO_INCREMENT,
    `subjectPrefix` VARCHAR(16) NOT NULL,
    `courseNumber` VARCHAR(16) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`courseID`),
    CONSTRAINT `fk_course_subjectarea`
        FOREIGN KEY (`subjectPrefix`) REFERENCES `subjectarea` (`subjectPrefix`)
);

CREATE TABLE `category` (
    `categoryID` INT NOT NULL AUTO_INCREMENT,
    `categoryName` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`categoryID`)
);

CREATE TABLE `user` (
    `userID` INT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phoneNo` VARCHAR(32) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('buyer', 'seller', 'admin') NOT NULL,
    `createdAt` DATETIME NOT NULL,
    PRIMARY KEY (`userID`),
    UNIQUE KEY `uq_user_email` (`email`)
);

CREATE TABLE `listing` (
    `listingID` INT NOT NULL AUTO_INCREMENT,
    `sellerID` INT NOT NULL,
    `categoryID` INT NOT NULL,
    `courseID` INT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `condition` VARCHAR(100) NOT NULL,
    `isAuction` TINYINT(1) NOT NULL DEFAULT 0,
    `price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('active', 'sold', 'closed') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME NOT NULL,
    PRIMARY KEY (`listingID`),
    CONSTRAINT `chk_listing_price`
        CHECK (`price` >= 0),
    CONSTRAINT `fk_listing_seller`
        FOREIGN KEY (`sellerID`) REFERENCES `user` (`userID`),
    CONSTRAINT `fk_listing_category`
        FOREIGN KEY (`categoryID`) REFERENCES `category` (`categoryID`),
    CONSTRAINT `fk_listing_course`
        FOREIGN KEY (`courseID`) REFERENCES `course` (`courseID`)
);

CREATE TABLE `usersession` (
    `sessionID` INT NOT NULL AUTO_INCREMENT,
    `userID` INT NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME NOT NULL,
    `expiresAt` DATETIME NOT NULL,
    `revokedAt` DATETIME NULL,
    PRIMARY KEY (`sessionID`),
    UNIQUE KEY `uq_usersession_token_hash` (`tokenHash`),
    CONSTRAINT `fk_usersession_user`
        FOREIGN KEY (`userID`) REFERENCES `user` (`userID`)
);

CREATE TABLE `listingimage` (
    `imageID` INT NOT NULL AUTO_INCREMENT,
    `listingID` INT NOT NULL,
    `imageURL` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`imageID`),
    CONSTRAINT `fk_listingimage_listing`
        FOREIGN KEY (`listingID`) REFERENCES `listing` (`listingID`)
);

CREATE TABLE `conversation` (
    `conversationID` INT NOT NULL AUTO_INCREMENT,
    `listingID` INT NOT NULL,
    `buyerID` INT NOT NULL,
    PRIMARY KEY (`conversationID`),
    UNIQUE KEY `uq_conversation_listing_buyer` (`listingID`, `buyerID`),
    CONSTRAINT `fk_conversation_listing`
        FOREIGN KEY (`listingID`) REFERENCES `listing` (`listingID`),
    CONSTRAINT `fk_conversation_buyer`
        FOREIGN KEY (`buyerID`) REFERENCES `user` (`userID`)
);

CREATE TABLE `message` (
    `messageID` INT NOT NULL AUTO_INCREMENT,
    `conversationID` INT NOT NULL,
    `senderID` INT NOT NULL,
    `content` TEXT NOT NULL,
    `timestamp` DATETIME NOT NULL,
    PRIMARY KEY (`messageID`),
    CONSTRAINT `fk_message_conversation`
        FOREIGN KEY (`conversationID`) REFERENCES `conversation` (`conversationID`),
    CONSTRAINT `fk_message_sender`
        FOREIGN KEY (`senderID`) REFERENCES `user` (`userID`)
);

CREATE TABLE `auction` (
    `auctionID` INT NOT NULL AUTO_INCREMENT,
    `listingID` INT NOT NULL,
    `endTime` DATETIME NOT NULL,
    `minimumPrice` DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (`auctionID`),
    UNIQUE KEY `uq_auction_listing` (`listingID`),
    CONSTRAINT `fk_auction_listing`
        FOREIGN KEY (`listingID`) REFERENCES `listing` (`listingID`)
);

CREATE TABLE `bid` (
    `bidID` INT NOT NULL AUTO_INCREMENT,
    `auctionID` INT NOT NULL,
    `bidderID` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `timestamp` DATETIME NOT NULL,
    PRIMARY KEY (`bidID`),
    CONSTRAINT `chk_bid_amount`
        CHECK (`amount` > 0),
    CONSTRAINT `fk_bid_auction`
        FOREIGN KEY (`auctionID`) REFERENCES `auction` (`auctionID`),
    CONSTRAINT `fk_bid_bidder`
        FOREIGN KEY (`bidderID`) REFERENCES `user` (`userID`)
);

CREATE TABLE `transaction` (
    `transactionID` INT NOT NULL AUTO_INCREMENT,
    `listingID` INT NOT NULL,
    `buyerID` INT NOT NULL,
    `finalPrice` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(64) NOT NULL,
    `completedAt` DATETIME NULL,
    PRIMARY KEY (`transactionID`),
    UNIQUE KEY `uq_transaction_listing` (`listingID`),
    CONSTRAINT `fk_transaction_listing`
        FOREIGN KEY (`listingID`) REFERENCES `listing` (`listingID`),
    CONSTRAINT `fk_transaction_buyer`
        FOREIGN KEY (`buyerID`) REFERENCES `user` (`userID`)
);

CREATE TABLE `report` (
    `reportID` INT NOT NULL AUTO_INCREMENT,
    `reporterID` INT NOT NULL,
    `listingID` INT NOT NULL,
    `adminID` INT NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`reportID`),
    CONSTRAINT `fk_report_reporter`
        FOREIGN KEY (`reporterID`) REFERENCES `user` (`userID`),
    CONSTRAINT `fk_report_listing`
        FOREIGN KEY (`listingID`) REFERENCES `listing` (`listingID`),
    CONSTRAINT `fk_report_admin`
        FOREIGN KEY (`adminID`) REFERENCES `user` (`userID`)
);

CREATE TABLE `review` (
    `reviewID` INT NOT NULL AUTO_INCREMENT,
    `listingID` INT NOT NULL,
    `reviewerID` INT NOT NULL,
    `rating` INT NOT NULL,
    `comment` TEXT NOT NULL,
    `date` DATETIME NOT NULL,
    PRIMARY KEY (`reviewID`),
    CONSTRAINT `chk_review_rating`
        CHECK (`rating` BETWEEN 1 AND 5),
    CONSTRAINT `fk_review_listing`
        FOREIGN KEY (`listingID`) REFERENCES `listing` (`listingID`),
    CONSTRAINT `fk_review_reviewer`
        FOREIGN KEY (`reviewerID`) REFERENCES `user` (`userID`)
);
