const http = require('http');
const url = require('url');
const fs = require('fs');


 function search (oUrl, cb) {
	oUrl = oUrl.replace(/^https/, 'http');
	const info = url.parse(oUrl);
	const options = {
	  hostname: info.hostname,
	  port: info.port || 80,
	  path: info.path,
	  method: 'HEAD'
	};

	const req = http.request(options, (res) => {
		if (res.statusCode === 302 || res.statusCode === 301) {
			console.log(res.headers.location);
		} else {
			console.log(res.statusCode);
		}
	});

	req.on('error', (e) => {
	  console.log(e.message);
	});
	req.end();
}
const searchUrl = process.argv[2] || '';
if (searchUrl) {
	search(searchUrl);
}

/*
const username = process.argv[2] || '';
if (!username) {
	process.exit(0);
}

let json;
try {
	json = require(`./users/${username}.replace.json`)
} catch (e){
	json = require(`./users/${username}.json`);
}
const data = json.lists;
let index = 0;
if (json.saveId) {
	data.some((item, i) => {
		index++;
		if (item.id === json.saveId) {
			index++;
			return true;
		}
	})
}
if (index >= data.length) {
	console.log("finish!!");
	process.exit(0);
}

const total = index + 100;
let saveId;
console.time('all');
function next () {
	const item = data[index++];
	if (item && index < total) {
		saveId = item.id;
		toLong(item);
	} else {
		const ret = {
			time: Date.now(),
			lists: data
		}
		if (item) {
			ret.saveId = saveId;
		}
		console.timeEnd('all');
		fs.writeFile(`./users/${username}.replace.json`, JSON.stringify(ret, null, 1), "utf8", (err) => {
			if (err) {
		  	console.log(JSON.stringify(err));
		  	return
		  }
		});
	}
}
function toLong (item) {
	const match = item.text.match(/https:\/\/t\.co\/.+[^\b]/);
	if (match) {
		replace(match[0], function (err, url) {
			if (!err) {
				item.text = item.text.replace(match[0], url);
			}
			toLong(item);
		})
	} else {
		setTimeout(next, 50)
	}
}


function replace (oUrl, cb) {
	oUrl = oUrl.replace(/^https/, 'http');
	const info = url.parse(oUrl);
	const options = {
	  hostname: info.hostname,
	  port: info.port || 80,
	  path: info.path,
	  method: 'HEAD'
	};

	const req = http.request(options, (res) => {
		if (res.statusCode === 302 || res.statusCode === 301) {
			cb(null, res.headers.location);
		} else {
			cb('status error ' + res.statusCode);
		}
	});

	req.on('error', (e) => {
	  cb(e.message);
	});
	req.end();
}
next()

*/