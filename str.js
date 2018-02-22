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
	fs.writeFile(`./str_${username}.json`, JSON.stringify({
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
  		in_reply_to_status_id_str: item.in_reply_to_status_id_str,
	  	in_reply_to_screen_name: item.in_reply_to_screen_name
		};

		getReply(item, data.retweeted_status);
	}
}

const tweetMap = {};
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
	  	const data = {
	  		id_str: item.id_str,
	  		in_reply_to_status_id_str: item.in_reply_to_status_id_str,
	  		in_reply_to_screen_name: item.in_reply_to_screen_name
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
tool.getStatusesUserTimeline = getStatusesUserTimeline;




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
tool.count = [];
if (cmd === 'autoTimeline') {
	tool.getStatusesUserTimeline(0, [], 'ret2got', 0, 0);
}


