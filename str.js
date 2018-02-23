const fs = require("fs");
const Twitter = require("twitter");
const request = require("request");
const config = require("./twitter.json");
const client = new Twitter(config);
const tool = {};


function saveTimeline(username, data, count, next) {
	if (tweetMap[username]) {
		data = data.concat(tweetMap[username]);
	}
	fs.writeFile(`./str/${username}.json`, JSON.stringify({
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
		data.retweeted_status = {
			id_str: item.id_str,
  		in_reply_to_status_id_str: item.in_reply_to_status_id_str
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

	loaded = false;
	if (loaded) {
		const ts = require(`./users/${username}.json`);
		tweetMap[username] = [];
		if (!ts.lists.length || !ts.lists[0]) {
			return next(0);
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
		include_entities: false,
		trim_user: true,
		since_id: since_id || undefined
	}, (error, tweets, response) => {
		count++;

	  if (error) {
	  	if (count > 14) {
	  		saveTimeline(username, ret, next);
	  	}
console.log(tool.count.length)
	  	console.log(JSON.stringify(error), count);
	  	return
	  }

	  tweets = tweets || [];
	  ret = ret.concat(tweets.map((item) => {
	  	const data = {
	  		id_str: item.id_str,
	  		in_reply_to_status_id_str: item.in_reply_to_status_id_str
	  	};
	  	getReply(item, data);
	  	return data;
	  }));

	  if (tweets.length < 200 || count > 15) {
	  	console.log(count);
	  	saveTimeline(username, ret, count, next);
	  } else {
	  	wait(1500, 15, () => {
	  		if (since_id) {
	  			since_id = tweets[0].id;
	  		} else {
	  			max_id = tweets[tweets.length - 1].id;
	  		}
	  		getStatusesUserTimeline(count, ret, username, max_id, since_id, next);	
	  	});
	  }
	});
}
//getStatusesUserTimeline([], "ret2got", 0 );
tool.getStatusesUserTimelineWrap = getStatusesUserTimelineWrap;


function autoTimelineList (flag) {
	const done = require('./done.json');
	const list = require('./stat/getListsOwnerships_balbosub.json').lists;
	let index;

	if (done.lastTag) {
		index = list.findIndex((item) => {
			return item.name === done.lastTag;
		});
	}

	
	const data = flag || !done.lastTag || index === -1 ? list : list.slice(index);

	index = 0;
	function next () {
		if (data[index]) {
			console.log(data[index].name, '-----');
			autoTimeline(flag, data[index].name, next);
			flag = true;
		} else {
			console.log('ok');
		}
		index++;
	}
	next();
}
tool.autoTimelineList = autoTimelineList;
function autoTimeline (flag, tag, cb) {
	const done = require('./done.json');
	const last = flag ? '' : done.last;
	let users;
	if (tag) {
		users = require('./stat/getListsMembers_balbosub.json').list[tag]
	} else {
		users = require('./stat/getFriendsList_balbosub.json').list
	}
	let index = 0;
	last && users.some((item) => {
		index++;
		if (item.screen_name === last) {
			return true;
		} 
	});

	if (index >= users.length) {
		console.log('no user');
		return cb && cb();
	}



	function next (cnt) {
		if (cnt !== undefined) {
			done.lastTag = tag;
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
			return cb && cb();
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
	}, (error, tweets, response) => {
	  if (error) {
	  	console.log(JSON.stringify(error));
	  	return
	  }

	  tweets = tweets || [];
	  ret = ret.concat(tweets.map((item) => {
	  	return {
	  		id_str: item.id_str,
	  		in_reply_to_status_id_str: item.in_reply_to_status_id_str
	  	}
	  }));

	  if (tweets.length < 200) {
	  	fs.writeFileSync(`./str/getFavoritesList_${username}.json`, JSON.stringify({
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


var cmd = process.argv[2];
var username = process.argv[3] || 'balbosub';
var flag = process.argv[4] || '';
tool.count = [];
if (cmd === 'getFavoritesList') {
	tool.getFavoritesList([], username);
} else if (cmd ===  'getStatusesUserTimeline') {
	tool.getStatusesUserTimelineWrap([], username, 0);
} else if (cmd === 'autoTimeline') {
	tool.autoTimeline(flag);
} else if (cmd === 'autoTimelineList') {
	tool.autoTimelineList(flag);
}
