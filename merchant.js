var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var itemlist = "./itemlist.db";
var userdb = "./user.sqlite";

module.exports = {
    itemInfo: function(itemID) {
        const getInfo = new Promise((resolve, reject) => {
            var db;
            db = new sqlite3.Database(itemlist);
            db.get(`SELECT * FROM items WHERE id = '${itemID}'`, function(err, row) {
                if (row) {
                    resolve(row);
                } else {
                    reject(err);
                }
            });
        });

        return getInfo;
    },

    lottery: function() {
        const getInfo = new Promise((resolve, reject) => {
            var db;
            var rarity;

            let result = Math.floor(Math.random()*100)+1;
            if (result == 100) {
                rarity = 5;
            } else if (result >= 96) {
                rarity = 4;
            } else if (result >= 84) {
                rarity = 3;
            } else if (result >= 56) {
                rarity = 2;
            } else {
                rarity = 1;
            }

            db = new sqlite3.Database(itemlist);
            db.all(`SELECT * FROM items WHERE rarity = '${rarity}' ORDER BY id ASC`, function(err, rows) {
                if (rows) {
                    if (rows.length > 1) {
                        let idx = Math.floor(Math.random()*rows.length);
                        resolve(rows[idx]);
                    } else {
                        resolve(rows[0]);
                    }
                } else {
                    reject("database error");
                }
            });
        });

        return getInfo;
    },

    fetchItem: function(userID) {
        const getInfo = new Promise((resolve, reject) => {
            var db;

            function createDb() {
                db = new sqlite3.Database(userdb, createTable);
            }

            function createTable() {
                db.run("CREATE TABLE IF NOT EXISTS items (rowID INTEGER AUTOINCREMENT, userID TEXT, itemID INTEGER, painted TEXT, certed TEXT)", check);
            }

            function check() {
                db.all(`SELECT * FROM items WHERE userID = '${userID}' ORDER BY rowID ASC`, function(err, rows) {
                    if (rows) {
                        resolve(rows);
                    } else {
                        reject(0);
                    }
                });
            }

            createDb();
        });
        return getInfo;
    },

    addItem: function(userID, itemID, painted, certed) {
        var db;

        db = new sqlite3.Database(userdb);
        db.serialize(function() {
            db.run("CREATE TABLE IF NOT EXISTS items (rowID INTEGER PRIMARY KEY AUTOINCREMENT, userID TEXT, itemID INTEGER, painted TEXT, certed TEXT)");
            var stmt = db.prepare("INSERT INTO items (userID, itemID, painted, certed) VALUES (?, ?, ?, ?)");
            stmt.run(userID, itemID, painted, certed);
            stmt.finalize();
        });

        db.close();
        return;
    },

    removeItem: function(userID, rowID) {
        const getInfo = new Promise((resolve, reject) => {
            var db;

            function createDb() {
                db = new sqlite3.Database(userdb, createTable);
            }

            function createTable() {
                db.run("CREATE TABLE IF NOT EXISTS items (rowID INTEGER AUTOINCREMENT, userID TEXT, itemID INTEGER, painted TEXT, certed TEXT)", check);
            }

            function check() {
                db.get(`SELECT * FROM items WHERE userID = '${userID}' AND rowID = '${rowID}'`, function(err, row) {
                    if (row) {
                        let itemID = row.itemID;
                        db.serialize(function() {
                            var stmt = db.prepare(`DELETE FROM items WHERE rowID = '${rowID}'`);
                            stmt.run();
                            stmt.finalize();
                        });

                        db.close();
                        resolve(itemID);
                    } else {
                        reject(err);
                    }
                });
            }

            createDb();
        });
        return getInfo;
    },

    fetchUser: function(userID, name) {
        const getInfo = new Promise((resolve, reject) => {
            var db;

            function createDb() {
                db = new sqlite3.Database(userdb, createTable);
            }

            function createTable() {
                db.run("CREATE TABLE IF NOT EXISTS economy (userID TEXT, name TEXT, balance INTEGER, daily INTEGER, win INTEGER, lose INTEGER, elo INTEGER, UNIQUE(userID, name))", check);
            }

            function check() {
                db.get(`SELECT * FROM economy WHERE userID = '${userID}'`, function(err, row) {
                    if (row) {
                        resolve(row);
                    } else {
                        db.serialize(function() {
                            var stmt = db.prepare("INSERT INTO economy VALUES (?, ?, ?, ?, ?, ?, ?)");
                            stmt.run(userID, name, 250, 0, 0, 0, 0);
                            stmt.finalize();
                        });

                        db.close();
                        reject('使用者初次註冊。');
                    }
                });
            }

            createDb();
        });
        return getInfo;
    },

    updateBalance: function(userID, increase) {
        const getInfo = new Promise((resolve, reject) => {
            increase = parseInt(increase);
            var db = new sqlite3.Database(userdb);

            db.get(`SELECT * FROM economy WHERE userID = '${userID}'`, function(err, row) {
                if (!row) {
                    reject('此使用者並未註冊於資料庫內。');
                } else {
                    db.run(`UPDATE economy SET balance = '${row.balance + increase}' WHERE userID = '${userID}'`);
                    db.get(`SELECT * FROM economy WHERE userID = '${userID}'`, function(err, row) {
                        return resolve(row);
                    });
                }
            })
        });

        return getInfo;
    },

    resetDaily: function(userID) {
        const getInfo = new Promise((resolve, reject) => {
            var db = new sqlite3.Database(userdb);
            let reset = 0;

            db.get(`SELECT * FROM economy WHERE userID = '${userID}'`, function(err, row) {
                if (!row) {
                    reject(1);
                } else {
                    db.run(`UPDATE economy SET daily = '${reset}' WHERE userID = '${userID}'`);
                    db.get(`SELECT * FROM economy WHERE userID = '${userID}'`, function(err, row) {
                        return resolve(row);
                    });
                }
            })
        });
        
        return getInfo;
    },

    claimDaily: function(userID, daily) {
        const getInfo = new Promise((resolve, reject) => {
            var db = new sqlite3.Database(userdb);

            db.get(`SELECT * FROM economy WHERE userID = '${userID}'`, function(err, row) {
                if (!row) {
                    reject(1);
                } else {
                    if (row.daily == daily) {
                        reject(2);
                    } else {
                        db.run(`UPDATE economy SET balance = '${row.balance + 100}', daily = '${daily}' WHERE userID = '${userID}'`);
                        db.get(`SELECT * FROM economy WHERE userID = '${userID}'`, function(err, row) {
                            return resolve(row);
                        });
                    }
                }
            })
        });

        return getInfo;
    },
}
