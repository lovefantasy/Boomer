var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var file = "./playerData.sqlite";

module.exports = {
    register: function(userID, name, elo = 5.0) {
        var db;

        db = new sqlite3.Database(file);
        db.serialize(function() {
            db.run("CREATE TABLE IF NOT EXISTS playerlist (userID TEXT, name TEXT, win INTEGER, lose INTEGER, elo REAL, UNIQUE(userID, name))");
            var stmt = db.prepare("INSERT OR IGNORE INTO playerlist (userID, name, win, lose, elo) VALUES (?,?,?,?,?)");
            stmt.run(userID, name, 0, 0, elo);
            stmt.finalize();
        });

        db.close();
        return;
    },

    fetch: function(userID) {
        const getInfo = new Promise((resolve, reject) => {
            var db;
            let response;

            function createDb() {
                db = new sqlite3.Database(file, createTable);
            }

            function createTable() {
                db.run("CREATE TABLE IF NOT EXISTS playerlist (userID TEXT, name TEXT, win INTEGER, lose INTEGER, elo REAL, UNIQUE(userID, name))", check);
            }

            function check() {
                db.get(`SELECT * FROM playerlist WHERE userID = '${userID}'`, function(err, row) {
                    if (row) {
                        resolve(row);
                    } else {
                        reject("此使用者並未註冊至資料庫。");
                    }
                });
            }

            createDb();
        });
        return getInfo;
    },

    fetchByName: function(name) {
        const getInfo = new Promise((resolve, reject) => {
            var db;
            let response;

            function createDb() {
                db = new sqlite3.Database(file, createTable);
            }

            function createTable() {
                db.run("CREATE TABLE IF NOT EXISTS playerlist (userID TEXT, name TEXT, win INTEGER, lose INTEGER, elo REAL, UNIQUE(userID, name))", check);
            }

            function check() {
                db.get(`SELECT * FROM playerlist WHERE name = '${name}'`, function(err, row) {
                    if (row) {
                        resolve(row);
                    } else {
                        reject("此使用者並未註冊至資料庫。");
                    }
                });
            }

            createDb();
        });
        return getInfo;
    },

    nameChange: function(userID, name) {
        const getInfo = new Promise((resolve, reject) => {
            var db;

            function createDb() {
                db = new sqlite3.Database(file, createTable);
            }

            function createTable() {
                db.run("CREATE TABLE IF NOT EXISTS playerlist (userID TEXT, name TEXT, win INTEGER, lose INTEGER, elo REAL, UNIQUE(userID, name))", check);
            }

            function check() {
                db.get(`SELECT * FROM playerlist WHERE userID = '${userID}'`, function(err, row) {
                    if (!row) {
                        reject("嘗試對不存在的使用者做更名操作。");
                    }
                    else {
                        db.run(`UPDATE playerlist SET name = '${name}' WHERE userID = '${userID}'`)
                        db.get(`SELECT * FROM playerlist WHERE userID = '${userID}'`, function(err, row) {
                            returnDb();
                        });
                    }
                })
            }

            function returnDb() {
                return resolve(true);
            }

            createDb();
        });

        return getInfo;
    },

    update: function(name, win, lose, elo) {
        const getInfo = new Promise((resolve, reject) => {
            if (isNaN(win) || isNaN(lose) || isNaN(elo)) {
                return reject("至少一項參數不符合格式。");
            }

            var db;

            function createDb() {
                db = new sqlite3.Database(file, createTable);
            }

            function createTable() {
                db.run("CREATE TABLE IF NOT EXISTS playerlist (userID TEXT, name TEXT, win INTEGER, lose INTEGER, elo REAL, UNIQUE(userID))", check);
            }

            function check() {
                db.get(`SELECT * FROM playerlist WHERE name = '${name}'`, function(err, row) {
                    if (!row) {
                        reject("嘗試對不存在的使用者做更新操作。");
                    }
                    else {
                        db.run(`UPDATE playerlist SET win = ${win}, lose = ${lose}, elo = ${elo} WHERE name = '${name}'`)
                        db.get(`SELECT * FROM playerlist WHERE name = '${name}'`, function(err, row) {
                            returnDb();
                        });
                    }
                })
            }

            function returnDb() {
                return resolve(true);
            }

            createDb();
        });

        return getInfo;
    }
}
