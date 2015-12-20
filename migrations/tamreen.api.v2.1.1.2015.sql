
-- Delete every subset related decision.

delete from trainingActivities where type = 'player-registered-as-subset';

delete from trainingActivities where type = 'training-allowed-professional';

delete from trainingPlayers where decision = 'register-as-subset';

-- Update the enumns in 'type' column in trainingActivities.

-- This is a trick.

alter table trainingActivities modify column type enum('training-gathering-started', 'player-decided-to-come', 'player-apologized', 'training-gathering-completed', 'training-gathering-not-completed', 'training-poked', 'training-professionalized', 'player-brought-professional', 'training-publicized', 'training-canceled', 'training-started', 'training-completed', 'training-not-completed');

-- Update old type values in trainingActivities.

update trainingActivities set type = 'training-gathering-not-completed' where type = 'training-not-completed';

update trainingActivities set type = 'training-started' where type = 'training-gathering-started';

update trainingActivities set type = 'training-completed' where type = 'training-gathering-completed';

alter table trainingActivities modify column type enum('training-gathering-started', 'player-decided-to-come', 'player-apologized', 'training-gathering-completed', 'training-gathering-not-completed', 'training-poked', 'training-professionalized', 'player-brought-professional', 'training-publicized', 'training-canceled', 'training-started', 'training-completed');

-- Add 'coordinates' and other columns in trainings.

alter table trainings modify column status enum('gathering', 'gathering-completed', 'canceled', 'started', 'completed') not null;

alter table trainings add column coordinates point null default null after stadium;

alter table trainings add index coordinates(coordinates);

-- TODO: The coordinates column must be indexed.

alter table trainings add column professionalized tinyint(1) not null default 0 after playersCount;

alter table trainings add column publicized tinyint(1) not null default 0 after professionalized;

alter table trainings drop column subsetPlayersCount;

alter table trainings drop column groupId;

-- Update old status values in trainings.

update trainings set status = 'gathering-completed' where status = 'completed';

-- TODO: Update the gathering trainings to be completed for the first time.

update trainings set status = 'started' where now() > startedAt and (status <> 'canceled' and status <> 'completed' and status <> 'started');

update trainings set status = 'completed' where now() > date_add(startedAt, interval 2 hour) and (status <> 'canceled' and status <> 'completed');

-- Add 'role' and modify 'decision' in trainingPlayers.

alter table trainingPlayers add column role enum('member', 'admin') not null after playerId;

alter table trainingPlayers modify column decision enum('notyet', 'willcome', 'apologize') not null;

