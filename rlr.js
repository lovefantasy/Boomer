let request = require(`request`);
let fs = require(`fs`);

module.exports = {
    parse: function(code) {
        const parseInfo = new Promise((resolve, reject) => {
            var blue = 0;
            var orange = 0;

            var csvStream = fs.createWriteStream('test.csv');
            csvStream.on('close', function() {
                // console.log('file downloaded, start analyzing...');
                fs.readFile('test.csv', function (err, data) {
                    if (err) reject("讀取檔案階段錯誤。");

                    let rawArray = data.toString().split(";");
                    if (!(rawArray[0] === "team")) {
                        reject("檔案格式不符。");
                    }

                    let count = Math.floor(rawArray.length / 22);
                    var players = [];
                    var response = new Map();

                    for (var i=0; i<count; i++) {
                        let team = rawArray[rawArray.length-21*(i+1)-1].split("\n");
                        if (team[team.length-1] === "blue") {
                            blue += parseInt(rawArray[rawArray.length-21*(i+1)+3]);
                        } else {
                            orange += parseInt(rawArray[rawArray.length-21*(i+1)+3]);
                        }
                        var playerMap = new Map();
                        playerMap.set("team", team[team.length-1]);
                        playerMap.set("name", rawArray[rawArray.length-21*(i+1)]);
                        playerMap.set("score", rawArray[rawArray.length-21*(i+1)+2]);
                        players.push(playerMap);

                        // console.log(team[team.length-1], rawArray[rawArray.length-21*(i+1)]);
                    }
                    response.set("blue", blue);
                    response.set("orange", orange);
                    response.set("players", players);
                    // console.log(response);
                    resolve(response);
                });
            });

            let url = `https://ballchasing.com/dl/stats/players/${code}/${code}-players.csv`;
            console.log(url);
            request.get(url)
                .on('error', console.error)
                .pipe(csvStream);
        });
        return parseInfo;
    },

    seperator: function(length) {
        var output = "";
        for (var i = 0; i < length; i++) {
            output += "-";
        }
        return output;
    },

    format: function(input, length) {
        if (length < input.length) {
            return input.substring(0, length);
        }

        var output = "";
        let diff = length - input.length;
        if (diff % 2 == 0) {
            for (var i = 0; i < diff/2; i++) {
                output += " ";
            }
            output += input;
            for (var i = 0; i < diff/2; i++) {
                output += " ";
            }
        } else {
            output += " ";
            for (var i = 0; i < Math.floor(diff/2); i++) {
                output += " ";
            }
            output += input;
            for (var i = 0; i < Math.floor(diff/2); i++) {
                output += " ";
            }
        }
        return output;
    }
}
// download('https://ballchasing.com/dl/stats/players/16a11425-2a4e-45b5-adfb-917ac908fd3c/16a11425-2a4e-45b5-adfb-917ac908fd3c-players.csv');
