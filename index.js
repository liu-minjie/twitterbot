const fs = require("fs");
const Twitter = require("twitter");
const request = require("request");
const config = require("./twitter.json");
const client = new Twitter(config);
const tool = {};


//https://www.cnblogs.com/rubinorth/p/5857755.html



function search (q) {
	client.get("search/tweets", { // 450 request per 15 minite
		q: encodeURIComponent(q),
		count: 5,
		include_entities: true
	}, (error, tweets, response) => {
		if (error) {
      console.log(JSON.stringify(error));
      return
    }
		fs.writeFileSync("./search.json", JSON.stringify(tweets, null, 1), "utf8");
	});
}
tool.search = search;

//getFriendsList

function saveTimeline(username, data, count, next) {
	if (tweetMap[username]) {
		data = data.concat(tweetMap[username]);
	}
	fs.writeFile(`./users/${username}.json`, JSON.stringify({
		time: Date.now(),
		lists: data
	}, null, 1), "utf8", (err) => {
		if (err) {
	  	console.log(JSON.stringify(err));
	  	return
	  }
	  next && next(count);
	});
}
function getReply(item, data) {
	if (item.retweeted_status) {
		item = item.retweeted_status;
		item.entities = item.entities || {};
	  item.entities.urls = item.entities.urls || [];
	  const urls =  item.entities.urls;
		data.retweeted_status = {
			id: item.id,
			id_str: item.id_str,
  		created_at: item.created_at,
  		text: item.text,
  		retweet_count: item.retweet_count,
  		favorite_count: item.favorite_count,
  		place: item.place && item.place.full_name,
  		in_reply_to_status_id: item.in_reply_to_status_id,
	  	in_reply_to_screen_name: item.in_reply_to_screen_name,
	  	urls: urls.map((it) => { return  {url: it.url, expand: it.expanded_url}})		  
		};

		getReply(item, data.retweeted_status);
	}
}

const tweetMap = {};
function getStatusesUserTimelineWrap (ret, username, max_id, next) {
	let loaded = false;
	try {
		fs.accessSync(`./users/${username}.json`, fs.constants.R_OK);
		loaded = true;
	} catch(e) {
	}

	if (loaded) {
		const ts = require(`./users/${username}.json`);
		tweetMap[username] = [];
		if (!ts.lists.length) {
			return next();
		}
		const since_id = ts.lists[0].id;
		getStatusesUserTimeline(0, ret, username, max_id, since_id, next);
	} else {
		getStatusesUserTimeline(0, ret, username, max_id, 0, next);
	}
}
// 获取 username 的twitter
function getStatusesUserTimeline(count, ret, username, max_id, since_id, next) {

	tool.count.push(Date.now());
	client.get("statuses/user_timeline", { // 1500 request per 15 minite
		screen_name: username,
		count: 200,
		max_id: max_id || undefined,
		include_entities: true,
		trim_user: true,
		since_id: since_id || undefined
	}, (error, tweets, response) => {
		count++;

	  if (error) {
	  	if (count > 14) {
	  		saveTimeline(username, ret, next);
	  	}
	  	console.log(JSON.stringify(error), count);
	  	return
	  }

	  tweets = tweets || [];
	  ret = ret.concat(tweets.map((item) => {
	  	item.entities = item.entities || {};
	  	item.entities.urls = item.entities.urls || [];

	  	const urls = item.entities.urls;
	  	const data = {
	  		id: item.id,
	  		id_str: item.id_str,
	  		created_at: item.created_at,
	  		text: item.text,
	  		retweet_count: item.retweet_count,
	  		favorite_count: item.favorite_count,
	  		place: item.place && item.place.full_name,
	  		in_reply_to_status_id: item.in_reply_to_status_id,
	  		in_reply_to_screen_name: item.in_reply_to_screen_name,
	  		urls: urls.map((it) => { return  {url: it.url, expand: it.expanded_url}})	  		
	  	};

	  	

	  	getReply(item, data);
	  	return data;
	  }));

	  if (tweets.length < 200 || count > 15) {
	  	console.log(count);
	  	saveTimeline(username, ret, count, next);
	  } else {
	  	wait(1500, 15, () => {
	  		getStatusesUserTimeline(count, ret, username, tweets[tweets.length - 1].id, since_id, next);	
	  	});
	  }
	});
}
//getStatusesUserTimeline([], "ret2got", 0 );
tool.getStatusesUserTimelineWrap = getStatusesUserTimelineWrap;

