const Discord = require('discord.js');
const bot = new Discord.Client();
const config = require('./config.json');
const superUser = '233547796139999232';
var authority = require('./authority.js');
var rlrparser = require('./rlr.js');
var rlplayer = require('./playerdata.js');
var merchant = require('./merchant.js');
let cooldown = new Set();
const voiceManagedChannel = new Set(['435355490977841163']);

bot.on('ready', () => {
    console.log(`成功登入 ${bot.user.tag}!`);
});

bot.on('messageReactionAdd', (messageReaction, user) => {
    console.log(messageReaction.emoji.identifier == '%36%E2%83%A3');
});

bot.on('voiceStateUpdate', (oldMember, newMember) => {
    let newUserChannel = newMember.voiceChannel;
    let oldUserChannel = oldMember.voiceChannel;

    // 有人加入頻道
    if (oldUserChannel === undefined && newUserChannel !== undefined) {
        if (!voiceManagedChannel.has(newUserChannel.parentID)) {
            return;
        }
        // 先取得目前所有子頻道的狀況...
        var channelCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 人數上限為 X 人的頻道目前開了幾個
        var channelOccupied = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 人數上限為 X 人的頻道目前有幾個裡面有人
        for (var [k, v] of newUserChannel.parent.children) {
            if (v.userLimit <= channelCounts.length) {
                channelCounts[v.userLimit] += 1;
                channelOccupied[v.userLimit] += v.members.size > 0 ? 1 : 0;
            }
        }

        // 目前只需要處理人數上限為 2, 3, 4, 6, 8人的頻道...
        let limits = [2, 3, 4, 6, 8];
        let titles = ['2v2', '3v3', '2v2 Internal', '3v3 Internal', '4v4 Internal'];

        (function loop(i) {
            // console.log('運行到第' + i + "個chaining...");
            if (i < limits.length) {
                new Promise((resolve, reject) => {
                    setTimeout(() => {
                        if (channelCounts[limits[i]] == channelOccupied[limits[i]]) {
                            newUserChannel.guild.createChannel(titles[i], 'voice').then((c) => {
                                c.setParent(newUserChannel.parent).then((c) => {
                                    c.edit({userLimit: limits[i]}).then((c) => {
                                        console.log('創建新頻道成功：' + titles[i]);
                                        resolve();
                                    }).catch();
                                }).catch();
                            }).catch();
                        } else {
                            console.log('無須更動' + limits[i] + '人頻道的設定...');
                            resolve();
                        }
                    }, 25);
                }).then(loop.bind(null, i+1)).catch(loop.bind(null, i+1));
            } else {
                var count = 0;
                for (var [k, v] of newUserChannel.parent.children) {
                    v.edit({position: v.userLimit == 0 ? 99 : v.userLimit * 100 + count}).then().catch();
                    count += 1;
                    //console.log('u:' + v.userLimit + ', p:' + v.position);
                }
            }
        })(0);
        // 有人離開頻道
    } else if (newUserChannel === undefined) {
        if (!voiceManagedChannel.has(oldUserChannel.parentID)) {
            return;
        }
        // 同樣先取得目前所有子頻道的狀況...
        var channelCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 人數上限為 X 人的頻道目前開了幾個
        var channelOccupied = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 人數上限為 X 人的頻道目前有幾個裡面有人
        for (var [k, v] of oldUserChannel.parent.children) {
            if (v.userLimit <= channelCounts.length) {
                channelCounts[v.userLimit] += 1;
                channelOccupied[v.userLimit] += v.members.size > 0 ? 1 : 0;
            }
        }

        // 保留一個空頻道，其餘的空頻道都刪除
        for (var [k, v] of oldUserChannel.parent.children) {
            if (v.members.size == 0 && channelCounts[v.userLimit] > channelOccupied[v.userLimit] + 1) {
                v.delete('清除空房間...');
                channelCounts[v.userLimit] -= 1;
            }
        }
    }
});

