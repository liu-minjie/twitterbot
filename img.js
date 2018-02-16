const async = require('async');
const fs = require('fs');
const request = require('request');

const dir = fs.readdirSync('./stat');

const files = [].slice.call(dir, 0).filter((filename) => {
	return filename.indexOf('getFriendsList_') === 0;
});

let cache;
try {
	cache = require('./stat/cache_avatar.json');
} catch (e) {
	cache = {};
}


async.eachSeries(files, (filename, next) => {
	const data = require(`./stat/${filename}`);
	const list = data.list.filter((item) => {
		return !cache[item.screen_name];
	});

	async.eachSeries(list, (item, callback) => {
		cache[item.screen_name] = true;
		download(item.profile_image_url, `./img/${item.screen_name}`, callback);
	}, (err) => {
		next(err);
	});
}, (err) => {
	fs.writeFileSync('./stat/cache_avatar.json', JSON.stringify(save, null, 1), 'utf8');
	console.log(err, 'done');
});