function autoTimeline (tag, flag) {
	const done = require('./done.json');
	const last = flag ? '' : done.last;
	 const users = require('./stat/getListsMembers_balbosub.json').list[tag];
	//const users = require('./stat/getFriendsList_balbosub.json').list;
	let index = 0;
	last && users.some((item) => {
		index++;
		if (item.screen_name === last) {
			return true;
		} 
	});

	if (index >= users.length) {
		console.log('no user');
		return
	}

	const total = index + 100;


	function next (cnt) {
		if (cnt !== undefined) {
			done.last = users[index].screen_name;
			done.list[done.last] = {
				time: Date.now(),
				state: cnt < 16 ? 1 : 2
			}

			fs.writeFileSync(`./done.json`, JSON.stringify(done, null, 1), "utf8");
			index++;
		}
		const user = users[index];
		if (!user) {
			console.log('ok');
			return
		}
		if (index >= total){
			console.log('ok');
			return
		}
		console.log(user.screen_name);
		tool.getStatusesUserTimelineWrap([], users[index].screen_name, 0, next);
	}

	next();	
}

tool.autoTimeline = autoTimeline;



// 获取 username like 的twitter
function getFavoritesList (ret, username, max_id, next) {
	client.get("favorites/list", { // 75 request per 15 minite
		screen_name: username,
		count: 200,
		max_id: max_id || undefined,
		include_entities: true
	}, (error, tweets, response) => {
	  if (error) {
	  	console.log(JSON.stringify(error));
	  	return
	  }

	  tweets = tweets || [];
	  ret = ret.concat(tweets.map((item) => {
	  	item.entities = item.entities || {};
	  	item.entities.urls = item.entities.urls || [];
	  	const urls =  item.entities.urls;
	  	return {
	  		id: item.id,
	  		id_str: item.id_str,
	  		created_at: item.created_at,
	  		text: item.text,
	  		retweet_count: item.retweet_count,
	  		favorite_count: item.favorite_count,
	  		in_reply_to_status_id: item.in_reply_to_status_id,
	  		in_reply_to_screen_name: item.in_reply_to_screen_name,
	  		owner: item.user.screen_name,
	  		profile_image_url: item.user.profile_image_url,
	  		place: item.place && item.place.full_name,
	  		urls:  urls.map((it) => { return  {url: it.url, expand: it.expanded_url}})	 		
	  	}
	  }));

	  if (tweets.length < 200) {
	  	fs.writeFileSync(`./stat/getFavoritesList_${username}.json`, JSON.stringify({
	  		time: Date.now(),
	  		lists: ret
	  	}, null, 1), "utf8");
	  	next && next();
	  } else {
	  	wait(75, 15, () => {
	  		getFavoritesList(ret, username, tweets[tweets.length - 1].id, next);	
	  	});
	  }
	});
}
//getFavoritesList([]);
tool.getFavoritesList = getFavoritesList;








