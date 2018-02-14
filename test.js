const fs = require("fs");
const Twitter = require("twitter");
const request = require("request");
const config = require("./twitter.json");
const client = new Twitter(config);

function getStatusesUserTimeline(username) {
  client.get("favorites/list", { // 1500 request per 15 minite
    screen_name: username,
    count: 50,
    include_entities: true,
  }, (error, tweets, response) => {

    if (error) {
      console.log(JSON.stringify(error));
      return
    }

    fs.writeFileSync("./testFavorites.json", JSON.stringify(tweets, null, 1), "utf8");
  });
}

getStatusesUserTimeline("balbosub");
