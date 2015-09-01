
-- TODO: Update the enumns in 'type' column in trainingActivities.

-- player-decided-to-come, player-apologized, player-brought-professional, training-gathering-started, training-started, training-gathering-completed, training-gathering-not-completed, training-completed, training-canceled, training-professionalized, training-publicized, training-poked

-- TODO: Add 'coordinates' column in users.

-- create table trainings(
-- 	id bigint(20) not null auto_increment,
-- 	groupId bigint(20) not null,
-- 	name varchar(200) not null,
-- 	status enum('gathering', 'completed', 'canceled') not null,
-- 	stadium varchar(200) not null,
-- 	startedAt datetime not null,
-- 	playersCount int(11) not null default 0,
-- 	subsetPlayersCount int(11) not null default 0,
-- 	createdAt datetime not null,
-- 	modifiedAt datetime null default null,
-- 	primary key(id)
-- );

status? -> gathering, gathering-completed, canceled, completed
publicized?
professionalized?
coordinates?
'no' subsetPlayersCount

-- create table trainingPlayers(
-- 	id bigint(20) not null auto_increment,
-- 	trainingId bigint(20) not null,
-- 	playerId bigint(20) not null,
-- 	decision enum('notyet', 'willcome', 'apologize', 'register-as-subset') not null,
-- 	createdAt datetime not null,
-- 	modifiedAt datetime null default null,
-- 	primary key(id)
-- );

role? -> admin, member
decision -> 'no' register-as-subset