// username 创建的列表 获取每个列表里的成员
const listMap = {};
function getListsMembers (cursor, ret, index, username, next) {
	listMap[username] = listMap[username] || require(`./stat/getListsOwnerships_${username}.json`).lists;
	let myList = listMap[username];

	tool.count.push(Date.now());
	client.get("lists/members", { // 75 request per 15 minite
		slug: myList[index].slug || myList[index].name.replace(/\W+/g, "_").toLowerCase(),
		owner_screen_name: myList[index].owner,
		count: 500,
		include_entities: true,
		cursor: cursor,                                                                                   
		skip_status: true
	}, (error, tweets, response) => {
	  if(error) {
	  	console.log(JSON.stringify(error))
	  	return
	  }
	  const users = tweets.users.map((item) => {
	  	item.entities = item.entities || {};
	  	item.entities.url = item.entities.url || {};
	  	item.entities.url.urls = item.entities.url.urls || [];
	  	const urls =  item.entities.url.urls;
	  	return {
	  		id: item.id,
	  		id_str: item.id_str,
	  		screen_name: item.screen_name,
	  		statuses_count: item.statuses_count,
	  		favourites_count: item.favourites_count,
	  		listed_count: item.listed_count,
	  		followers_count: item.followers_count,
	  		friends_count: item.friends_count,
	  		created_at: item.created_at,
	  		location: item.location,
	  		profile_image_url: item.profile_image_url,
	  		url: item.url,
	  		description: item.description,
	  		urls:  urls.map((it) => { return  {url: it.url, expand: it.expanded_url}})	
	  	}
	  });


	  
	  const listName = myList[index].name;
		ret[listName] = ret[listName] || [];
		ret[listName] = ret[listName].concat(users);

		cursor = tweets.next_cursor;
	  if (cursor === 0) {
	  	if (index === myList.length - 1) {
		  		fs.writeFile(`./stat/getListsMembers_${username}.json`, JSON.stringify({
		  		time: Date.now(),
		  		list: ret
			  }, null, 1), "utf8", (err) => {
					if (err) {
						console.error(err);
						return;
					}
					next && next();
				});
		  } else {
		  	wait(75, 15, () => {
		  		getListsMembers(-1, ret, index + 1, username, next);	
		  	});
		 }
	  } else {
	  	wait(75, 15, () => {
	  		getListsMembers(cursor, ret, index, username, next);	
	  	});
	  }
	});
}
//getListsMembers(-1, {}, 0);
tool.getListsMembers = getListsMembers;



// username订阅的 list
function getListsSubscriptions (cursor, ret, username, next) {
	client.get("lists/subscriptions", {  // 15 request per 15 minite
		screen_name: username,
		cursor: cursor,
		count:  50
	}, (error, tweets, response) => {
	  if (error) {
	  	console.log(JSON.stringify(error));
	  	return
	  }
	  const lists = tweets.lists;

	  ret = ret.concat(lists.map((item) => {
	  	return {
	  		id: item.id,
	  		id_str: item.id_str,
	  		name: item.name,
	  		subscriber_count: item.subscriber_count,
	  		member_count: item.member_count,
	  		description: item.description,
	  		created_at: item.created_at,
	  		slug: item.slug,
	  		owner: item.user.screen_name
	  	}
	  }));

	  cursor = tweets.next_cursor;
	  if (cursor === 0) {
	  	fs.writeFile(`./stat/getListsSubscriptions_${username}.json`, JSON.stringify({
	  		time: Date.now(),
	  		lists: ret
	  	}, null, 1), "utf8", (err) => {
				if (err) {
			  	console.log(JSON.stringify(err));
			  	return
			  }
			  next && next();
			});
	  } else {
	  	getListsSubscriptions(cursor, ret, username, next);
	  }
	});
}
// getListsSubscriptions(-1, []);
tool.getListsSubscriptions = getListsSubscriptions;