bot.on('message', message => {
    let prefix = '~';
    let msg = message.content.toUpperCase();
    let cont = message.content.slice(prefix.length).split(" ");
    let args = cont.slice(1);

    // Game functions
    if (msg.startsWith(`${prefix}ACCOUNT`)) {
        merchant.fetchUser(message.author.id + message.guild.id, message.author.username).then((r) => {
            const embed = new Discord.RichEmbed()
            .setDescription(`**帳號明細**`)
            .setColor(0xDDDDDD)
            .addField('使用者',r.name,true)
            .addField('所持金',r.balance,true)
            message.channel.send({embed});
        }).catch((e) => {
            message.reply('初次使用此指令將為您註冊帳號，請稍待片刻後再次使用此指令查詢。');
        });
    }

    if (msg.startsWith(`${prefix}CLAIM`)) {
        var d = new Date();
        let daily = parseInt(d.getTime() / (1000 * 60 * 60 * 24));

        merchant.claimDaily(message.author.id + message.guild.id, daily).then((r) => {
            message.reply('本日的登入獎金已加入您的帳號。')
        }).catch((e) => {
            if (e == 1) {
                message.reply('您尚未註冊，請先使用' + prefix + 'account指令註冊。');
            } else if (e == 2) {
                message.reply('你今天已經領取過了...');
            }
        });
    }

    if (msg.startsWith(`${prefix}RESETD`)) {
        if (message.author.id != superUser) {
            message.reply('很抱歉，開發者模式下您沒有此指令的權限。');
            return;
        }

        if (!args[0]) {
            merchant.resetDaily(message.author.id + message.guild.id).then(message.channel.send('重置了' + message.author.username + '的每日獎勵。')).catch(console.error);
        } else {
            let mentionedUsers = message.mentions.users;
            for (var [k, v] of mentionedUsers) {
                merchant.resetDaily(v.id + message.guild.id).then(message.channel.send('重置了' + v.username + '的每日獎勵。')).catch(console.error);
            }
        }
    }

    if (msg.startsWith(`${prefix}GARAGE`)) {
        merchant.fetchItem(message.author.id + message.guild.id).then((r) => {
            var formatted = `\`\`\`\n`;
            let rarityNames = ["Rare", "Very Rare", "Import", "Exotic", "Black Market"];
            let types = ["車體", "輪胎", "氮氣"];
            formatted += '  ID  |    Item Name    |    Rarity    | Type |   Painted Color   |  Certification\n';
            formatted += '----------------------------------------------------------------------------------\n';

            (function loop(i) {
                if (i < r.length) {
                    new Promise((resolve, reject) => {
                        setTimeout(() => {
                            merchant.itemInfo(r[i].itemID).then((k) => {
                                formatted += (rlrparser.format(""+r[i].rowID,6) + '|' + rlrparser.format(k.name,17) + '|' + rlrparser.format(rarityNames[k.rarity-1],14) + '| ' + types[k.type-1] + ' |' + rlrparser.format(r[i].painted.replace('無', ' '),19) + '|' + rlrparser.format(r[i].certed.replace('無', ' '),17) + '\n');
                                resolve();
                            }).catch((e) => {
                                console.log(e);
                                reject();
                            });
                        }, 25);
                    }).then(loop.bind(null, i+1)).catch(loop.bind(null, i+1));
                } else {
                    formatted += `\`\`\`\n`;
                    message.reply('你的物品欄如下：（為提供最佳瀏覽體驗，建議使用電腦版觀看此表）');
                    message.channel.send(formatted);
                }
            })(0);
        }).catch((e) => {
            message.reply('您尚未註冊，或者您的物品欄沒有任何物品。');
        });
    }

    if (msg.startsWith(`${prefix}GIVE`)) {
        if (!args[1]) {
            message.channel.send(`**格式錯誤。使用方法: ${prefix}give <@使用者> <金錢數量>。**`);
        } else if (isNaN(args[1])) {
            message.channel.send(`**格式錯誤。使用方法: ${prefix}give <@使用者> <金錢數量>。**`);
        } else {
            let amount = Math.floor(args[1]);

            if (amount <= 0) {
                message.reply('你這是想搶錢吧...');
                return;
            } else if (Math.abs(amount) >= 100000) {
                message.reply('因為我被玩壞玩怕了，所以現在不支持大面額交易...');
                return;
            }
            let mentionedUsers = message.mentions.users;
            if (mentionedUsers.size == 0) {
                message.channel.send(`**找不到使用者。使用方法: ${prefix}give <@使用者> <金錢數量>。**`);
                return;
            } else if (mentionedUsers.first().id == message.author.id) {
                message.reply('機器人無法理解把錢給自己這種行為...');
                return;
            }

            merchant.fetchUser(message.author.id + message.guild.id, message.author.username).then((r) => {
                if (r.balance < amount) {
                    message.reply('你沒有這麼多錢能給別人...');
                } else {
                    merchant.updateBalance(mentionedUsers.first().id + message.guild.id, amount).then((r) => {
                        merchant.updateBalance(message.author.id + message.guild.id, -amount).then((r) => {
                            message.channel.send('**' + message.author.username + '** 給了 **' + mentionedUsers.first().username + ' **' + args[1] + ' 金錢，謝謝你的慷慨！');
                        }).catch((e) => {
                            console.log('出現未知錯誤:' + e);
                        });
                    }).catch((e) => {
                        console.log('出現未知錯誤:' + e);
                    });
                }
            }).catch((e) => {
                message.reply('您尚未註冊，請先使用' + prefix + 'account指令註冊。');
            });
        }
    }

    if (msg.startsWith(`${prefix}SELL`)) {
        if (!args[0]) {
            message.channel.send(`**格式錯誤。使用方法: ${prefix}sell <物品id> | ${prefix}sell all。**`);
        } else if (args[0].toUpperCase() == "ALL") {
            merchant.fetchItem(message.author.id + message.guild.id).then((r) => {
                (function loop(i) {
                    if (i < r.length) {
                        new Promise((resolve, reject) => {
                            setTimeout(() => {
                                merchant.removeItem(message.author.id + message.guild.id, r[i].rowID).then((s) => {
                                    merchant.itemInfo(s).then((k) => {
                                        var mult = 1.0;
                                        if (r[i].painted == "Titanium White") {
                                            mult += 1.2;
                                        } else if (r[i].painted == "Crimson" || r[i].painted == "Black" || r[i].painted == "Grey") {
                                            mult += 0.5;
                                        } else if (r[i].painted != "無") {
                                            mult += 0.2;
                                        }
                                        if (r[i].certed == "Striker") {
                                            mult += 0.6;
                                        } else if (r[i].certed == "Sweeper" || r[i].certed == "Scorer" || r[i].certed == "Victor") {
                                            mult += 0.3;
                                        } else if (r[i].certed != "無") {
                                            mult += 0.1;
                                        }
                                        let sellPrice = Math.round(k.price * mult);
                                        merchant.updateBalance(message.author.id + message.guild.id, sellPrice).then((r) => {
                                            message.reply('成功賣出一個 **' + k.name + '** 換得' + sellPrice + '金錢。');
                                            resolve();
                                        }).catch(reject());
                                    }).catch(reject());
                                }).catch((e) => {
                                    console.log(e);
                                    reject();
                                });
                            }, 25);
                        }).then(loop.bind(null, i+1)).catch(loop.bind(null, i+1));
                    }
                })(0);
            }).catch((e) => {
                message.reply('您尚未註冊，或者您的物品欄沒有任何物品。');
            });
        } else {
            merchant.fetchItem(message.author.id + message.guild.id).then((r) => {
                (function loop(i) {
                    if (i < args.length) {
                        new Promise((resolve, reject) => {
                            if (isNaN(args[i])) {
                                reject();
                            }
                            setTimeout(() => {
                                merchant.removeItem(message.author.id + message.guild.id, args[i]).then((s) => {
                                    var idx;
                                    for (var j = 0; j < r.length; j++) {
                                        if (r[j].rowID == args[i]) {
                                            idx = j;
                                        }
                                    }
                                    merchant.itemInfo(s).then((k) => {
                                        var mult = 1.0;
                                        if (r[idx].painted == "Titanium White") {
                                            mult += 1.2;
                                        } else if (r[idx].painted == "Crimson" || r[idx].painted == "Black" || r[idx].painted == "Grey") {
                                            mult += 0.5;
                                        } else if (r[idx].painted != "無") {
                                            mult += 0.2;
                                        }
                                        if (r[idx].certed == "Striker") {
                                            mult += 0.6;
                                        } else if (r[idx].certed == "Sweeper" || r[idx].certed == "Scorer" || r[idx].certed == "Victor") {
                                            mult += 0.3;
                                        } else if (r[idx].certed != "無") {
                                            mult += 0.1;
                                        }
                                        let sellPrice = Math.round(k.price * mult);
                                        merchant.updateBalance(message.author.id + message.guild.id, sellPrice).then((r) => {
                                            message.reply('成功賣出一個 **' + k.name + '** 換得' + sellPrice + '金錢。');
                                            resolve();
                                        }).catch(reject());
                                    }).catch(reject());
                                }).catch((e) => {
                                    console.log(e);
                                    message.reply('你好像在sell指令中輸入了無效的物品ID哦...或者你想詐欺本機器人？');
                                    reject();
                                });
                            }, 25);
                        }).then(loop.bind(null, i+1)).catch(loop.bind(null, i+1));
                    }
                })(0);
            }).catch((e) => {
                message.reply('您尚未註冊，或者您的物品欄沒有任何物品。');
            });
        }
    }

    if (msg.startsWith(`${prefix}LOTTERY`)) {
        merchant.fetchUser(message.author.id + message.guild.id, message.author.username).then((r) => {
            if (r.balance < 50) {
                message.reply('您沒有錢了！抽一次獎需要50元。（小提示：記得每天使用' + prefix + 'claim指令賺錢哦！）');
            } else {
                merchant.updateBalance(message.author.id + message.guild.id, -50).then((r) => {
                    merchant.lottery().then((r) => {
                        let colors = [0x2E64FE, 0x8000FF, 0xFE2E2E, 0xD4AF37, 0xFF00FF];
                        let rarityNames = ["Rare", "Very Rare", "Import", "Exotic", "Black Market"];
                        let types = ["車體", "輪胎", "氮氣"];
                        let painted = ["Titanium White", "Grey", "Black", "Cobalt", "Sky Blue", "Forest Green", "Lime", "Saffron", "Orange", "Pink", "Crimson", "Purple", "Burnt Sienna"];
                        let certed = ["Striker", "Sweeper", "Tactician", "Guardian", "Scorer", "Victor", "Playmaker", "Goalkeeper", "Aviator", "Juggler", "Show-off", "Sniper"];
                        var paintedStr, certedStr;

                        if (Math.random() < 0.25) {
                            paintedStr = painted[Math.floor(Math.random()*painted.length)];
                        } else {
                            paintedStr = "無";
                        }

                        if (Math.random() < 0.25) {
                            certedStr = certed[Math.floor(Math.random()*certed.length)];
                        } else {
                            certedStr = "無";
                        }

                        merchant.addItem(message.author.id + message.guild.id, r.id, paintedStr, certedStr);

                        const embed = new Discord.RichEmbed()
                        .setDescription(`**抽獎結果**`)
                        .setColor(colors[r.rarity-1])
                        .addField('獲得物品',r.name,true)
                        .addField('稀有度',rarityNames[r.rarity-1],true)
                        .addField('類型',types[r.type-1],true)
                        .addField('顏色',paintedStr,true)
                        .addField('認證',certedStr,true)
                        message.reply('恭喜！以下物品已加入您的物品欄！（使用' + prefix + 'garage指令來查詢所有物品）');
                        message.channel.send({embed});
                    }).catch((e) => {
                        console.log(e);
                    });
                }).catch((e) => {
                    message.reply('您尚未註冊，請先使用' + prefix + 'account指令註冊。');
                });
            }
        }).catch((e) => {
            message.reply('您尚未註冊，請先使用' + prefix + 'account指令註冊。');
        });
    }

    // ELO functions
    if (msg.startsWith(`${prefix}REGISTER`)) {
        authority.check(message.author.id + message.guild.id)
        .then((r) => {
            if (!args[1]) {
                message.channel.send(`**格式錯誤。使用方法: ${prefix}register <@Discord名稱> <遊戲名稱> (ELO)。**`);
            } else if (!isNaN(args[0])) {
                rlplayer.register(args[0].toString(), args[1], args[2]);
            } else {
                let mentionedUser = message.mentions.users.first().id;
                rlplayer.register(mentionedUser + message.guild.id, args[1], args[2]);
            }
        })
        .catch((e) => {
            message.reply('你沒有此指令的權限。');
        });
    }

    if (msg.startsWith(`${prefix}ELO`)) {
        let mentionedUser;
        if (!args[0]) {
            mentionedUser = message.author.id + message.guild.id;
        } else if (!isNaN(args[0])) {
            mentionedUser = args[0].toString();
        } else {
            mentionedUser = message.mentions.users.first().id + message.guild.id;
        }

        rlplayer.fetch(mentionedUser).then((r) => {
            const embed = new Discord.RichEmbed()
            .setDescription(`**${message.guild.name}**`)
            .setColor(0xD4AF37)
            .addField('遊戲名稱',r.name,true)
            .addField('勝率',(r.win == 0 && r.lose == 0) ? "未進行對戰" : (r.win / (r.win + r.lose) * 100).toFixed(2) + "%",true)
            .addField('配對積分',r.elo.toFixed(2),true)
            message.channel.send({embed});
        });
    }

    if (msg.startsWith(`${prefix}PARSE`)) {
        authority.check(message.author.id + message.guild.id)
        .then((r) => {
            if (!args[0]) {
                message.channel.send(`**格式錯誤。使用方法: ${prefix}parse <Replay編碼>。**`);
            } else {
                rlrparser.parse(args[0])
                .then((r) => {
                    var playerELOs = [];
                    var playerELOChanges = [];
                    var playerWins = [];
                    var playerLoses = [];
                    // console.log(r);
                    var formatted = `\`\`\`\nRESULT: BLUE ${r.get('blue')}-${r.get('orange')} ORANGE`;
                    var nameLength = 0;
                    var scoreLength = 0;
                    var blueELO = 0;
                    var orangeELO = 0;
                    var blueScore = 0;
                    var orangeScore = 0;

                    (function loop(i) {
                        if (i < r.get('players').length) {
                            new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    let p = r.get('players')[i];
                                    nameLength = Math.max(nameLength, p.get('name').length);
                                    scoreLength = Math.max(nameLength, p.get('score').length);

                                    rlplayer.fetchByName(p.get('name')).then((r) => {
                                        playerELOs[i] = parseFloat(r.elo);
                                        playerWins[i] = parseInt(r.win);
                                        playerLoses[i] = parseInt(r.lose);

                                        //console.log(playerELOs[i], playerWins[i], playerLoses[i]);

                                        if (p.get('team') === "blue") {
                                            blueELO += r.elo;
                                            blueScore += parseInt(p.get('score'));
                                        } else {
                                            orangeELO += r.elo;
                                            orangeScore += parseInt(p.get('score'));
                                        }
                                        resolve();
                                    }).catch((e) => {
                                        console.log(e);
                                        reject();
                                    });
                                }, 250);
                            }).then(loop.bind(null, i+1));
                        } else {
                            let isBlueWin = (r.get('blue') > r.get('orange'));
                            let factor = isBlueWin ? 0.5 * orangeELO / (orangeELO + blueELO) : -0.5 * blueELO / (orangeELO + blueELO);

                            for (var i = 0; i < r.get('players').length; i++) {
                                let p = r.get('players')[i];
                                let eloChange;
                                let winChange;
                                let loseChange;
                                let isBlue = (p.get('team') === "blue");
                                if (isBlue) {
                                    eloChange = isBlueWin ? (factor / 2) * parseInt(p.get('score')) / blueScore + (factor / 2) * (blueELO - playerELOs[i]) / blueELO
                                    : (factor / 2) * (blueScore - parseInt(p.get('score'))) / blueScore + (factor / 2) * playerELOs[i] / blueELO;
                                    winChange = isBlueWin ? 1 : 0;
                                    loseChange = isBlueWin ? 0 : 1;
                                } else {
                                    eloChange = isBlueWin ? (factor / -2) * (orangeScore - parseInt(p.get('score'))) / orangeScore + (factor / -2) * playerELOs[i] / orangeELO
                                    : (factor / -2) * parseInt(p.get('score')) / orangeScore + (factor / -2) * (orangeELO - playerELOs[i]) / orangeELO;
                                    winChange = isBlueWin ? 0 : 1;
                                    loseChange = isBlueWin ? 1 : 0;
                                }
                                playerELOChanges.push(eloChange);
                                playerELOs[i] += eloChange;

                                // console.log(p.get('name'), playerWins[i] + winChange, playerLoses[i] + loseChange, playerELOs[i]);
                                rlplayer.update(p.get('name'), playerWins[i] + winChange, playerLoses[i] + loseChange, playerELOs[i]).then((r) => {
                                    console.log(r);
                                }).catch((e) => {
                                    console.log(e);
                                    return;
                                });
                            }

                            nameLength += 2;
                            scoreLength += 2;

                            formatted += (`\n Team |` + rlrparser.format("Name", nameLength) + `|` + rlrparser.format("Score", scoreLength) + `|  +/-  |  ELO `);
                            formatted += (`\n` + rlrparser.seperator(6 + 1 + nameLength + 1 + scoreLength + 1 + 7 + 1 + 7));

                            for (var i = 0; i < r.get('players').length; i++) {
                                let p = r.get('players')[i];
                                formatted += (`\n` + rlrparser.format(p.get('team'), 6) + `|`
                                + rlrparser.format(p.get('name'), nameLength) + `|`
                                + rlrparser.format(p.get('score'), scoreLength)) + `| `
                                + (playerELOChanges[i] > 0 ? "+" : "") + playerELOChanges[i].toFixed(2) + ` | ` + playerELOs[i].toFixed(2);
                                if (i == r.get('players').length / 2 - 1) {
                                    formatted += (`\n` + rlrparser.seperator(6 + 1 + nameLength + 1 + scoreLength + 1 + 7 + 1 + 7));
                                }
                            }
                            formatted += `\n\`\`\``;
                            message.channel.send(formatted);
                        }
                    })(0);
                })
                .catch((e) => {
                    console.log(e);
                });
            }
        })
        .catch((e) => {
            message.reply('你沒有此指令的權限。');
        });
    }

    if (msg.startsWith(`${prefix}DEVUPDATE`)) {
        if (!message.author.id === superUser) {
            message.reply('很抱歉，開發者模式下您沒有此指令的權限。');
            return;
        }

        if (!args[3]) {
            return;
        } else {
            // let mentionedUser = message.mentions.users.first().id + message.guild.id;
            rlplayer.update(args[0], parseInt(args[1]), parseInt(args[2]), parseFloat(args[3])).then((r) => {
                console.log("success");
            }).catch((e) => {
                console.log(e);
            });
        }
    }

    if (msg.startsWith(`${prefix}ADDMOD`)) {
        if (!message.author.id === superUser) {
            message.reply('很抱歉，開發者模式下您沒有此指令的權限。');
            return;
        }

        if (!args[0]) {
            return;
        } else {
            let mentionedUsers = message.mentions.users;
            for (var [k, v] of mentionedUsers) {
                authority.add(v.id + message.guild.id);
            }
        }
    }
});

bot.login(config.token);
