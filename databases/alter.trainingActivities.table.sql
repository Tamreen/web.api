
alter table trainingActivities modify column type enum('training-started','player-decided-to-come','player-apologized','player-registered-as-subset','training-completed','training-not-completed','training-canceled', 'player-brought-professional');