// username 创建的 list
function getListsOwnerships (cursor, ret, username, next) {
	client.get("lists/ownerships", {  // 15 request per 15 minite
		screen_name: username,
		cursor: cursor,
		count: 50
	}, (error, tweets, response) => {
	  if (error) {
	  	console.log(JSON.stringify(error));
	  	return
	  }
	  const lists = tweets.lists;

	  ret = ret.concat(lists.map((item) => {
	  	return {
	  		id: item.id,
	  		id_str: item.id_str,
	  		name: item.name,
	  		subscriber_count: item.subscriber_count,
	  		member_count: item.member_count,
	  		description: item.description,
	  		created_at: item.created_at,
	  		owner: item.user.screen_name
	  	}
	  }));

	  cursor = tweets.next_cursor;
	  if (cursor === 0) {
	  	fs.writeFile(`./stat/getListsOwnerships_${username}.json`, JSON.stringify({
	  		time: Date.now(),
	  		lists: ret
	  	}, null, 1), "utf8", (err) => {
				if (err) {
					console.error(err);
					return;
				}

				next && next();
			});
	  } else {
	  	getListsOwnerships(cursor, ret, username, next);
	  }
	});
}
//getListsOwnerships(-1, []);
tool.getListsOwnerships = getListsOwnerships;


// 所有 username 关注的人的 用户信息

function getFriendsList (cursor, ret, username, next) {
	tool.count.push(Date.now())
	client.get("friends/list", { // 15 request per 15 minite
		screen_name: username,
		cursor: cursor,
		include_user_entities: true
	}, (error, tweets, response) => {
	  if(error) {
	  	console.log(JSON.stringify(error));
	  	return
	  } 
	  const users = tweets.users;

	  ret = ret.concat(users.map((item) => {
	  	item.entities = item.entities || {};
	  	item.entities.url = item.entities.url || {};
	  	item.entities.url.urls = item.entities.url.urls || [];
	  	const urls =  item.entities.url.urls;

	  	return {
	  		id: item.id,
	  		id_str: item.id_str,
	  		screen_name: item.screen_name,
	  		statuses_count: item.statuses_count,
	  		favourites_count: item.favourites_count,
	  		listed_count: item.listed_count,
	  		followers_count: item.followers_count,
	  		friends_count: item.friends_count,
	  		created_at: item.created_at,
	  		location: item.location,
	  		profile_image_url: item.profile_image_url,
	  		url: item.url,
	  		description: item.description,
	  		urls:  urls.map((it) => { return  {url: it.url, expand: it.expanded_url}})	
	  	}
	  }));

	  cursor = tweets.next_cursor;
	  if (cursor === 0) {
	  	fs.writeFile(`./stat/getFriendsList_${username }.json`, JSON.stringify({
	  		time: Date.now(),
	  		list: ret
	  	}, null, 1), "utf8", (err) => {
				if (err) {
					console.error(err);
					return;
				}
				next && next();
			});
	  } else {
	  	wait(15, 15, () => {
	  		getFriendsList(cursor, ret, username, next);	
	  	});
	  }
	});
}

function wait (max, time, cb) {
	time = (time + 1) * 60 * 1000;
	if (tool.count.length > (max - 1)) {
		const diff = Date.now() - tool.count[tool.count.length - max];
		if (diff < time) {
			console.log('waiting...');
			setTimeout(() => {
				cb();	  				
			}, time - diff + 2000);
		} else {
			cb();
		}
	} else {
		cb();
	} 
}
//getFriendsList(-1, []);
tool.getFriendsList = getFriendsList;


var cmd = process.argv[2];
var username = process.argv[3] || 'balbosub';
var flag = process.argv[4] || '';
tool.count = [];
if (cmd === 'getFriendsList') {
	tool.getFriendsList(-1, [], username);
} else if (cmd === 'getListsOwnerships') {
	tool.getListsOwnerships(-1, [], username);
} else if (cmd === 'getListsSubscriptions') {
	tool.getListsSubscriptions(-1, [], username);
} else if (cmd === 'getListsMembers') {
	tool.getListsMembers(-1, {}, 0, 'balbosub');
} else if (cmd === 'getFavoritesList') {
	tool.getFavoritesList([], username);
} else if (cmd ===  'getStatusesUserTimeline') {
	tool.getStatusesUserTimelineWrap([], username, 0);
} else if (cmd === 'autoTimeline') {
	tool.autoTimeline(username, flag);
} else if (cmd === 'search') {
	tool.search(username);
}

























