USE `{{DB_NAME}}`;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `bid`;
TRUNCATE TABLE `message`;
TRUNCATE TABLE `report`;
TRUNCATE TABLE `review`;
TRUNCATE TABLE `transaction`;
TRUNCATE TABLE `auction`;
TRUNCATE TABLE `conversation`;
TRUNCATE TABLE `usersession`;
TRUNCATE TABLE `listingimage`;
TRUNCATE TABLE `listing`;
TRUNCATE TABLE `course`;
TRUNCATE TABLE `subjectarea`;
TRUNCATE TABLE `category`;
TRUNCATE TABLE `user`;
TRUNCATE TABLE `department`;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO `department` (`departmentNo`, `name`) VALUES
(1, 'Computer Science'),
(2, 'Mathematics'),
(3, 'Physics'),
(4, 'Chemistry'),
(5, 'Biology'),
(6, 'English'),
(7, 'History'),
(8, 'Economics'),
(9, 'Business Information Technology'),
(10, 'Mechanical Engineering'),
(11, 'Electrical Engineering'),
(12, 'Civil Engineering'),
(13, 'Psychology'),
(14, 'Sociology'),
(15, 'Political Science'),
(16, 'Statistics'),
(17, 'Architecture'),
(18, 'Communication'),
(19, 'Marketing'),
(20, 'Finance');

INSERT INTO `subjectarea` (`subjectPrefix`, `departmentNo`) VALUES
('CS', 1),
('MATH', 2),
('PHYS', 3),
('CHEM', 4),
('BIOL', 5),
('ENGL', 6),
('HIST', 7),
('ECON', 8),
('BIT', 9),
('ME', 10),
('ECE', 11),
('CEE', 12),
('PSYC', 13),
('SOC', 14),
('PSCI', 15),
('STAT', 16),
('ARCH', 17),
('COMM', 18),
('MKTG', 19),
('FIN', 20);

INSERT INTO `course` (`courseID`, `subjectPrefix`, `courseNumber`, `title`) VALUES
(1, 'CS', '1114', 'Introduction to Software Design'),
(2, 'MATH', '1225', 'Calculus of a Single Variable'),
(3, 'PHYS', '2305', 'Foundations of Physics I'),
(4, 'CHEM', '1035', 'General Chemistry'),
(5, 'BIOL', '1105', 'Principles of Biology'),
(6, 'ENGL', '1106', 'First-Year Writing'),
(7, 'HIST', '1115', 'Modern World History'),
(8, 'ECON', '2005', 'Microeconomic Principles'),
(9, 'BIT', '2405', 'Business Statistics'),
(10, 'ME', '2004', 'Engineering Mechanics'),
(11, 'ECE', '1004', 'Introduction to Electrical Engineering'),
(12, 'CEE', '2014', 'Engineering Surveying'),
(13, 'PSYC', '1004', 'Introduction to Psychology'),
(14, 'SOC', '1004', 'Introductory Sociology'),
(15, 'PSCI', '1014', 'Comparative Politics'),
(16, 'STAT', '3005', 'Statistical Methods'),
(17, 'ARCH', '2004', 'Architectural Graphics'),
(18, 'COMM', '2004', 'Public Speaking'),
(19, 'MKTG', '3104', 'Marketing Management'),
(20, 'FIN', '3054', 'Corporate Finance');

INSERT INTO `category` (`categoryID`, `categoryName`) VALUES
(1, 'Textbooks'),
(2, 'iClickers'),
(3, 'Furniture'),
(4, 'Electronics'),
(5, 'Calculators'),
(6, 'Lab Gear'),
(7, 'Bikes'),
(8, 'Dorm Decor'),
(9, 'Kitchen'),
(10, 'Apparel'),
(11, 'Tickets'),
(12, 'Gaming'),
(13, 'Storage'),
(14, 'Printers'),
(15, 'Monitors'),
(16, 'Lighting'),
(17, 'Bedding'),
(18, 'Sports'),
(19, 'Art Supplies'),
(20, 'Miscellaneous');

