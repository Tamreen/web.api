
//
FeedbackService = {

	send: function(content, authorId){

		var insertFeedbackParameters = {authorId: authorId, content: content, createdAt: new Date()};
		var queryInsertFeedback = DatabaseService.format('insert into feedbacks set ?', [insertFeedbackParameters]);
		return DatabaseService.query(queryInsertFeedback);
	},
};