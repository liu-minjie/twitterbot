const request = require('request');

const screen_name = 'sarah_edo';
const id_str = '963462632693903360';

let save = [];

request({
	url: `https://twitter.com/${screen_name}/status/${id_str}`
}, (err, res, data) => {

	data = data.replace(/\n/g, '');
	const reply = data.match(/<p class=\"TweetTextSize  js-tweet-text tweet-text\".+?(?=<\/p>)/g) || [];

	const match = data.match(/data-min-position=\"([^\"]+)/);

	if (!match) {
		save = save.concat(reply);
		fs.writeFileSync(`./reply/${screen_name}.json`, JSON.stringify(save, null, 1), 'utf8');
		return;
	}
	next(match[1]);
});


function next (max_position) {
	request({
		url: `https://twitter.com/i/${screen_name}/conversation/${id_str}?max_position=${max_position}&include_available_features=1&include_entities=1&reset_error_state=false`
	}, (err, res, data) => {
		data = data.descendants;

		const reply = data.items_html.match(/<p class=\"TweetTextSize  js-tweet-text tweet-text\".+?(?=<\/p>)/g) || [];
		save = save.concat(reply);
		fs.writeFileSync(`./reply/${screen_name}.json`, JSON.stringify(save, null, 1), 'utf8');
		if (data.has_more_items) {
			setTimeout(() => {
				//next(data.min_position)
			}, 1500);
		} else {
			console.log('ok');
		}		
	})
}