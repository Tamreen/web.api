
-- Create tamreen database.
create database tamreen;

-- Create users table.
drop table if exists users;

create table users(
	id bigint(20) not null auto_increment,
	playerId bigint(20) null default null,
	e164formattedMobileNumber varchar(15) not null,
	token varchar(256) null default null,
	deviceType enum('android', 'ios') null default null,
	deviceToken varchar(300) null default null,
	loginable tinyint(1) not null default 0,
	createdAt datetime not null,
	modifiedAt datetime null default null,
	deletedAt datetime null default null,
	primary key(id)
);

-- Create players table.
drop table if exists players;

create table players(
	id bigint(20) not null auto_increment,
	fullname varchar(100) not null,
	modifiedAt datetime null default null,
	primary key(id),
	index fullname(fullname)
);

-- Create groups table.
drop table if exists groups;

create table groups(
	id bigint(20) not null auto_increment,
	name varchar(200) not null,
	authorId bigint(20) not null,
	createdAt datetime not null,
	modifiedAt datetime null default null,
	deletedAt datetime null default null,
	primary key(id),
	index name(name)
);

-- Create group players table.
drop table if exists groupPlayers;

create table groupPlayers(
	id bigint(20) not null auto_increment,
	groupId bigint(20) not null,
	playerId bigint(20) not null,
	role enum('member', 'admin') not null,
	joinedAt datetime not null,
	leftAt datetime null default null,
	primary key(id)
);

-- Create trainings table.
drop table if exists trainings;

create table trainings(
	id bigint(20) not null auto_increment,
	groupId bigint(20) not null,
	name varchar(200) not null,
	status enum('gathering', 'completed', 'canceled') not null,
	stadium varchar(200) not null,
	startedAt datetime not null,
	playersCount int(11) not null default 0,
	subsetPlayersCount int(11) not null default 0,
	createdAt datetime not null,
	modifiedAt datetime null default null,
	primary key(id)
);

-- Create training players table.
drop table if exists trainingPlayers;

create table trainingPlayers(
	id bigint(20) not null auto_increment,
	trainingId bigint(20) not null,
	playerId bigint(20) not null,
	decision enum('notyet', 'willcome', 'apologize', 'register-as-subset') not null,
	createdAt datetime not null,
	modifiedAt datetime null default null,
	primary key(id)
);

-- Create training activities table.
drop table if exists trainingActivities;

create table trainingActivities(
	id bigint(20) not null auto_increment,
	trainingId bigint(20) not null,
	authorId bigint(20) not null,
	type enum('training-started','player-decided-to-come','player-apologized','player-registered-as-subset','training-completed','training-not-completed','training-canceled', 'player-brought-professional', 'training-allowed-professional') not null,
	createdAt datetime not null,
	primary key(id)
);

-- Create activity players table.
drop table if exists activityPlayers;

create table activityPlayers(
	id bigint(20) not null auto_increment,
	activityId bigint(20) not null,
	playerId bigint(20) not null,
	readable tinyint(1) not null default 0,
	createdAt datetime not null,
	modifiedAt datetime null default null,
	primary key(id)
);