INSERT INTO `user` (`userID`, `email`, `name`, `phoneNo`, `passwordHash`, `role`, `createdAt`) VALUES
(1, 'alex.carter@vt.edu', 'Alex Carter', '540-101-2001', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:00:00'),
(2, 'maya.patel@vt.edu', 'Maya Patel', '540-101-2002', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:05:00'),
(3, 'jordan.lee@vt.edu', 'Jordan Lee', '540-101-2003', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:10:00'),
(4, 'sophia.nguyen@vt.edu', 'Sophia Nguyen', '540-101-2004', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:15:00'),
(5, 'ethan.brooks@vt.edu', 'Ethan Brooks', '540-101-2005', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:20:00'),
(6, 'olivia.turner@vt.edu', 'Olivia Turner', '540-101-2006', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:25:00'),
(7, 'liam.hall@vt.edu', 'Liam Hall', '540-101-2007', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:30:00'),
(8, 'ava.king@vt.edu', 'Ava King', '540-101-2008', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:35:00'),
(9, 'noah.rivera@vt.edu', 'Noah Rivera', '540-101-2009', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:40:00'),
(10, 'emma.ward@vt.edu', 'Emma Ward', '540-101-2010', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:45:00'),
(11, 'william.foster@vt.edu', 'William Foster', '540-101-2011', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:50:00'),
(12, 'grace.hughes@vt.edu', 'Grace Hughes', '540-101-2012', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 09:55:00'),
(13, 'daniel.price@vt.edu', 'Daniel Price', '540-101-2013', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 10:00:00'),
(14, 'chloe.bennett@vt.edu', 'Chloe Bennett', '540-101-2014', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 10:05:00'),
(15, 'henry.coleman@vt.edu', 'Henry Coleman', '540-101-2015', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 10:10:00'),
(16, 'ella.bailey@vt.edu', 'Ella Bailey', '540-101-2016', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 10:15:00'),
(17, 'jack.morris@vt.edu', 'Jack Morris', '540-101-2017', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 10:20:00'),
(18, 'nora.reed@vt.edu', 'Nora Reed', '540-101-2018', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'member', '2026-03-01 10:25:00'),
(19, 'admin.one@vt.edu', 'Morgan Admin', '540-101-2019', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'admin', '2026-03-01 10:30:00'),
(20, 'admin.two@vt.edu', 'Taylor Admin', '540-101-2020', 'pbkdf2_sha256$390000$BpPNJCR31ER1fD1dAPJYQg$w0uknf0Mjo-jE82asFdhXehlGw1e3YYogGR4qr-BkKg', 'admin', '2026-03-01 10:35:00');

INSERT INTO `listing` (`listingID`, `sellerID`, `categoryID`, `courseID`, `title`, `description`, `condition`, `isAuction`, `price`, `status`, `createdAt`) VALUES
(1, 1, 1, 1, 'CS 1114 Textbook Bundle', 'Includes textbook and lab notes for Intro to Software Design.', 'Good', 0, 45.00, 'sold', '2026-03-10 08:00:00'),
(2, 2, 2, NULL, 'iClicker 2 Remote', 'Fully working iClicker with battery included.', 'Very Good', 0, 20.00, 'sold', '2026-03-10 08:10:00'),
(3, 3, 3, NULL, 'Wooden Desk for Dorm', 'Compact desk that fits well in a dorm or apartment.', 'Good', 0, 70.00, 'sold', '2026-03-10 08:20:00'),
(4, 4, 4, NULL, 'TI-84 Plus Calculator', 'Graphing calculator approved for most math courses.', 'Excellent', 0, 65.00, 'sold', '2026-03-10 08:30:00'),
(5, 5, 1, 2, 'Calculus Early Transcendentals', 'Used in MATH 1225 with highlighted examples.', 'Fair', 0, 35.00, 'sold', '2026-03-10 08:40:00'),
(6, 6, 6, 4, 'Chemistry Goggles and Lab Coat', 'Clean set for CHEM lab requirements.', 'Good', 0, 25.00, 'sold', '2026-03-10 08:50:00'),
(7, 7, 15, NULL, '24-inch Dell Monitor', '1080p monitor with HDMI cable included.', 'Very Good', 0, 80.00, 'sold', '2026-03-10 09:00:00'),
(8, 8, 7, NULL, 'Campus Commuter Bike', 'Reliable bike with lock and front light.', 'Good', 0, 120.00, 'sold', '2026-03-10 09:10:00'),
(9, 9, 17, NULL, 'Twin XL Bedding Set', 'Includes comforter, sheets, and pillowcase.', 'Excellent', 0, 30.00, 'active', '2026-03-10 09:20:00'),
(10, 10, 13, NULL, 'Plastic Storage Drawers', 'Three-drawer storage unit for dorm supplies.', 'Good', 0, 18.00, 'active', '2026-03-10 09:30:00'),
(11, 11, 1, 3, 'Physics 2305 Textbook', 'Hardcover textbook in strong condition.', 'Very Good', 1, 40.00, 'closed', '2026-03-10 09:40:00'),
(12, 12, 8, NULL, 'LED Strip Lights', 'Color-changing strip lights for dorm rooms.', 'Excellent', 1, 15.00, 'closed', '2026-03-10 09:50:00'),
(13, 1, 9, NULL, 'Mini Rice Cooker', 'Great for simple meals in apartment housing.', 'Good', 1, 22.00, 'closed', '2026-03-10 10:00:00'),
(14, 2, 10, NULL, 'VT Hoodie Size M', 'Maroon hoodie with minimal wear.', 'Very Good', 1, 28.00, 'closed', '2026-03-10 10:10:00'),
(15, 3, 14, NULL, 'HP DeskJet Printer', 'Printer works well and includes extra ink.', 'Good', 1, 55.00, 'active', '2026-03-10 10:20:00'),
(16, 4, 19, NULL, 'Architecture Drafting Kit', 'Includes ruler set, pencils, and templates.', 'Excellent', 1, 32.00, 'active', '2026-03-10 10:30:00'),
(17, 5, 11, NULL, 'Football Student Section Ticket', 'Digital transfer for this weekend game.', 'Excellent', 1, 18.00, 'active', '2026-03-10 10:40:00'),
(18, 6, 12, NULL, 'Nintendo Switch Pro Controller', 'Works perfectly and holds charge well.', 'Very Good', 1, 38.00, 'active', '2026-03-10 10:50:00'),
(19, 7, 18, NULL, 'Yoga Mat and Resistance Bands', 'Good set for apartment workouts.', 'Good', 1, 20.00, 'active', '2026-03-10 11:00:00'),
(20, 8, 20, NULL, 'Dorm Essentials Bundle', 'Mixed set with lamp, storage bins, and hangers.', 'Good', 1, 26.00, 'active', '2026-03-10 11:10:00');

INSERT INTO `listingimage` (`imageID`, `listingID`, `imageURL`) VALUES
(1, 1, 'https://example.com/images/listings/1.jpg'),
(2, 2, 'https://example.com/images/listings/2.jpg'),
(3, 3, 'https://example.com/images/listings/3.jpg'),
(4, 4, 'https://example.com/images/listings/4.jpg'),
(5, 5, 'https://example.com/images/listings/5.jpg'),
(6, 6, 'https://example.com/images/listings/6.jpg'),
(7, 7, 'https://example.com/images/listings/7.jpg'),
(8, 8, 'https://example.com/images/listings/8.jpg'),
(9, 9, 'https://example.com/images/listings/9.jpg'),
(10, 10, 'https://example.com/images/listings/10.jpg'),
(11, 11, 'https://example.com/images/listings/11.jpg'),
(12, 12, 'https://example.com/images/listings/12.jpg'),
(13, 13, 'https://example.com/images/listings/13.jpg'),
(14, 14, 'https://example.com/images/listings/14.jpg'),
(15, 15, 'https://example.com/images/listings/15.jpg'),
(16, 16, 'https://example.com/images/listings/16.jpg'),
(17, 17, 'https://example.com/images/listings/17.jpg'),
(18, 18, 'https://example.com/images/listings/18.jpg'),
(19, 19, 'https://example.com/images/listings/19.jpg'),
(20, 20, 'https://example.com/images/listings/20.jpg');

INSERT INTO `conversation` (`conversationID`, `listingID`, `buyerID`) VALUES
(1, 1, 13),
(2, 2, 14),
(3, 3, 15),
(4, 4, 16),
(5, 5, 17),
(6, 6, 18),
(7, 7, 13),
(8, 8, 14),
(9, 9, 15),
(10, 10, 16),
(11, 11, 17),
(12, 12, 18),
(13, 13, 13),
(14, 14, 14),
(15, 15, 15),
(16, 16, 16),
(17, 17, 17),
(18, 18, 18),
(19, 19, 13),
(20, 20, 14);

INSERT INTO `message` (`messageID`, `conversationID`, `senderID`, `content`, `timestamp`) VALUES
(1, 1, 13, 'Hi, is the CS 1114 bundle still available?', '2026-03-11 09:00:00'),
(2, 2, 14, 'Can you meet near Torgersen for the iClicker?', '2026-03-11 09:05:00'),
(3, 3, 15, 'Is the desk easy to move in a sedan?', '2026-03-11 09:10:00'),
(4, 4, 16, 'Does the calculator come with a cover?', '2026-03-11 09:15:00'),
(5, 5, 17, 'Would you take 30 dollars for the calculus book?', '2026-03-11 09:20:00'),
(6, 6, 18, 'Can I pick up the lab coat this afternoon?', '2026-03-11 09:25:00'),
(7, 7, 13, 'Is the monitor VESA compatible?', '2026-03-11 09:30:00'),
(8, 8, 14, 'Has the bike had any recent repairs?', '2026-03-11 09:35:00'),
(9, 9, 15, 'Could you hold the bedding set until Friday?', '2026-03-11 09:40:00'),
(10, 10, 16, 'What are the storage drawer dimensions?', '2026-03-11 09:45:00'),
(11, 11, 17, 'I placed a bid on the physics textbook auction.', '2026-03-11 09:50:00'),
(12, 12, 18, 'Do the LED lights come with a remote?', '2026-03-11 09:55:00'),
(13, 13, 13, 'Can the rice cooker be picked up tonight?', '2026-03-11 10:00:00'),
(14, 14, 14, 'Would you consider 25 dollars for the hoodie?', '2026-03-11 10:05:00'),
(15, 15, 15, 'How much ink is left in the printer?', '2026-03-11 10:10:00'),
(16, 16, 16, 'Is the drafting kit complete?', '2026-03-11 10:15:00'),
(17, 17, 17, 'I am interested in the student ticket transfer.', '2026-03-11 10:20:00'),
(18, 18, 18, 'Can you share more photos of the controller?', '2026-03-11 10:25:00'),
(19, 19, 13, 'Has the yoga mat been used outdoors?', '2026-03-11 10:30:00'),
(20, 20, 14, 'What items are included in the dorm bundle?', '2026-03-11 10:35:00');

INSERT INTO `auction` (`auctionID`, `listingID`, `endTime`, `minimumPrice`) VALUES
(1, 11, '2026-03-30 18:00:00', 40.00),
(2, 12, '2026-03-30 18:15:00', 15.00),
(3, 13, '2026-03-30 18:30:00', 22.00),
(4, 14, '2026-03-30 18:45:00', 28.00),
(5, 15, '2026-03-30 19:00:00', 55.00),
(6, 16, '2026-03-30 19:15:00', 32.00),
(7, 17, '2026-03-30 19:30:00', 18.00),
(8, 18, '2026-03-30 19:45:00', 38.00),
(9, 19, '2026-03-30 20:00:00', 20.00),
(10, 20, '2026-03-30 20:15:00', 26.00);

INSERT INTO `bid` (`bidID`, `auctionID`, `bidderID`, `amount`, `timestamp`) VALUES
(1, 1, 13, 42.00, '2026-03-12 12:00:00'),
(2, 1, 14, 46.00, '2026-03-12 12:10:00'),
(3, 2, 15, 16.00, '2026-03-12 12:20:00'),
(4, 2, 16, 19.00, '2026-03-12 12:30:00'),
(5, 3, 17, 24.00, '2026-03-12 12:40:00'),
(6, 3, 18, 27.00, '2026-03-12 12:50:00'),
(7, 4, 13, 30.00, '2026-03-12 13:00:00'),
(8, 4, 15, 33.00, '2026-03-12 13:10:00'),
(9, 5, 14, 58.00, '2026-03-12 13:20:00'),
(10, 5, 16, 62.00, '2026-03-12 13:30:00'),
(11, 6, 17, 35.00, '2026-03-12 13:40:00'),
(12, 6, 18, 39.00, '2026-03-12 13:50:00'),
(13, 7, 13, 20.00, '2026-03-12 14:00:00'),
(14, 7, 14, 23.00, '2026-03-12 14:10:00'),
(15, 8, 15, 40.00, '2026-03-12 14:20:00'),
(16, 8, 16, 44.00, '2026-03-12 14:30:00'),
(17, 9, 17, 22.00, '2026-03-12 14:40:00'),
(18, 9, 18, 25.00, '2026-03-12 14:50:00'),
(19, 10, 13, 28.00, '2026-03-12 15:00:00'),
(20, 10, 15, 31.00, '2026-03-12 15:10:00');

INSERT INTO `transaction` (`transactionID`, `listingID`, `buyerID`, `finalPrice`, `status`, `completedAt`) VALUES
(1, 1, 13, 45.00, 'Completed', '2026-03-15 14:00:00'),
(2, 2, 14, 20.00, 'Completed', '2026-03-15 14:10:00'),
(3, 3, 15, 70.00, 'Completed', '2026-03-15 14:20:00'),
(4, 4, 16, 65.00, 'Completed', '2026-03-15 14:30:00'),
(5, 5, 17, 35.00, 'Completed', '2026-03-15 14:40:00'),
(6, 6, 18, 25.00, 'Completed', '2026-03-15 14:50:00'),
(7, 7, 13, 80.00, 'Completed', '2026-03-15 15:00:00'),
(8, 8, 14, 120.00, 'Completed', '2026-03-15 15:10:00'),
(9, 9, 15, 30.00, 'Completed', '2026-03-15 15:20:00'),
(10, 10, 16, 18.00, 'Completed', '2026-03-15 15:30:00'),
(11, 11, 14, 46.00, 'Completed', '2026-03-16 11:00:00'),
(12, 12, 16, 19.00, 'Completed', '2026-03-16 11:10:00'),
(13, 13, 18, 27.00, 'Completed', '2026-03-16 11:20:00'),
(14, 14, 15, 33.00, 'Completed', '2026-03-16 11:30:00'),
(15, 15, 16, 62.00, 'Completed', '2026-03-16 11:40:00'),
(16, 16, 18, 39.00, 'Completed', '2026-03-16 11:50:00'),
(17, 17, 14, 23.00, 'Pending Pickup', NULL),
(18, 18, 16, 44.00, 'Pending Pickup', NULL),
(19, 19, 18, 25.00, 'Pending Pickup', NULL),
(20, 20, 15, 31.00, 'Pending Pickup', NULL);

INSERT INTO `report` (`reportID`, `reporterID`, `listingID`, `adminID`, `reason`, `status`) VALUES
(1, 13, 2, 19, 'Duplicate listing suspected because a similar iClicker was posted twice.', 'Resolved'),
(2, 14, 3, 19, 'Seller took a long time to respond after arranging pickup.', 'Open'),
(3, 15, 4, 20, 'Listing title was unclear and missing model details.', 'Resolved'),
(4, 16, 6, 19, 'Image did not initially match the listed lab coat size.', 'Under Review'),
(5, 17, 8, 20, 'Buyer reported delay in confirming bike availability.', 'Open'),
(6, 18, 11, 19, 'Concern about wear level on textbook not shown in photos.', 'Resolved'),
(7, 13, 12, 20, 'Auction description omitted adhesive backing details.', 'Open'),
(8, 14, 15, 19, 'Printer listing did not mention cable type.', 'Resolved'),
(9, 15, 16, 20, 'Drafting kit photo was missing one item at first.', 'Under Review'),
(10, 16, 18, 19, 'Controller listing briefly showed wrong color in thumbnail.', 'Resolved'),
(11, 17, 19, 20, 'Wanted admin check on condition wording for exercise gear.', 'Open'),
(12, 18, 20, 19, 'Bundle contents changed after initial posting.', 'Under Review'),
(13, 13, 1, 20, 'Textbook highlighted heavily and the buyer wanted clarification.', 'Resolved'),
(14, 14, 5, 19, 'Math book edition needed to be verified.', 'Resolved'),
(15, 15, 7, 20, 'Monitor listing lacked refresh rate detail.', 'Open'),
(16, 16, 9, 19, 'Bedding listing needed clarification on wash condition.', 'Resolved'),
(17, 17, 10, 20, 'Storage dimensions were added after follow-up.', 'Resolved'),
(18, 18, 13, 19, 'Rice cooker inner bowl condition requested for review.', 'Open'),
(19, 13, 14, 20, 'Hoodie size fit was disputed in messages.', 'Under Review'),
(20, 14, 17, 19, 'Ticket transfer timing needed admin confirmation.', 'Resolved');

INSERT INTO `review` (`reviewID`, `listingID`, `reviewerID`, `rating`, `comment`, `date`) VALUES
(1, 1, 13, 5, 'Smooth meetup and the book matched the description.', '2026-03-17 09:00:00'),
(2, 2, 14, 5, 'iClicker worked perfectly in class.', '2026-03-17 09:10:00'),
(3, 3, 15, 4, 'Desk was sturdy and easy to assemble.', '2026-03-17 09:20:00'),
(4, 4, 16, 5, 'Calculator was in excellent shape.', '2026-03-17 09:30:00'),
(5, 5, 17, 4, 'Book had some notes but was still a good deal.', '2026-03-17 09:40:00'),
(6, 6, 18, 5, 'Lab gear was clean and ready to use.', '2026-03-17 09:50:00'),
(7, 7, 13, 5, 'Monitor looked great and included the cable.', '2026-03-17 10:00:00'),
(8, 8, 14, 4, 'Bike rides well and the seller was helpful.', '2026-03-17 10:10:00'),
(9, 9, 15, 5, 'Bedding set was exactly as described.', '2026-03-17 10:20:00'),
(10, 10, 16, 4, 'Useful storage drawers for a fair price.', '2026-03-17 10:30:00'),
(11, 11, 14, 5, 'Auction process was easy and the textbook arrived on time.', '2026-03-17 10:40:00'),
(12, 12, 16, 5, 'Lights worked well and setup was quick.', '2026-03-17 10:50:00'),
(13, 13, 18, 4, 'Rice cooker worked but had a little wear.', '2026-03-17 11:00:00'),
(14, 14, 15, 5, 'Hoodie was clean and fit as expected.', '2026-03-17 11:10:00'),
(15, 15, 16, 4, 'Printer needed setup help but prints clearly.', '2026-03-17 11:20:00'),
(16, 16, 18, 5, 'Great drafting kit for studio work.', '2026-03-17 11:30:00'),
(17, 17, 14, 5, 'Ticket transfer was immediate.', '2026-03-17 11:40:00'),
(18, 18, 16, 5, 'Controller feels almost new.', '2026-03-17 11:50:00'),
(19, 19, 18, 4, 'Workout set was in good condition.', '2026-03-17 12:00:00'),
(20, 20, 15, 4, 'Bundle had useful dorm items for move-in.', '2026-03-17 12:10:00');

ALTER TABLE `course` AUTO_INCREMENT = 21;
ALTER TABLE `category` AUTO_INCREMENT = 21;
ALTER TABLE `user` AUTO_INCREMENT = 21;
ALTER TABLE `listing` AUTO_INCREMENT = 21;
ALTER TABLE `usersession` AUTO_INCREMENT = 1;
ALTER TABLE `listingimage` AUTO_INCREMENT = 21;
ALTER TABLE `conversation` AUTO_INCREMENT = 21;
ALTER TABLE `message` AUTO_INCREMENT = 21;
ALTER TABLE `auction` AUTO_INCREMENT = 11;
ALTER TABLE `bid` AUTO_INCREMENT = 21;
ALTER TABLE `transaction` AUTO_INCREMENT = 21;
ALTER TABLE `report` AUTO_INCREMENT = 21;
ALTER TABLE `review` AUTO_INCREMENT = 21;
