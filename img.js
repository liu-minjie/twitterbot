const async = require('async');
const fs = require('fs');
const request = require('request');

const dir = fs.readdirSync('./stat');

const files = [].slice.call(dir, 0).filter((filename) => {
	return filename.indexOf('getFriendsList_') === 0 ||  filename.indexOf('getListsMembers_') === 0 || filename.indexOf('getFavoritesList_') === 0;
});

let cache;
try {
	cache = require('./stat/cache_avatar.json');
} catch (e) {
	cache = {};
}

const download = function(uri, filename, callback){
  request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
};

async.eachSeries(files, (filename, next) => {
	const data = require(`./stat/${filename}`);
	let list = [];

	if (Array.isArray(data.list || data.lists)) {
		list = (data.list || data.lists).filter((item) => {
			return !cache[item.screen_name || item.owner];
		});
	} else {
		Object.keys(data.list).forEach((key) => {
			list = list.concat(data.list[key].filter((item) => {
				return !cache[item.screen_name];
			}))
		})
	}

	async.eachSeries(list, (item, callback) => {
		cache[item.screen_name || item.owner] = true;
		download(item.profile_image_url, `./img/${item.screen_name}`, callback);
	}, (err) => {
		next(err);
	});
}, (err) => {
	fs.writeFileSync('./stat/cache_avatar.json', JSON.stringify(cache, null, 1), 'utf8');
	console.log(err, 'done');
});

