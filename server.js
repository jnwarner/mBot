const Discord = require('discord.js')
const util = require('util')
const jsonFormat = require('json-format')
const exec = require('child_process').exec;
const fs = require('fs')
function puts(error, stdout, stderr) { console.log(stdout) }
const yt = require('ytdl-core')
const tokens = require('./tokens.json')
const client = new Discord.Client()
const YouTube = require('youtube-node')
const yt_client = new YouTube()
const request = require('request')

yt_client.setKey(tokens.yt_token);

let guilds = {};

var lines = fs.readFile('playlist.txt', function (err, data) {
	if (err) console.log(err);
	lines = data.toString().split('\n');

	lines = shuffle(lines)

	console.log('read successfully!');

	return lines
});

const commands = {
	'start': (msg) => {
		if (messageCheck(msg, false, true, false)) {
			console.log("Attempting to start")
			guilds[msg.guild.id].clientUser = msg.guild.member(client.user);
			if (!msg.guild.voiceConnection) return join(guilds[msg.guild.id].voiceChannel).then(() => commands.start(msg));
			if (guilds[msg.guild.id].playing) {
				return msg.channel.send('Music is already playing!')
			}

			(function play(song) {
				console.log("Play function attempting to run")
				guilds[msg.guild.id].song = song
				console.log(song);
				if (song === undefined) {
					song = (guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray[0] : guilds[msg.guild.id].queue.uArray[0])
					setTimeout(() => {
						(guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray.shift() : guilds[msg.guild.id].queue.uArray.shift())
					}, 500)
				}
				if (guilds[msg.guild.id].firstRun) {
					console.log("is first run")
					guilds[msg.guild.id].firstRun = false;
					guilds[msg.guild.id].queue.rArray.splice(guilds[msg.guild.id].queue.rArray.indexOf(song), 1)
				}
				guilds[msg.guild.id].textChannel.send(`Playing: **${song.title}** as requested by: **${song.requester}**` + "\nGet information about the current song with -**song**!");
				guilds[msg.guild.id].dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true, quality: 18 }), { passes: tokens.passes });

				guilds[msg.guild.id].playing = true;

				guilds[msg.guild.id].collector = new Discord.MessageCollector(guilds[msg.guild.id].textChannel, m => m);

				var voiceChannel = guilds[msg.guild.id].voiceChannel;

				let members = voiceChannel.members.array().length;

				if (guilds[msg.guild.id].playing) {
					guilds[msg.guild.id].collector.on('collect', m => {
						var playCheck = setInterval(function () {
							if (!guilds[msg.guild.id]) return
							var voiceChannel = guilds[msg.guild.id].voiceChannel;
							if (guilds[msg.guild.id] !== undefined && guilds[msg.guild.id].playing) {
								members = voiceChannel.members.array().length;
								//console.log('members: ' + members);
								if (guilds[msg.guild.id].collector.channel !== guilds[msg.guild.id].textChannel) {
									console.log('-----Setting channel!-----');
									guilds[msg.guild.id].collector.channel = guilds[msg.guild.id].textChannel;
									//console.log(guilds[msg.guild.id].collector);
								}
								if (guilds[msg.guild.id].clientUser !== undefined) {
									if (guilds[msg.guild.id].voiceChannel !== guilds[msg.guild.id].clientUser.voiceChannel && guilds[msg.guild.id].clientUser.voiceChannel !== undefined) {
										guilds[msg.guild.id].voiceChannel = guilds[msg.guild.id].clientUser.voiceChannel;
										writeDB()
									}
								} if (guilds[msg.guild.id].clientUser === undefined) {
									join(guilds[msg.guild.id].voiceChannel)
								}
								if (members < 2) {
									guilds[msg.guild.id].textChannel.send("Nobody is listening, so I am stopping the music! To continue listening, join **" + guilds[msg.guild.id].voiceChannel.name + "** and type **" + tokens.prefix + "start**")
									stop(msg)
									setTimeout(() => {
										msg.guild.voiceConnection.disconnect()
										clearInterval(playCheck)
									}, 250)
								}
							}
						}, 500);
						if (m.content.toLowerCase().startsWith(tokens.prefix + 'pause')) {
							if (messageCheck(m, false, true)) {
								let roles = m.member.roles.array();
								if (m.author.id === tokens.adminID) {
									m.channel.send("**CREATOR " + m.author.username.toUpperCase() + " TRUMPS ALL**");
									setTimeout(() => {
										m.channel.send('Music Paused! Resume with ' + tokens.prefix + '**resume**').then(() => { guilds[msg.guild.id].dispatcher.pause(); });
										guilds[m.guild.id].isPaused = true;
										guilds[m.guild.id].uniquePause = [];
									}, 250);
									return;
								}
								if (m.author.id === m.guild.ownerID) {
									m.channel.send('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
									setTimeout(() => {
										m.channel.send('Music Paused! Resume with ' + tokens.prefix + '**resume**').then(() => { guilds[msg.guild.id].dispatcher.pause(); });
										guilds[m.guild.id].isPaused = true;
										guilds[m.guild.id].uniquePause = [];
									}, 250);
									return;
								}
								for (i = 0; i < roles.length; i++) {
									console.log(roles[i].name)
									for (j = 0; j < guilds[m.guild.id].moderators.length; j++) {
										if (roles[i].name === guilds[m.guild.id].moderators[j]) {
											m.channel.send('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
											setTimeout(() => {
												m.channel.send('Music Paused! Resume with ' + tokens.prefix + '**resume**').then(() => { guilds[msg.guild.id].dispatcher.pause(); });
												guilds[m.guild.id].isPaused = true;
												guilds[m.guild.id].uniquePause = [];
											}, 250);
											return;
										}
									}
								}
								if (guilds[msg.guild.id].uniquePause.length == 0) {
									guilds[msg.guild.id].uniquePause.push(m.author.id);
									m.reply("Vote processed!");

								} else if (guilds[m.guild.id].uniquePause.length > 0) {
									if (!guilds[m.guild.id].uniquePause.find((element) => { return element == m.author.id; })) {
										guilds[m.guild.id].uniquePause.push(m.author.id);
										m.reply('Vote processed!');
									} else {
										m.reply('You have already voted!');
									}
								}
								if ((guilds[m.guild.id].uniquePause.length / (members - 1)) >= .5) {
									setTimeout(() => {
										m.channel.send('Music Paused! Resume with ' + tokens.prefix + '**resume**').then(() => { guilds[msg.guild.id].dispatcher.pause(); });
										guilds[m.guild.id].isPaused = true;
										guilds[m.guild.id].uniquePause = [];
									}, 500);
								} else {
									setTimeout(() => {
										m.channel.send((Math.round((members - 1) / 2) - guilds[msg.guild.id].uniquePause.length) + ' more vote' + ((Math.round((members - 1) / 2) - guilds[m.guild.id].uniquePause.length) > 1 ? 's' : '') + ' required! ' + guilds[m.guild.id].uniquePause.length + ' of ' + (members - 1) + ' members have voted!');
									}, 500);
								}
							}
						} else if (m.content.toLowerCase().startsWith(tokens.prefix + 'replay')) {
							if (messageCheck(m, false, true)) {
								let roles = m.member.roles.array();
								if (m.author.id === tokens.adminID) {
									m.channel.send("**CREATOR " + m.author.username.toUpperCase() + " TRUMPS ALL**");
									setTimeout(() => {
										m.channel.send('**' + guilds[m.guild.id].song.title + '** set to replay!').then(() => { guilds[m.guild.id].queue.uArray.unshift(guilds[m.guild.id].song) });
										guilds[m.guild.id].uniqueReplay = [];
									}, 250);
									return;
								}
								if (m.author.id === m.guild.ownerID) {
									m.channel.send('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
									setTimeout(() => {
										m.channel.send('**' + guilds[m.guild.id].song.title + '** set to replay!').then(() => { guilds[m.guild.id].queue.uArray.unshift(guilds[m.guild.id].song) });
										guilds[m.guild.id].uniqueReplay = [];
									}, 250);
									return;
								}
								for (i = 0; i < roles.length; i++) {
									console.log(roles[i].name)
									for (j = 0; j < guilds[m.guild.id].moderators.length; j++) {
										if (roles[i].name === guilds[m.guild.id].moderators[j]) {
											m.channel.send('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
											setTimeout(() => {
												m.channel.send('**' + guilds[m.guild.id].song.title + '** set to replay!').then(() => { guilds[m.guild.id].queue.uArray.unshift(guilds[m.guild.id].song) });
												guilds[m.guild.id].uniqueReplay = [];
											}, 250);
											return;
										}
									}
								}
								if (guilds[msg.guild.id].uniqueReplay.length == 0) {
									guilds[msg.guild.id].uniqueReplay.push(m.author.id);
									m.reply("Vote processed!");
								} else if (guilds[m.guild.id].uniqueResume.length > 0) {
									if (!guilds[m.guild.id].uniqueReplay.find((element) => { return element == m.author.id; })) {
										guilds[m.guild.id].uniqueReplay.push(m.author.id);
										m.reply('Vote processed!');
									} else {
										m.reply('You have already voted!');
									}
								}
								if ((guilds[m.guild.id].uniqueResume.length / (members - 1)) >= .5) {
									setTimeout(() => {
										m.channel.send('**' + guilds[m.guild.id].song.title + '** set to replay!').then(() => { guilds[m.guild.id].queue.uArray.unshift(guilds[m.guild.id].song) });
										guilds[m.guild.id].uniqueReplay = [];
									}, 500);
								} else {
									setTimeout(() => {
										m.channel.send((Math.round((members - 1) / 2) - guilds[msg.guild.id].uniqueResume.length) + ' more vote' + ((Math.round((members - 1) / 2) - guilds[m.guild.id].uniqueResume.length) > 1 ? 's' : '') + ' required! ' + guilds[m.guild.id].uniqueResume.length + ' of ' + (members - 1) + ' members have voted!');
									}, 500);
								}
							}
						} else if (m.content.toLowerCase().startsWith(tokens.prefix + 'resume')) {
							if (messageCheck(m, false, true)) {
								let roles = m.member.roles.array();
								if (m.author.id === tokens.adminID) {
									m.channel.send("**CREATOR " + m.author.username.toUpperCase() + " TRUMPS ALL**");
									setTimeout(() => {
										m.channel.send('Music Resumed! Pause with ' + tokens.prefix + '**pause**').then(() => { guilds[msg.guild.id].dispatcher.resume(); });
										guilds[m.guild.id].isPaused = false;
										guilds[m.guild.id].uniqueResume = [];
									}, 250);
									return;
								}
								if (m.author.id === m.guild.ownerID) {
									m.channel.send('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
									setTimeout(() => {
										m.channel.send('Music Resumed! Pause with ' + tokens.prefix + '**pause**').then(() => { guilds[msg.guild.id].dispatcher.resume(); });
										guilds[m.guild.id].isPaused = false;
										guilds[m.guild.id].uniqueResume = [];
									}, 250);
									return;
								}
								for (i = 0; i < roles.length; i++) {
									console.log(roles[i].name)
									for (j = 0; j < guilds[m.guild.id].moderators.length; j++) {
										if (roles[i].name === guilds[m.guild.id].moderators[j]) {
											m.channel.send('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
											setTimeout(() => {
												m.channel.send('Music Resumed! Pause with ' + tokens.prefix + '**pause**').then(() => { guilds[msg.guild.id].dispatcher.resume(); });
												guilds[m.guild.id].isPaused = false;
												guilds[m.guild.id].uniqueResume = [];
											}, 250);
											return;
										}
									}
								}
								if (guilds[msg.guild.id].uniqueResume.length == 0) {
									guilds[msg.guild.id].uniqueResume.push(m.author.id);
									m.reply("Vote processed!");
								} else if (guilds[m.guild.id].uniqueResume.length > 0) {
									if (!guilds[m.guild.id].uniqueResume.find((element) => { return element == m.author.id; })) {
										guilds[m.guild.id].uniqueResume.push(m.author.id);
										m.reply('Vote processed!');
									} else {
										m.reply('You have already voted!');
									}
								}
								if ((guilds[m.guild.id].uniqueResume.length / (members - 1)) >= .5) {
									setTimeout(() => {
										m.channel.send('Music Resumed! Pause with ' + tokens.prefix + '**pause**').then(() => { guilds[msg.guild.id].dispatcher.resume(); });
										guilds[m.guild.id].isPaused = false;
										guilds[m.guild.id].uniqueResume = [];
									}, 500);
								} else {
									setTimeout(() => {
										m.channel.send((Math.round((members - 1) / 2) - guilds[msg.guild.id].uniqueResume.length) + ' more vote' + ((Math.round((members - 1) / 2) - guilds[m.guild.id].uniqueResume.length) > 1 ? 's' : '') + ' required! ' + guilds[m.guild.id].uniqueResume.length + ' of ' + (members - 1) + ' members have voted!');
									}, 500);
								}
							}
						} else if (m.content.toLowerCase().startsWith(tokens.prefix + 'skip')) {
							if (messageCheck(m, false, true)) {
								let roles = m.member.roles.array();
								if (m.author.id === tokens.adminID) {
									console.log("Admin sent the message!")
									m.channel.send("**CREATOR " + m.author.username.toUpperCase() + " TRUMPS ALL**");
									m.channel.send('Song skipped!')
									guilds[msg.guild.id].dispatcher.end()
									return;
								}
								else if (m.author.id === m.guild.ownerID) {
									console.log("Owner sent the message!")
									m.channel.send('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
									setTimeout(() => {
										m.channel.send('Song skipped!')
										guilds[msg.guild.id].dispatcher.end()
									}, 250);
									return;
								}
								for (i = 0; i < roles.length; i++) {
									console.log(roles[i].name)
									for (j = 0; j < guilds[m.guild.id].moderators.length; j++) {
										if (roles[i].name === guilds[m.guild.id].moderators[j]) {
											console.log("Moderator sent the message!")
											m.channel.send('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
											setTimeout(() => {
												m.channel.send('Song skipped!')
												guilds[msg.guild.id].dispatcher.end()
											}, 250);
											return;
										}
									}
								}
								if (guilds[msg.guild.id].uniqueSkips.length == 0) {
									guilds[msg.guild.id].uniqueSkips.push(m.author.id);
									console.log("Processing skip vote for " + m.author.username)
									m.reply("Vote processed!");

								} else if (guilds[m.guild.id].uniqueSkips.length > 0) {
									if (!guilds[m.guild.id].uniqueSkips.find((element) => { return element == m.author.id; })) {
										guilds[m.guild.id].uniqueSkips.push(m.author.id);
										console.log("Processing skip vote for " + m.author.username)
										m.reply('Vote processed!');
									} else {
										m.reply('You have already voted!');
									}
								}
								console.log(guilds[m.guild.id].uniqueSkips.length);
								if ((guilds[m.guild.id].uniqueSkips.length / (members - 1)) >= .5) {
									setTimeout(() => {
										console.log("Voted to skip!")
										m.channel.send('Song skipped!')
										return guilds[msg.guild.id].dispatcher.end()
									}, 500);
								} else {
									setTimeout(() => {
										m.channel.send((Math.round((members - 1) / 2) - guilds[msg.guild.id].uniqueSkips.length) + ' more vote' + ((Math.round((members - 1) / 2) - guilds[m.guild.id].uniqueSkips.length) > 1 ? 's' : '') + ' required! ' + guilds[m.guild.id].uniqueSkips.length + ' of ' + (members - 1) + ' members have voted!');
									}, 500);
								}
							}
						} else if (m.content.toLowerCase().startsWith(tokens.prefix + 'song')) {
							if (messageCheck(m, true)) {
								m.reply("Getting information for current song!")
								yt.getInfo(song.url, (err, info) => {
									if (err) return m.channel.send("I couldn't get the video information :(");
									m.channel.send('Current Song: **' + info.title + '**\nRequested By: **' + song.requester + '**\nSong Time:  **' + (guilds[m.guild.id].dispatcher.time / 1000).toString().toHHMMSS() + '** / **' + info.length_seconds.toHHMMSS() + '**\nTime Remaining:  **' + (((info.length_seconds * 1000) - guilds[m.guild.id].dispatcher.time) / 1000).toString().toHHMMSS() + '**\nWatch Link: ' + song.url);
								});
							}
						}
					});
				}

				guilds[msg.guild.id].line += 5

				guilds[msg.guild.id].dispatcher.on('end', () => {
					if (guilds[msg.guild.id].playing) {
						console.log('Playing next song')
						if (guilds[msg.guild.id].line < lines.length) {
							for (let i = guilds[msg.guild.id].line; i < guilds[msg.guild.id].line + 5; i++) {
								console.log(i)
								yt.getInfo(lines[i], (err, info) => {
									if (err) {
										console.log('Invalid YouTube Link: ' + err);
									} else {
										guilds[msg.guild.id].queue.rArray.push({ url: lines[i], title: info.title, requester: 'Radio Jesus' });
										console.log(msg.guild.name + "'s Radio index: " + i + `\nadded ${info.title} to ${msg.guild.name}'s queue\n`);
									}
								});
							}
						}
						guilds[msg.guild.id].collector.stop();
						guilds[msg.guild.id].uniqueSkips = [];
						guilds[msg.guild.id].uniquePause = [];
						guilds[msg.guild.id].uniqueResume = [];
						guilds[msg.guild.id].line += 5
						setTimeout(() => {
							play((guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray.shift() : guilds[msg.guild.id].queue.uArray.shift()))
						}, 250)
					}
				});
				guilds[msg.guild.id].dispatcher.on('error', (err) => {
					console.log('THERE WAS AN ERROR DAD PLS');
					return console.log('ERROR: ' + err).then(() => {
						guilds[msg.guild.id].collector.stop();
						play(guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray.shift() : guilds[msg.guild.id].queue.uArray.shift());
					});
				});
			})(guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray[0] : guilds[msg.guild.id].queue.uArray[0]);
		}
	},
	'list': (msg) => {
		if (messageCheck(msg, true)) {
			if (guilds[msg.guild.id].queue === undefined || (guilds[msg.guild.id].queue.rArray.length === 0 && guilds[msg.guild.id].queue.uArray.length === 0)) return msg.channel.send(`Add some songs to the queue first with ${tokens.prefix}**play**, or start the radio with ` + tokens.prefix + `**start**!`);
			let tosend = [];
			if (guilds[msg.guild.id].queue.uArray.length !== 0) {
				tosend.push(`#User Queue:\n`)
				guilds[msg.guild.id].queue.uArray.forEach((song, i) => { tosend.push(`${i + 1}. ${song.title.length > 35 ? song.title.substring(0, 35) + '...' : song.title}\n${(i + 1) > 9 ? ' ' : ''}   Requested by: ${song.requester.length > 20 ? song.requester.substring(0, 20) + '...' : song.requester}\n`); });
				tosend.push(`#Radio Queue:\n`)
				guilds[msg.guild.id].queue.rArray.forEach((song, i) => { tosend.push(`${(guilds[msg.guild.id].queue.uArray.length) + i + 1}. ${song.title.length > 35 ? song.title.substring(0, 35) + '...' : song.title}\n${((guilds[msg.guild.id].queue.uArray.length) + i + 1) > 9 ? ' ' : ''}   Requested by: ${song.requester.length > 20 ? song.requester.substring(0, 20) + '...' : song.requester}\n`); });

				msg.channel.send(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`markdown\n${tosend.slice(0, 17).join('\n')}\`\`\``);
			} else {
				tosend.push(`#Radio Queue:\n`)
				guilds[msg.guild.id].queue.rArray.forEach((song, i) => { tosend.push(`${i + 1}. ${song.title.length > 35 ? song.title.substring(0, 35) + '...' : song.title}\n${(i + 1) > 9 ? ' ' : ''}   Requested by: ${song.requester.length > 20 ? song.requester.substring(0, 20) + '...' : song.requester}\n`); });

				msg.channel.send(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length - 1}** songs queued ${(tosend.length > 15 ? '***[Only next 15 shown]***' : '')}\n\`\`\`markdown\n${tosend.slice(0, 16).join('\n')}\`\`\``);
			}
		}
	},
	'help': (msg) => {
		msg.channel.send("", {
			embed: {
				color: 14289237,
				title: 'Bot Information and Commands',
				description: 'Hi! This dialog is here to provide useful information about bot usage!',
				fields: [{
					name: '**Channel Information**',
					value: 'Current text channel: **' + (guilds[msg.guild.id].textChannel === undefined ? "Text channel not set" : guilds[msg.guild.id].textChannel) + '**\nCurrent voice channel: **' + (guilds[msg.guild.id].voiceChannel === undefined ? "Voice channel not set" : guilds[msg.guild.id].voiceChannel.name) + '**'
				},
				{
					name: '**The following require a voice channel**',
					value: tokens.prefix + '**start**     : Starts playing music if it\'s not playing.\n' +
					tokens.prefix + '**play**      : Adds a youtube video to the queue.\n' +
					tokens.prefix + '**addlist**   : Adds a youtube playlist to the queue.'
				},
				{
					name: '**The following are used while music plays**',
					value: tokens.prefix + '**pause**     : Pauses the music. (requires majority)\n' +
					tokens.prefix + '**resume**    : Resumes the music. (requires majority)\n' +
					tokens.prefix + '**skip**      : Skips the playing song. (requires majority)\n' +
					tokens.prefix + '**replay**    : Sets current song to replay (requires majority)\n' +
					tokens.prefix + '**song**      : Shows information about the current song.'
				},
				{
					name: '**The following do not require a voice channel**',
					value: tokens.prefix + '**help**      : Displays available commands.\n' +
					tokens.prefix + '**list**      : Shows the current queue.\n' +
					tokens.prefix + '**search**    : Searches YouTube for top 5 results of query.\n' +
					tokens.prefix + '**related**   : Shows top three related items for term or current song.'
				},
				{
					name: '**Owner Commands**',
					value: tokens.prefix + '**setvoice**  : Sets the bot\'s voice channel.\n' +
					tokens.prefix + '**settext**   : Sets the bot\'s text channel.\n' +
					tokens.prefix + '**addmod**    : Adds role to list of trusted roles.\n' +
					tokens.prefix + '**removemod** : Removes role from list of trusted roles.\n' +
					tokens.prefix + '**listmod**   : Displays currently added roles.'
				},
				{
					name: '**Owner and Moderator Commands**',
					value: tokens.prefix + '**shuffle**   : Shuffles the user queue.\n' +
					tokens.prefix + '**clear**     : Clears the user queue.\n' +
					tokens.prefix + '**remove**    : Removes song from queue.\n' +
					tokens.prefix + '**bump**      : Bumps song to front of user queue.\n' +
					tokens.prefix + '**pause**     : Bypass vote and pauses music.\n' +
					tokens.prefix + '**resume**    : Bypass vote and resumes music.\n' +
					tokens.prefix + '**skip**      : Bypass vote and skips current song.'
				},
				{
					name: '**Command Usage** __(Only for commands with parameters)__',
					value: '```fix\n' + tokens.prefix + 'play 	 [term] [url] [id]\n' +
					tokens.prefix + 'addlist   [playlist id]\n' +
					tokens.prefix + 'search    [term to search]\n' +
					tokens.prefix + 'related   [term]\n' +
					tokens.prefix + 'setvoice  [voice channel name]\n' +
					tokens.prefix + 'settext   [text channel name]\n' +
					tokens.prefix + 'addmod    [role name]\n' +
					tokens.prefix + 'removemod [role name]\n' +
					tokens.prefix + 'remove    [index of song]\n' +
					tokens.prefix + 'bump      [index of song]```'
				}
				]
			}
		});
	},
	'stop': (msg) => {
		if (messageCheck(msg, true)) {
			let roles = msg.member.roles.array();
			if (msg.author.id == msg.guild.ownerID || msg.author.id == tokens.adminID) {
				msg.reply("Okay! To start the music again, join **" + guilds[msg.guild.id].voiceChannel.name + "**  and type " + tokens.prefix + "**start**!")
				console.log("Stopping!")
				stop(msg);
				setTimeout(() => {
					msg.guild.voiceConnection.disconnect();
				}, 250)
				return
			}
			for (i = 0; i < roles.length; i++) {
				console.log(roles[i].name)
				for (j = 0; j < guilds[msg.guild.id].moderators.length; j++) {
					if (roles[i].name === guilds[msg.guild.id].moderators[j]) {
						msg.reply("Gotcha! To start it again, join **" + guilds[msg.guild.id].voiceChannel.name + "** and type " + tokens.prefix + "**start**!")
						console.log("Stopping!")
						stop(msg);
						setTimeout(() => {
							msg.guild.voiceConnection.disconnect();
						}, 250)
						return
					}
				}
			}
		}
	},
	'addlist': (msg) => {
		if (messageCheck(msg, false, true)) {
			let term = msg.content.substring(msg.content.indexOf(' ') + 1);

			if (term == '' || term === undefined || term == '-addlist' || term == '-addlist ') return msg.channel.send(`You must specify a playlist ID after ${tokens.prefix}**addlist**!\n` + "```Usage: " + tokens.prefix + "addlist [playlist ID]```")

			msg.channel.send("Attempting to get playlist content!")
			var playlist = []

			if ((term.startsWith('https://') || term.startsWith('www.')) && term.includes('list')) {
				term = term.substring(term.lastIndexOf('=') + 1)
			}

			setTimeout(() => {

				getPlist(term, null, playlist, function (playlist) {
					if (playlist === null) return msg.channel.send("Invalid Playlist ID! I need either a link with the list parameter included or a valid playlist id!```https://youtube.com/playlist?list=[Playlist ID]```")
					playlist = shuffle(playlist)
					msg.channel.send("Got it! Adding **" + Object.keys(playlist).length + "** videos from **" + playlist[0].snippet.channelTitle + "**'s playlist!")
					for (i = (Object.keys(playlist).length - 1); i >= 0; i--) {
						(function (i) {
							var tmr = setTimeout(function () {
								console.log(i)
								if (playlist[i] !== undefined) {
									console.log(playlist[i].snippet.resourceId.videoId)

									yt.getInfo(('https://youtu.be/' + playlist[i].snippet.resourceId.videoId), (err, info) => {
										if (err) console.log('Invalid YouTube Link: ' + err);
										else {
											if (info.livestream === '1') return msg.channel.send('This is a livestream!');
											guilds[msg.guild.id].queue.rArray.unshift({ url: ('https://youtu.be/' + playlist[i].snippet.resourceId.videoId), title: info.title, requester: (msg.author.username + " (" + playlist[0].snippet.channelTitle + "'s Playlist)") });
										}
									});
								} else {
									console.log(playlist[i])
								}
							}, 750 * i)
						})(i);
					}
				})
			}, 250)
		}
	},
	'search': (msg) => {
		if (messageCheck(msg, true)) {
			let term = msg.content.substring(msg.content.indexOf(' ') + 1)
			let url_id = ""
			let url_base = "https://youtu.be/"
			let toPush = []

			if (term === undefined || term === null || term === '-search' || term === 'search ') {
				msg.channel.send("No term was given!\n" + "```Usage: " + tokens.prefix + "search [term]```")
			} else {
				yt_client.search(term, 10, function (error, result) {
					if (error) {
						console.log("Nope!")
						console.log(error)
					} else {
						console.log("Success!")
						console.log(result.items.length)
						if (result.items[0] != undefined) {
							toPush.push("Results for query \"__**" + toTitleCase(term) + "**__\" *[Videos and Playlists]*\n```markdown")
							for (i = 0; i < result.items.length; i++) {
								if (toPush.length === 6) break
								console.log("Item number " + i)
								console.log(result.items[i].id.kind)
								if (result.items[i].id.kind === 'youtube#playlist') {
									toPush.push((toPush.length) + ".  Type: Playlist\n    Title : " + (result.items[i].snippet.title.length > 35 ? result.items[i].snippet.title.substring(0, 35) + '...' : result.items[i].snippet.title) + "\n    Author: " + result.items[i].snippet.channelTitle + "\n    Command to add: " + tokens.prefix + "addlist " + result.items[i].id.playlistId + '\n')
								} else if (result.items[i].id.kind === 'youtube#video') {
									toPush.push((toPush.length) + ".  Type: Video\n    Title : " + (result.items[i].snippet.title.length > 35 ? result.items[i].snippet.title.substring(0, 35) + '...' : result.items[i].snippet.title) + "\n    Author: " + result.items[i].snippet.channelTitle + "\n    Command to add: " + tokens.prefix + "play " + result.items[i].id.videoId + '\n')
								}
							}

							toPush.push("```")

							setTimeout(() => {
								msg.channel.send(toPush.join('\n'))
							}, 500)
						}
					}
				});
			}
		}
	},
	'related': (msg) => {
		if (messageCheck(msg, true)) {
			let term = msg.content.substring(msg.content.indexOf(' ') + 1)

			console.log("Term: " + term)
			if (term === "-related" || term === "-related ") {
				msg.channel.send("Looking for videos related to the current song!")
				let toPush = []
				let index
				let songID = ""

				if (guilds[msg.guild.id].song.requester === "Radio Jesus") {
					index = guilds[msg.guild.id].song.url.indexOf('=')
					songID = guilds[msg.guild.id].song.url.substring(index + 1)
				} else {
					index = guilds[msg.guild.id].song.url.lastIndexOf('/')
					songID = guilds[msg.guild.id].song.url.substring(index + 1)
				}

				console.log("id ::::" + songID.trim() + "::::")

				request(('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&relatedToVideoId=' + songID.trim() + '&type=video&key=' + tokens.yt_token), (error, response, body) => {
					toPush.push("Videos related to **" + guilds[msg.guild.id].song.title + "**:\n```markdown")
					if (response.statusCode === 404) {
						return console.log("Error: " + response)
					}
					let related = JSON.parse(body)
					//console.log(Object.keys(related.items))
					for (i = 0; i < related.items.length; i++) {
						console.log("Item number " + i)
						toPush.push((toPush.length) + ".  Title : " + (related.items[i].snippet.title.length > 35 ? related.items[i].snippet.title.substring(0, 35) + '...' : related.items[i].snippet.title) + "\n    Author: " + related.items[i].snippet.channelTitle + "\n    Command to add: " + tokens.prefix + "play " + related.items[i].id.videoId + '\n')
					}

					toPush.push("```")

					setTimeout(() => {
						msg.channel.send(toPush.join('\n'))
					}, 500)
				})
			} else {
				msg.channel.send("Looking for videos related to query!")
				yt_client.search(term, 2, function (error, result) {
					if (error) {
						console.log("Nope!")
						console.log(error)
					} else {
						let result_id = result.items[0].id.videoId
						yt.getInfo(result_id.toString(), (err, info) => {
							if (err) return console.log("There was an error getting your video!")
							if (info.livestream === '1') return console.log("This is a livestream!")

							console.log(Object.keys(info))
							console.log("song title: " + info.title)

							let toPush = []

							let songTitle = info.title

							request(('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&relatedToVideoId=' + result_id + '&type=video&key=' + tokens.yt_token), (error, response, body) => {
								toPush.push("Videos related to **" + songTitle + "**:\n```markdown")
								if (response.statusCode === 404) {
									return console.log("Error: " + response)
								}
								console.log(body)
								let related = JSON.parse(body)
								//console.log(Object.keys(related))
								for (i = 0; i < related.items.length; i++) {
									console.log("Item number " + i)
									toPush.push((toPush.length) + ".  Title : " + (related.items[i].snippet.title.length > 35 ? related.items[i].snippet.title.substring(0, 35) + '...' : related.items[i].snippet.title) + "\n    Author: " + related.items[i].snippet.channelTitle + "\n    Command to add: " + tokens.prefix + "play " + related.items[i].id.videoId + '\n')
								}

								toPush.push("```")

								setTimeout(() => {
									msg.channel.send(toPush.join('\n'))
								}, 500)
							})
						})
					}
				})
			}
		}
	},
	'play': (msg) => {
		if (messageCheck(msg, false, true)) {
			let term = msg.content.substring(msg.content.indexOf(' ') + 1);
			let url_id = "";
			let url_base = "https://youtu.be/";

			console.log(term);

			if (term == '' || term === undefined || term == '-play' || term == '-play ') return msg.channel.send(`You must specify a video name or URL after ${tokens.prefix}play!\n` + "```Usage: " + tokens.prefix + "play [term] [url]```");
			else {
				if ((term.charAt(0) == 'w' && term.charAt(1) == 'w' && term.charAt(2) == 'w' && term.charAt(3) == '.') || (term.charAt(0) == 'h' && term.charAt(1) == 't' && term.charAt(2) == 't' && term.charAt(3) == 'p' && (term.charAt(4) == ':' || (term.charAt(4) == 's' && term.charAt(5) == ':')))) {
					if (term.toString() !== null) {
						yt.getInfo(term.toString(), (err, info) => {
							if (err) return msg.channel.send(err);
							if (info.livestream === '1') return msg.channel.send('This is a livestream!');
							//console.log(info);
							//if (!guilds[msg.guild.id].queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].rArray = [], queue[msg.guild.id].uArray = [];
							let time = info.length_seconds

							guilds[msg.guild.id].queue.uArray.push({ url: term, title: info.title, requester: msg.author.username });
							//queue[msg.guild.id].songs.unshift({ url: term, title: info.title, requester: msg.author.username });
							msg.channel.send(`**${info.title}** has been added to the queue! (Song Time: **` + time.toString().toHHMMSS() + `**)`);
						});
					}
				} else {
					yt_client.search(term, 2, function (error, result) {
						if (error) {
							console.log("Nope!")
							console.log(error)
						} else {
							console.log("Success!")
							if (result.items[0] != undefined)
								url_id = JSON.stringify(result.items[0].id.videoId, null, 2);
							if (url_id != undefined) {
								url_id = url_id.toString().substring(1, url_id.length - 1);

								console.log(url_id);

								let url_f = url_base + url_id;
								yt.getInfo(url_f, (err, info) => {
									if (err) return msg.channel.send('I couldn\'t find a video with that name!');
									if (info.livestream === '1') return msg.channel.send('This is a livestream!');
									//if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].rArray = [], queue[msg.guild.id].uArray = [];

									let time = info.length_seconds

									guilds[msg.guild.id].queue.uArray.push({ url: url_f, title: info.title, requester: msg.author.username });
									//queue[msg.guild.id].songs.unshift({ url: url_f, title: info.title, requester: msg.author.username });
									msg.channel.send(`**${info.title}** has been added to the queue! (Song Time: **` + time.toString().toHHMMSS() + `**)`)
								})
							}
							else
								msg.channel.send("I couldn\'t find a video with that name!");
						}
					});
				}
			}
		}
	},
	'bump': (msg) => {
		if (messageCheck(msg, true)) {
			let term = msg.content.substring(msg.content.indexOf(' ') + 1);

			console.log(term);

			if (term == '' || term === undefined || term == '-bump' || term == '-bump ') return msg.channel.send(`You must specify an index after ${tokens.prefix}**bump**!\n` + "```Usage: " + tokens.prefix + "bump [index of song in queue]```");
			else {
				num = parseInt(term)
				if (num === NaN) {
					return msg.channel.send("I couldn't find a number in your message! Try again, with an index in the queue!")
				} else {
					if (guilds[msg.guild.id].queue.uArray.length >= 0 && guilds[msg.guild.id].queue.rArray.length >= 0) {
						if (num > 0 && num <= (guilds[msg.guild.id].queue.uArray.length + guilds[msg.guild.id].queue.rArray.length)) {
							if (num > 0 && num <= guilds[msg.guild.id].queue.uArray.length) {
								let roles = msg.member.roles.array();
								for (i = 0; i < roles.length; i++) {
									console.log(roles[i].name)
									for (j = 0; j < guilds[msg.guild.id].moderators.length; j++) {
										if (roles[i].name === guilds[msg.guild.id].moderators[j]) {
											let temp = guilds[msg.guild.id].queue.uArray[num - 1]
											let toRemove = num
											msg.channel.send("Moving **" + temp.title + "** to the front of the queue!")
											guilds[msg.guild.id].queue.uArray.unshift({ url: temp.url, title: temp.title, requester: (temp.requester + " (bumped by: " + msg.author.username + ")") })
											guilds[msg.guild.id].queue.uArray.splice((toRemove), 1)
											return
										}
									}
								}
								if (msg.author.id == msg.guild.ownerID || msg.author.id == tokens.adminID) {
									let temp = guilds[msg.guild.id].queue.uArray[num - 1]
									let toRemove = num
									msg.channel.send("Moving **" + temp.title + "** to the front of the queue!")
									guilds[msg.guild.id].queue.uArray.unshift({ url: temp.url, title: temp.title, requester: (temp.requester + " (bumped by: " + msg.author.username + ")") })
									guilds[msg.guild.id].queue.uArray.splice((toRemove), 1)
									return
								}
							} else if (num > guilds[msg.guild.id].queue.uArray.length && num <= guilds[msg.guild.id].queue.rArray.length) {
								let roles = msg.member.roles.array();
								let length = guilds[msg.guild.id].queue.uArray.length
								let toRemove
								if (length === 0) {
									toRemove = num - 1
								} else if (length > 0) {
									toRemove = num - length - 1
								}
								console.log(length)
								for (i = 0; i < roles.length; i++) {
									//console.log(roles[i].name)
									for (j = 0; j < guilds[msg.guild.id].moderators.length; j++) {
										if (roles[i].name === guilds[msg.guild.id].moderators[j]) {
											let temp = guilds[msg.guild.id].queue.rArray[toRemove]
											msg.channel.send("Moving **" + temp.title + "** to the front of the queue!")
											guilds[msg.guild.id].queue.uArray.unshift({ url: temp.url, title: temp.title, requester: (temp.requester + " (bumped by: " + msg.author.username + ")") })

											guilds[msg.guild.id].queue.rArray.splice(toRemove, 1)
											return
										}
									}
								}
								if (msg.author.id == msg.guild.ownerID || msg.author.id == tokens.adminID) {
									let temp = guilds[msg.guild.id].queue.rArray[toRemove]
									msg.channel.send("Moving **" + temp.title + "** to the front of the queue!")
									guilds[msg.guild.id].queue.uArray.unshift({ url: temp.url, title: temp.title, requester: (temp.requester + " (bumped by: " + msg.author.username + ")") })

									guilds[msg.guild.id].queue.rArray.splice(toRemove, 1)
									return
								} else {
									msg.channel.send("You can't do that! Sorry!")
								}
							}
						} else {
							msg.channel.send("There isn't a song at that index!")
						}
					} else {
						msg.channel.send("The queue is empty!")
					}
				}
			}
		}
	},
	'clear': (msg) => {
		if (messageCheck(msg, true)) {
			if (guilds[msg.guild.id].queue.uArray.length > 0) {
				if (guilds[msg.guild.id].queue.uArray.length > 0) {
					let roles = msg.member.roles.array();
					for (i = 0; i < roles.length; i++) {
						console.log(roles[i].name)
						for (j = 0; j < guilds[msg.guild.id].moderators.length; j++) {
							if (roles[i].name === guilds[msg.guild.id].moderators[j]) {
								msg.channel.send("Clearing **" + guilds[msg.guild.id].queue.uArray.length + "** song" + (guilds[msg.guild.id].queue.uArray.length > 1 ? "" : "s") + " from the user queue!")
								guilds[msg.guild.id].queue.uArray = []
								return
							}
						}
					}
					if (msg.author.id == msg.guild.ownerID || msg.author.id == tokens.adminID) {
						msg.channel.send("Clearing **" + guilds[msg.guild.id].queue.uArray.length + "** song" + (guilds[msg.guild.id].queue.uArray.length > 1 ? "s" : "") + " from the user queue!")
						guilds[msg.guild.id].queue.uArray = []
						return
					}
				}
			} else {
				msg.channel.send("The user queue is empty!")
			}
		}
	},
	'shuffle': (msg) => {
		if (messageCheck(msg, true)) {
			if (guilds[msg.guild.id].queue.uArray.length > 0) {
				if (guilds[msg.guild.id].queue.uArray.length > 0) {
					let roles = msg.member.roles.array();
					for (i = 0; i < roles.length; i++) {
						console.log(roles[i].name)
						for (j = 0; j < guilds[msg.guild.id].moderators.length; j++) {
							if (roles[i].name === guilds[msg.guild.id].moderators[j]) {
								msg.channel.send("Shuffling **" + guilds[msg.guild.id].queue.uArray.length + "** song" + (guilds[msg.guild.id].queue.uArray.length > 1 ? "" : "s") + " from the user queue!")
								shuffle(guilds[msg.guild.id].queue.uArray)
								return
							}
						}
					}
					if (msg.author.id == msg.guild.ownerID || msg.author.id == tokens.adminID) {
						msg.channel.send("Shuffling **" + guilds[msg.guild.id].queue.uArray.length + "** song" + (guilds[msg.guild.id].queue.uArray.length > 1 ? "" : "s") + " from the user queue!")
						shuffle(guilds[msg.guild.id].queue.uArray)
						return
					}
				}
			} else {
				msg.channel.send("The user queue is empty!")
			}
		}
	},
	'remove': (msg) => {
		if (messageCheck(msg, true)) {
			let term = msg.content.substring(msg.content.indexOf(' ') + 1);

			console.log(term);

			if (term == '' || term === undefined || term == '-remove' || term == '-remove ') return msg.channel.send(`You must specify an index after ${tokens.prefix}**remove**!\n` + "```Usage: " + tokens.prefix + "remove [index of song in queue]```");
			else {
				num = parseInt(term)
				if (num === NaN) {
					return msg.channel.send("I couldn't find a number in your message! Try again, with an index in the queue!")
				} else {
					if (guilds[msg.guild.id].queue.uArray.length >= 0 && guilds[msg.guild.id].queue.rArray.length >= 0) {
						if (num > 0 && num <= (guilds[msg.guild.id].queue.uArray.length + guilds[msg.guild.id].queue.rArray.length)) {
							if (num > 0 && num <= guilds[msg.guild.id].queue.uArray.length) {
								let roles = msg.member.roles.array();
								for (i = 0; i < roles.length; i++) {
									console.log(roles[i].name)
									for (j = 0; j < guilds[msg.guild.id].moderators.length; j++) {
										if (roles[i].name === guilds[msg.guild.id].moderators[j]) {
											msg.channel.send("Removing **" + guilds[msg.guild.id].queue.uArray[num - 1].title + "** from the queue! Sorry **" + guilds[msg.guild.id].queue.uArray[num - 1].requester + "**!")
											guilds[msg.guild.id].queue.uArray.splice((num - 1), 1)
											return
										}
									}
								}
								if (msg.author.id == msg.guild.ownerID || msg.author.id == tokens.adminID) {
									msg.channel.send("Removing **" + guilds[msg.guild.id].queue.uArray[num - 1].title + "** from the queue! Sorry **" + guilds[msg.guild.id].queue.uArray[num - 1].requester + "**!")
									guilds[msg.guild.id].queue.uArray.splice((num - 1), 1)
									return
								}
							} else if (num > guilds[msg.guild.id].queue.uArray.length && num <= guilds[msg.guild.id].queue.rArray.length) {
								let roles = msg.member.roles.array();
								let length = guilds[msg.guild.id].queue.uArray.length
								let toRemove
								if (length === 0) {
									toRemove = num - 1
								} else if (length > 0) {
									toRemove = num - length - 1
								}
								console.log(length)
								for (i = 0; i < roles.length; i++) {
									//console.log(roles[i].name)
									for (j = 0; j < guilds[msg.guild.id].moderators.length; j++) {
										if (roles[i].name === guilds[msg.guild.id].moderators[j]) {
											msg.channel.send("Removing **" + guilds[msg.guild.id].queue.rArray[toRemove].title + "** from the queue! Sorry **" + guilds[msg.guild.id].queue.rArray[toRemove].requester + "**!")
											guilds[msg.guild.id].queue.rArray.splice(toRemove, 1)
											return
										}
									}
								}
								if (msg.author.id == msg.guild.ownerID || msg.author.id == tokens.adminID) {
									msg.channel.send("Removing **" + guilds[msg.guild.id].queue.rArray[toRemove].title + "** from the queue! Sorry **" + guilds[msg.guild.id].queue.rArray[toRemove].requester + "**!")
									guilds[msg.guild.id].queue.rArray.splice(toRemove, 1)
									return
								} else {
									msg.channel.send("You can't do that! Sorry!")
								}
							}
						} else {
							msg.channel.send("There isn't a song at that index!")
						}
					} else {
						msg.channel.send("The queue is empty!")
					}
				}
			}
		}
	},
	'settext': (msg) => {
		if (messageCheck(msg, false, false, true)) {
			let channels = msg.guild.channels;
			let term = msg.content.substring(msg.content.indexOf(' ') + 1);
			if (term == '-settext') {
				msg.channel.send("No text channel was provided!\n" + "```Usage: " + tokens.prefix + "settext [text channel]```");
			} else {
				if (channels.find('name', term) === null) {
					msg.reply("Couln't find a channel with that name!")
				} else {
					let toSet = channels.find('name', term);
					console.log(toSet.id);
					if (toSet.type !== 'text') {
						msg.channel.send("You must provide the name of a text channel!\n" + "```Usage: " + tokens.prefix + "settext [text channel]```");
					} else {
						msg.reply("Okay! #**" + toSet.name + "** set as music bot command channel! Please issue further commands here!");
						guilds[msg.guild.id].textChannel = toSet;
						writeDB()
					}
				}
			}
		}
	},
	'setvoice': (msg) => {
		if (messageCheck(msg, false, false, true)) {
			let channels = msg.guild.channels;
			let term = msg.content.substring(msg.content.indexOf(' ') + 1);
			if (term == '-setvoice') {
				msg.channel.send("No voice channel was provided!\n" + "```Usage: " + tokens.prefix + "setvoice [voice channel]```");
			} else {
				if (channels.findAll('name', term) === null) {
					msg.reply("I Couln't find a channel with that name! The channel name is case sensitive!")
				} else {
					let toSet = channels.findAll('name', term);
					//console.log(toSet);
					for (i = 0; i < toSet.length; i++) {
						//console.log(toSet[i]);
						if (toSet[i].type === 'voice') {
							if (toSet[i].joinable === false) return msg.reply("I can't join that channel on my own! If you drag me in it will work, but it is not recommended!")
							console.log(toSet[i].name + ' ' + toSet[i].id)
							msg.reply("Okay! **" + toSet[i].name + "** set as music bot voice channel! Please issue further commands while in this channel!");
							guilds[msg.guild.id].voiceChannel = toSet[i];
							join(guilds[msg.guild.id].voiceChannel)
							writeDB()
						}
					}
				}
			}
		}
	},
	'addmod': (msg) => {
		if (messageCheck(msg, false, false, true)) {
			let roles = msg.guild.roles.array();
			console.log(roles);
			let term = msg.content.substring(msg.content.indexOf(' ') + 1);
			if (term == '-setmod') {
				msg.channel.send("No group name was provided!\n" + "```Usage: " + tokens.prefix + "setmod [role name]```");
			} else {
				for (i = 0; i < roles.length; i++) {
					if (roles[i].name.toUpperCase() === term.toUpperCase()) {
						guilds[msg.guild.id].moderators.push(roles[i].name);
						writeDB()
						msg.channel.send("**" + roles[i].name + "** found! Added to list of bot moderators!");
					}
				}
			}
		}
	},
	'removemod': (msg) => {
		if (messageCheck(msg, false, false, true)) {
			let roles = msg.guild.roles.array();
			console.log(roles);
			let term = msg.content.substring(msg.content.indexOf(' ') + 1);
			if (term == '-removemod' || term == '-removemod ' || term == undefined || term == ' ') {
				msg.channel.send("No group name was provided!\n" + "```Usage: " + tokens.prefix + "setmod [role name]```");
			} else {
				for (i = 0; i < roles.length; i++) {
					if (roles[i].name.toUpperCase() === term.toUpperCase()) {
						var index = guilds[msg.guild.id].moderators.indexOf(term)
						guilds[msg.guild.id].moderators.splice(index, 1);
						writeDB()
						msg.channel.send("**" + roles[i].name + "** found! Removed from the list of bot moderators!");
					}
				}
			}
		}
	},
	'listmod': (msg) => {
		if (messageCheck(msg, false, false, true)) {
			let roles = msg.guild.roles.array();
			let mods = []
			if (guilds[msg.guild.id].moderators === [] || guilds[msg.guild.id].moderators.length === 0) return msg.channel.send("No moderators have been added! Only the owner can control me right now!")
			for (i = 0; i < guilds[msg.guild.id].moderators.length; i++) {
				mods.push(guilds[msg.guild.id].moderators[i])
			}
			msg.channel.send(`**${msg.guild.name}**'s List of Moderators:\n\`\`\`diff\n${mods.join('\n')}\`\`\``)
		}
	},
	'reboot': (msg) => {
		if (msg.author.id == tokens.adminID) process.exit(); //Requires a node module like Forever to work.
	}
};

function init(guild) {
	guilds[guild.id] = {}
	console.log("checking text channels for one joinable")
	for (i = 0; i < guild.channels.array().length; i++) {
		if (guild.channels.array()[i].type === 'text') {
			console.log(guild.channels.array()[i].name + ' ' + guild.channels.array()[i].id)
			guilds[guild.id].textChannel = guild.channels.array()[i];
			break;
		}
	}
	console.log("checking voice channels for one joinable")
	for (i = 0; i < guild.channels.array().length; i++) {
		if (guild.channels.array()[i].type === 'voice' && guild.channels.array()[i].joinable === true) {
			console.log(guild.channels.array()[i].name + ' ' + guild.channels.array()[i].id)
			guilds[guild.id].voiceChannel = guild.channels.array()[i];
			break;
		}
	}
	guilds[guild.id].queue = {};
	guilds[guild.id].queue.uArray = [];
	guilds[guild.id].queue.rArray = [];
	guilds[guild.id].moderators = [];
	guilds[guild.id].uniqueSkips = [];
	guilds[guild.id].uniquePause = [];
	guilds[guild.id].uniqueResume = [];
	guilds[guild.id].firstRun = true;
	guilds[guild.id].line = 0;
	guilds[guild.id].isPaused = false;
	guilds[guild.id].firstRun = true;
	guilds[guild.id].dispatcher;
	guilds[guild.id].msgLimiter = []
	guilds[guild.id].collector = new Discord.MessageCollector(guilds[guild.id].textChannel, m => m);
	guilds[guild.id].playing = false;

	writeDB();

	guilds[guild.id].textChannel.send("Hi! Since I was just added to the guild I set the channels by default to #**" + guilds[guild.id].textChannel.name + "** for bot commands, and **" + guilds[guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

	return;
}

function writeDB() {
	let dbName = "db.json";
	let toLog = {};
	console.log('Writing to the database!');
	for (var i = 0; i < Object.keys(guilds).length; i++) {
		console.log(Object.keys(guilds[Object.keys(guilds)[i]].voiceChannel).length)
		if (Object.keys(guilds[Object.keys(guilds)[i]]).length > 3 && Object.keys(guilds[Object.keys(guilds)[i]].textChannel).length > 0 && Object.keys(guilds[Object.keys(guilds)[i]].voiceChannel).length > 0) {
			console.log(guilds[Object.keys(guilds)[i]].textChannel.guild.name + " checks out!")
			toLog[Object.keys(guilds)[i]] = {};
			toLog[Object.keys(guilds)[i]].textChannel = {};
			toLog[Object.keys(guilds)[i]].voiceChannel = {};

			toLog[Object.keys(guilds)[i]].textChannel.name = guilds[Object.keys(guilds)[i]].textChannel.name;
			toLog[Object.keys(guilds)[i]].textChannel.id = guilds[Object.keys(guilds)[i]].textChannel.id;
			toLog[Object.keys(guilds)[i]].voiceChannel.name = guilds[Object.keys(guilds)[i]].voiceChannel.name;
			toLog[Object.keys(guilds)[i]].voiceChannel.id = guilds[Object.keys(guilds)[i]].voiceChannel.id;
			toLog[Object.keys(guilds)[i]].moderators = guilds[Object.keys(guilds)[i]].moderators;
		}
	}

	fs.writeFile(dbName, jsonFormat(toLog), (err) => {
		if (err) console.log("I had an error");
		else console.log("I successfully wrote to the database file!");
	})
}

function readDB(guild) {
	let guildChannels = guild.channels;
	let dbName = "db.json";
	let obj = {};
	guilds[guild.id] = {}
	fs.readFile(dbName, 'utf-8', (err, data) => {
		if (err) return;
		else {
			obj = JSON.parse(data);
			if (Object.keys(obj).length > 0) {
				console.log("parsing")
				guilds[guild.id].textChannel = {}
				guilds[guild.id].voiceChannel = {}
				guilds[guild.id].moderators = []
				for (i = 0; i < Object.keys(obj).length; i++) {
					//console.log(Object.keys(obj)[i])
					//console.log(guild.id)
					if (Object.keys(obj)[i] === guild.id) {
						//console.log("Text channel to add " + obj[Object.keys(obj)[i]].textChannel.id)
						//console.log("Voice channel to add " + obj[Object.keys(obj)[i]].voiceChannel.id)
						guilds[guild.id].textChannel = guildChannels.find('id', obj[Object.keys(obj)[i]].textChannel.id)
						//console.log(guilds[guild.id].textChannel)
						if (guilds[guild.id].textChannel === null) {
							console.log("text channel not found! checking channels")
							for (i = 0; i < guild.channels.array().length; i++) {
								if (guild.channels.array()[i].type === 'text') {
									console.log(guild.channels.array()[i].name + ' ' + guild.channels.array()[i].id)
									guilds[guild.id].textChannel = guild.channels.array()[i];
									writeDB()

									guilds[guild.id].textChannel.send("I was unable to find my old text channel, so I'm defaulting to #**" + guilds[guild.id].textChannel.name + "**! To change this, use the command " + tokens.prefix + "**settext**.")
								}
							}
						}
						guilds[guild.id].voiceChannel = guildChannels.find('id', obj[Object.keys(obj)[i]].voiceChannel.id)
						//console.log(guilds[guild.id].voiceChannel)
						if (guilds[guild.id].voiceChannel === null) {
							console.log("voice channel not found! checking channels")
							for (i = 0; i < guild.channels.array().length; i++) {
								if (guild.channels.array()[i].type === 'voice') {
									if (guild.channels.array()[i].joinable === true) {
										console.log(guild.channels.array()[i].name + ' ' + guild.channels.array()[i].id)
										guilds[guild.id].voiceChannel = guild.channels.array()[i];
										writeDB()

										guilds[guild.id].textChannel.send("I was unable to find my old voice channel, so I'm defaulting to #**" + guilds[guild.id].voiceChannel.name + "**! To change this, use the command " + tokens.prefix + "**setvoice**.")
									}
								}
							}
						}
						guilds[guild.id].moderators = obj[Object.keys(obj)[i]].moderators
						guilds[guild.id].queue = {};
						guilds[guild.id].queue.uArray = [];
						guilds[guild.id].queue.rArray = [];
						guilds[guild.id].uniqueSkips = [];
						guilds[guild.id].uniquePause = [];
						guilds[guild.id].uniqueResume = [];
						guilds[guild.id].uniqueRemove = [];
						guilds[guild.id].uniqueReplay = [];
						guilds[guild.id].line = 0;
						guilds[guild.id].isPaused = false;
						guilds[guild.id].playing = false;
						guilds[guild.id].firstRun = true;
						guilds[guild.id].msgLimiter = []
						guilds[guild.id].collector = new Discord.MessageCollector(guilds[guild.id].textChannel, m => m);

						guilds[guild.id].textChannel.send("Oops, something went wrong! I'll attempt to restart music automatically in the voice channel **" + guilds[guild.id].voiceChannel.name + "**!")

						for (let i = guilds[guild.id].line; i < guilds[guild.id].line + 5; i++) {
							console.log(i)
							yt.getInfo(lines[i], (err, info) => {
								if (err) {
									console.log('Invalid YouTube Link: ' + err);
								} else {
									guilds[guild.id].queue.rArray.push({ url: lines[i], title: info.title, requester: 'Radio Jesus' });
									console.log(guild.name + "'s Radio index: " + i + `\nadded ${info.title} to ${guild.name}'s queue\n`);
								}
							});
						}

						guilds[guild.id].line += 5

						setTimeout(() => {
							console.log(guilds[guild.id].queue.rArray)
							var lastMessageID = guilds[guild.id].textChannel.lastMessageID
							//console.log(lastMessageID)
							guilds[guild.id].textChannel.fetchMessage(lastMessageID).then(msg => {
								join(guilds[guild.id].voiceChannel)
								setTimeout(() => {
									commands.start(msg)
								}, 2000)
							})
						}, 3000)
					}
				}
			} else console.log("nothing to parse")
		}
	})
}

function join(voiceChannel) {
	return new Promise((resolve, reject) => {
		if (!voiceChannel || voiceChannel.type !== 'voice' || !voiceChannel.joinable) return msg.reply('I couldn\'t connect! Is your voice channel private?');
		voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
	});
}

function censor(censor) {
	var i = 0;

	return function (key, value) {
		if (i !== 0 && typeof (censor) === 'object' && typeof (value) == 'object' && censor == value)
			return '[Circular]';

		if (i >= 29) // seems to be a harded maximum of 30 serialized objects?
			return '[Unknown]';

		++i; // so we know we aren't using the original object anymore

		return value;
	}
}

function getPlist(plistId, pageToken = null, plist, callback) {
	if (pageToken === null) {
		request(('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=' + plistId + '&key=' + tokens.yt_token), (error, response, body) => {
			if (response.statusCode === 404) {
				plist = null
				return callback(plist)
			}
			let ptemp = JSON.parse(body)
			console.log(Object.keys(ptemp.items).length)
			for (i = 0; i < Object.keys(ptemp.items).length; i++) {
				plist[i] = ptemp.items[i]
			}
			if (ptemp.nextPageToken !== undefined) {
				console.log(ptemp.nextPageToken)
				getPlist(plistId, ptemp.nextPageToken, plist, callback)
			} else {
				console.log('END OF PLIST')
				console.log(typeof (callback))
				return callback(plist)
			}
		})
	} else {
		request(('https://www.googleapis.com/youtube/v3/playlistItems?pageToken=' + pageToken + '&part=snippet&maxResults=50&playlistId=' + plistId + '&key=' + tokens.yt_token), (error, response, body) => {
			let ptemp = JSON.parse(body)
			let plength = Object.keys(plist).length
			console.log(Object.keys(ptemp.items).length)
			for (i = 0; i < Object.keys(ptemp.items).length; i++) {
				let index = i + plength - 1
				plist[index] = ptemp.items[i]
			}
			if (ptemp.nextPageToken !== undefined) {
				console.log(ptemp.nextPageToken)
				getPlist(plistId, ptemp.nextPageToken, plist, callback)
			} else {
				console.log('END OF PLIST')
				console.log(typeof (callback))
				return callback(plist)
			}
		})
	}
}

function messageCheck(msg, textCheck = false, voiceCheck = false, adminCheck = false) {
	if (textCheck) {
		if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
			msg.channel.send("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!")
			return false
		} else {
			return true
		}
	} else if (voiceCheck) {
		if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
			msg.channel.send("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!")
			return false
		} else {
			if (guilds[msg.guild.id].voiceChannel === undefined) {
				msg.channel.send("You haven't set a voice channel! I can't function without one :(")
				return false
			} else {
				if (msg.member.voiceChannel === undefined) {
					msg.channel.send("You aren't in a voice channel! Join **" + guilds[msg.guild.id].voiceChannel.name + "** and retry your command!")
					return false
				} else {
					if (msg.member.voiceChannel.name !== guilds[msg.guild.id].voiceChannel.name) {
						msg.channel.send("Wrong Voice Channel! Commands must be issued in while in **" + guilds[msg.guild.id].voiceChannel.name + "** voice channel!")
						return false
					} else {
						return true
					}
				}
			}
		}
	} else if (adminCheck) {
		if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
			msg.channel.send("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!")
			return false
		} else {
			if (msg.author.id === msg.guild.owner.id || msg.author.id === tokens.adminID) {
				return true
			} else {
				msg.channel.send("You are not the owner of the guild!")
				return false
			}
		}
	}
}

function stop(msg) {
	guilds[msg.guild.id].uniqueSkips = [];
	guilds[msg.guild.id].uniquePause = [];
	guilds[msg.guild.id].uniqueResume = [];
	guilds[msg.guild.id].uniqueReplay = [];
	guilds[msg.guild.id].isPaused = false;
	guilds[msg.guild.id].firstRun = true;
	delete guilds[msg.guild.id].dispatcher;
	guilds[msg.guild.id].collector.stop();
	guilds[msg.guild.id].playing = false;

	return;
}

function checkUser(arrayItem) {
	console.log("Checking user! " + arrayItem.length + " messages!")
	if (arrayItem.num < 5) {
		arrayItem.num++
		return true
	} else {
		return false
	}
}

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

function toTitleCase(str) {
	return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}

String.prototype.toHHMMSS = function () {
	var sec_num = parseInt(this, 10); // don't forget the second param
	var hours = Math.floor(sec_num / 3600);
	var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	var seconds = Math.ceil(sec_num - (hours * 3600) - (minutes * 60)) + 1;

	if (hours < 10) { hours = "0" + hours; }
	if (minutes < 10) { minutes = "0" + minutes; }
	if (seconds < 10) { seconds = "0" + seconds; }
	console.log(typeof (hours))
	console.log(hours)
	if (hours == '00') {
		return minutes + ':' + seconds;
	} else {
		return hours + ':' + minutes + ':' + seconds;
	}
}

client.on('message', msg => {
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
		console.log("Command emitted by guild " + msg.guild.name + " (id: " + msg.guild.id + "): " + msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])
		// if (!guilds[msg.guild.id] || guilds[msg.guild.id].textChannel === undefined || guilds[msg.guild.id].voiceChannel === undefined || Object.keys(guilds[msg.guild.id].textChannel).length === 0 || Object.keys(guilds[msg.guild.id].voiceChannel).length === 0) {
		// 	console.log("Channel hasn't been added to database, setting up now")
		// 	guilds[msg.guild.id] = {};
		// 	init(msg);
		// 	if (guilds[msg.guild.id].textChannel !== undefined && guilds[msg.guild.id].voiceChannel !== undefined) {
		// 		msg.channel.send("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

		// 		setTimeout(function () {
		// 			if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
		// 				console.log(commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]])
		// 				if (commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-reset' || commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-stop') {
		// 					msg.reply("Retrying command")
		// 					setTimeout(function () {
		// 						commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
		// 					}, 250);
		// 				}
		// 			}
		// 		}, 500);
		// 	}
		// } else {
		//console.log("Guild is registered in database, moving on!")
		let userString = msg.author.username
		if (guilds[msg.guild.id].msgLimiter.userString !== undefined) {
			if (checkUser(guilds[msg.guild.id].msgLimiter.userString)) {
				console.log(guilds[msg.guild.id].msgLimiter)
				console.log("I should be running your command!")
				commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg)
			} else {
				msg.reply("You've sent too many messages! Wait a few seconds and try again!")
			}
		} else {
			console.log("Should be running it!")
			guilds[msg.guild.id].msgLimiter.userString = { num: 1 }
			commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg)
		}
		//}
	} else {
		console.log("Message doesn't have a property, is it a collector command?")
		if (msg.content.toLowerCase() !== '-song' && msg.content.toLowerCase() !== '-pause' && msg.content.toLowerCase() !== '-resume' && msg.content.toLowerCase() !== '-skip' && msg.content.toLowerCase() !== '-replay') {
			msg.channel.send("I don't have a command for that! Let me show you what I can do.")
			setTimeout(() => {
				commands.help(msg)
			}, 3000)
		}
	}
});

