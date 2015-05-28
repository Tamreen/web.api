
-- Create feedbacks table.
drop table if exists feedbacks;

create table feedbacks(
	id bigint(20) not null auto_increment,
	authorId bigint(20) null default null,
	content text not null,
	createdAt datetime not null,
	modifiedAt datetime null default null,
	primary key(id)
);