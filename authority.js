var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var file = "./authority.sqlite";

module.exports = {
    add: function(userID) {
        var db;
        // console.log(`SELECT * FROM modlist WHERE userID = '${userID}'`);

        db = new sqlite3.Database(file);
        db.serialize(function() {
            db.run("CREATE TABLE IF NOT EXISTS modlist (userID TEXT, UNIQUE(userID))");
            var stmt = db.prepare("INSERT OR IGNORE INTO modlist VALUES (?)");
            stmt.run(userID);
            stmt.finalize();
        });

        db.close();
        return;
    },

    check: function(userID) {
        const getInfo = new Promise((resolve, reject) => {
            var db;
            let response;

            function createDb() {
                db = new sqlite3.Database(file, createTable);
            }

            function createTable() {
                db.run("CREATE TABLE IF NOT EXISTS modlist (userID TEXT, UNIQUE(userID))", check);
            }

            function check() {
                db.get(`SELECT * FROM modlist WHERE userID = '${userID}'`, function(err, row) {
                    if (row) {
                        resolve(true);
                    } else {
                        reject("沒有權限。");
                    }
                });
            }

            createDb();
        });
        return getInfo;
    },
}