// lists/statuses // 获取指定 list的twitter
// /friendships/create.json // Allows the authenticating user to follow (friend) the user specified in the ID parameter
// /friendships/destroy.json // Allows the authenticating user to unfollow the user specified in the ID parameter
///friendships/update.json // Enable or disable Retweets and device notifications from the specified user

// /users/suggestions.json // Access to Twitter’s suggested user list. This returns the list of suggested user categories.
// /users/suggestions/:slug.json // Access the users in a given category of the Twitter suggested user list
// /users/suggestions/:slug/members.json // Access the users in a given category of the Twitter suggested user list and return their most recent status if they are not a protected user



// 查询用户
function searchUsers (q, page, count) {
	client.get("users/search", {
		include_entities: false,
		q: q,
		page: page || 1,
		count: count || 20
	}, (error, tweets, response) => {
	  if (error) {
	  	console.log(JSON.stringify(error));
	  	return
	  }
	  console.log(tweets);
	});
}
// searchUsers('test');



// 所有 username 关注的人的id
function getFriendsIds (cursor, ret, username) {
	client.get("friends/ids", {
		screen_name: username || "balbosub",
		cursor: cursor
	}, (error, tweets, response) => {
	  if (error) {
	  	console.log(JSON.stringify(error));
	  	return
	  }

	  ret = ret.concat(tweets.ids);

	  cursor = tweets.next_cursor;
	  if (cursor === 0) {
	  	fs.writeFile(`stat/getFriendsIds${username ? '_' + username : ''}.json`, JSON.stringify({
	  		time: Date.now(),
	  		ids: ret
	  	}, null, 1), "utf8", (err) => {
				if (err) {
					console.error(err);
					return;
				}
			});
	  } else {
	  	getFriendsIds(cursor, ret, username);
	  }
	});
}
//getFriendsIds(-1, []);


// 所有关注 username 的人的 用户信息 (不包括垃圾账号)
function getFollowersList (cursor, ret, username) {
	client.get("followers/list", {
		screen_name:  username || "balbosub",
		cursor: cursor
	}, (error, tweets, response) => {
	  if (error) {
	  	console.log(JSON.stringify(error));
	  	return
	  }
	  const users = tweets.users;

	  ret = ret.concat(users.map((item) => {
	  	return {
	  		id: item.id,
	  		screen_name: item.screen_name,
	  		statuses_count: item.statuses_count,
	  		favourites_count: item.favourites_count,
	  		listed_count: item.listed_count,
	  		followers_count: item.followers_count,
	  		friends_count: item.friends_count,
	  		created_at: item.created_at,
	  		location: item.location,
	  		url: url,
	  		description: item.description
	  	}
	  }));

	  cursor = tweets.next_cursor;
	  if (cursor === 0) {
	  	fs.writeFile(`stat/getFollowersList${username ? '_' + username : ''}.json`, JSON.stringify({
	  		time: Date.now(),
	  		list: ret
	  	}, null, 1), "utf8", (err) => {
				if (err) {
					console.error(err);
					return;
				}
			});
	  } else {
	  	getFollowersList(cursor, ret, username);
	  }
	});
}
//getFollowersList(-1, []);

// 所有关注 username 的人的 id (包括垃圾账号)
function getFollowersIds (cursor, ret, username) {
	client.get("followers/ids", {
		screen_name: username || "balbosub",
		cursor: cursor
	}, (error, tweets, response) => {
	  if (error) {
	  	console.log(JSON.stringify(error));
	  	return
	  }

	  ret = ret.concat(tweets.ids);

	  cursor = tweets.next_cursor;
	  if (cursor === 0) {
	  	fs.writeFile(`stat/getFollowersIds${username ? '_' + username : ''}.json`, JSON.stringify({
	  		time: Date.now(),
	  		ids: ret
	  	}, null, 1), "utf8", (err) => {
				if (err) {
					console.error(err);
					return;
				}
			});
	  } else {
	  	getFollowersIds(cursor, ret, username);
	  }
	});
}
// getFollowersIds(-1, []);