client.on('ready', () => {
	console.log('Logged In! Listing Guilds');
	client.user.setGame(tokens.prefix + 'help')
	client.guilds.forEach(guild => {
		setTimeout(() => {
			console.log(guild.name + ": Owned by " + guild.owner.displayName)
			readDB(guild)
		}, 250)
	})
})

client.on('guildCreate', guild => {
	console.log(guild.name + " is being added to the database!")
	init(guild)
})

client.on('guildDelete', guild => {
	console.log("Removing " + guild.name + " from the database!")
	delete guilds[guild.id]
	writeDB()
})

client.setInterval(() => {
	if (Object.keys(guilds).length > 0) {
		client.guilds.forEach(guild => {
			if (guilds[guild.id].playing) {
				console.log("Resetting message limiter for " + guild.name + " now!")
				guilds[guild.id].msgLimiter = []
			}
		})
	}
}, 8000)

client.login(tokens.t_token)

process.on('uncaughtException', (err) => {
	if (err.code == 'ECONNRESET') {
		// Yes, I'm aware this is really bad node code. However, the uncaught exception
		// that causes this error is buried deep inside either discord.js, ytdl or node
		// itself and after countless hours of trying to debug this issue I have simply
		// given up. The fact that this error only happens *sometimes* while attempting
		// to skip to the next video (at other times, I used to get an EPIPE, which was
		// clearly an error in discord.js and was now fixed) tells me that this problem
		// can actually be safely prevented using uncaughtException. Should this bother
		// you, you can always try to debug the error yourself and make a PR.
		console.log('Got an ECONNRESET! This is *probably* not an error. Stacktrace:')
		console.log(err.stack)
	} else {
		// Normal error handling
		fs.appendFile('log.txt', err, (err) => {
			if (err) console.log("I had an error");
			else console.log("I successfully wrote to the log file!");
		})
		// console.log(err)
		// console.log(err.stack)
		//process.exit(0)
	}
})