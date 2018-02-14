#!/usr/bin/env node

const fs = require("fs");
const request = require("request");

let query = process.argv[2] || "";

if (!query) {
	process.exit(0);
}

query = query.replace(/\s+/g, '+');
let count =  (process.argv[3] || 0) * 10;


function search() {
	request.get({
		url: `https://www.google.com/search?q=${query}${count ? '&start=' + count : ''}`
	}, function (err, req, data) {
		while (true) {
			const start = data.search(/<script.*>/);
			if (start === -1) {
				break
			}
			const end = data.indexOf('</script>');
			const startStr = data.substring(0, start);
			const endStr = data.substring(end + 9);
			data = startStr + endStr; 
		}

		while (true) {
			const start = data.search(/\<style.*\>/);
			if (start === -1) {
				break
			}
			const end = data.indexOf('\</style\>');
			const startStr = data.substring(0, start);
			const endStr = data.substring(end + 8);
			data = startStr + endStr; 
		}
		const jsdom = require("jsdom/lib/old-api");
		const jquery = require('jquery');

		// fs.writeFileSync('./goole.txt', data, 'utf8');

		jsdom.env("", function(err, window) {
			if (err) {
				console.error(err);
				return;
			}

			const $ = jquery(window);
			$('body').html(data);
			$('.g .r a').each(function () {
				console.log('\n');
				console.log($(this).text());
				var href = $(this).prop('href');
				var match = href.match(/\?q=([^&]+)/);
				if (match) {
					console.log(match[1]);
				} else {
					console.log(href);
				}
			})
		});
	});
}
search();



