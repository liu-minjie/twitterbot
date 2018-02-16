const fs = require('fs');
const request = require('request');

const screen_name = 'sarah_edo';
const id_str = '963462632693903360';

let save = [];


function handleData( ){
	data = data.split('tweet js-stream-tweet');
	data.forEach((item) => {
		const reply = {};
		const conent = data.match(/<p class=\"TweetTextSize  js-tweet-text tweet-text\".+?(?=<\/p>)/g) || [];
		const names = data.match(/<span class=\"username u-dir u-textTruncate\".+?<b>(.+?)<\/b>/);

		reply.content = content.match(/<p class=\"TweetTextSize  js-tweet-text tweet-text\".+?>(.+)/)[1];

		if (names.length) {
			reply.screen_name = names[0].match(/<b>(.+?)<\/b>/)[1];
			if (names.length > 1) {
				reply.to = [];
				for (let i = 1; i < names.length; i++) {
					reply.to.push(names[0].match(/<b>(.+?)<\/b>/)[1])
				}
			}
		}

		save.push(reply);
	});
}

request({
	url: `https://twitter.com/${screen_name}/status/${id_str}`
}, (err, res, data) => {

	data = data.split('id="descendants"')[1];
	data = data.split('hidden-replies-container')[0];

	data = data.replace(/\n/g, '');
	handleData(data);

	const match = data.match(/data-min-position=\"([^\"]+)/);

	if (!match) {
		save = save.concat(reply);
		fs.writeFileSync(`./reply/${screen_name}.json`, JSON.stringify({
			[id_str]: save
		}, null, 1), 'utf8');
		return;
	}
	next(match[1]);
});


function next (max_position) {
	request({
		url: `https://twitter.com/i/${screen_name}/conversation/${id_str}?max_position=${max_position}&include_available_features=1&include_entities=1&reset_error_state=false`
	}, (err, res, data) => {
		data = JSON.parse(data);

		handleData(data.items_html);
		fs.writeFileSync(`./reply/${screen_name}.json`, JSON.stringify({
			[id_str]: save
		}, null, 1), 'utf8');
		
		if (data.has_more_items) {
			setTimeout(() => {
				//next(data.min_position)
			}, 1500);
		} else {
			console.log('ok');
		}		
	})
}