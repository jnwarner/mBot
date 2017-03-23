const Discord = require('discord.js');
const util = require('util');
const lodash = require('lodash')
const exec = require('child_process').exec;
const fs = require('fs');
function puts(error, stdout, stderr) { console.log(stdout) }
const yt = require('ytdl-core');
const tokens = require('./tokens.json');
const client = new Discord.Client();
const YouTube = require('youtube-node');
const yt_client = new YouTube();

yt_client.setKey(tokens.yt_token);

let guilds = {};

const commands = {
	'start': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			init(msg);
			if (guilds[msg.guild.id].textChannel !== undefined && guilds[msg.guild.id].voiceChannel !== undefined) {
				msg.channel.sendMessage("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

				setTimeout(function () {
					if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
						console.log(commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]])
						if (commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-reset' || commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-stop') {
							msg.reply("Retrying command")
							setTimeout(function () {
								commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
							}, 250);
						}
					}
				}, 500);
			} else {
				msg.channel.sendMessage("It doesn't look like you have any voice channels! Please create one and set it as the voice channel using " + tokens.prefix + "**setvoice**!");
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!");
			} else {
				if (guilds[msg.guild.id].voiceChannel === undefined) {
					msg.channel.sendMessage("You haven't set a voice channel! I can't function without one :(")
				} else {
					if (msg.member.voiceChannel === undefined) {
						msg.channel.sendMessage("You aren't in a voice channel!")
					} else {
						if (msg.member.voiceChannel.name !== guilds[msg.guild.id].voiceChannel.name) {
							msg.channel.sendMessage("Wrong Voice Channel! Commands must be issued in while in **" + guilds[msg.guild.id].voiceChannel.name + "** voice channel!");
						} else {
							commands.radio(msg);
							setTimeout(() => {
								guilds[msg.guild.id].clientUser = msg.guild.member(client.user);
								if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.start(msg));
								if (guilds[msg.guild.id].queue.playing) return msg.channel.sendMessage('Music is already playing! Did you mean ' + tokens.prefix + '**resume**?');
								guilds[msg.guild.id].queue.playing = true;

								(function play(song, seek = 0) {
									console.log(song);
									if (song === undefined) return guilds[msg.guild.id].textChannel.sendMessage('Queue is empty').then(() => {
										guilds[msg.guild.id].queue.playing = false;
										msg.member.voiceChannel.leave();
									});
									guilds[msg.guild.id].textChannel.sendMessage(`Playing: **${song.title}** as requested by: **${song.requester}**`);

									guilds[msg.guild.id].dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes: tokens.passes, seek: seek });
									guilds[msg.guild.id].running = true;
									console.log(guilds[msg.guild.id].firstRun);
									if (guilds[msg.guild.id].firstRun) {
										guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray.shift() : guilds[msg.guild.id].queue.uArray.shift();
										guilds[msg.guild.id].firstRun = false;
									}

									guilds[msg.guild.id].collector = new Discord.MessageCollector(guilds[msg.guild.id].textChannel, m => m);

									var voiceChannel = guilds[msg.guild.id].voiceChannel;

									let members = voiceChannel.members.array().length;

									//if (guilds[msg.guild.id].running) {
									guilds[msg.guild.id].collector.on('message', m => {
										console.log('got the message!')
										setInterval(function () {
											var voiceChannel = guilds[msg.guild.id].voiceChannel;
											if (guilds[m.guild.id].running) {
												members = voiceChannel.members.array().length;
												//console.log('members: ' + members);
												if (guilds[msg.guild.id].collector.channel !== guilds[msg.guild.id].textChannel) {
													console.log('-----Setting channel!-----');
													guilds[msg.guild.id].collector.channel = guilds[msg.guild.id].textChannel;
													console.log(guilds[msg.guild.id].collector);
												}
												if (guilds[msg.guild.id].voiceChannel !== guilds[msg.guild.id].clientUser.voiceChannel) {
													guilds[msg.guild.id].voiceChannel = guilds[msg.guild.id].clientUser.voiceChannel;
												}
												if (!guilds[m.guild.id].isPaused) {
													if (members < 2) {
														guilds[m.guild.id].dispatcher.pause();
													} else {
														guilds[m.guild.id].dispatcher.resume();
													}
												}
											}
										}, 500);
										if (m.content.startsWith(tokens.prefix + 'pause')) {
											if (m.channel.id !== guilds[m.guild.id].textChannel.id) {
												m.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[m.guild.id].textChannel.name + "**!");
											} else {
												if (m.member.voiceChannel === undefined) {
													m.channel.sendMessage("You aren't in a voice channel!")
												} else {
													if (m.member.voiceChannel.name !== guilds[m.guild.id].voiceChannel.name) {
														m.channel.sendMessage("Wrong Voice Channel! Commands must be issued in while in **" + guilds[m.guild.id].voiceChannel.name + "** voice channel!");
													} else {
														let roles = m.member.roles.array();
														for (i = 0; i < roles.length; i++) {
															console.log(roles[i].name)
															console.log('Name found in list: ' + guilds[msg.guild.id].moderators.includes);
															if (!lodash.isEmpty(lodash.xor(guilds[msg.guild.id].moderators, roles[i].name)) || m.author.id == m.guild.ownerID) {
																m.channel.sendMessage('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
																setTimeout(() => {
																	m.channel.sendMessage('Music Paused! Resume with ' + tokens.prefix + '**resume**').then(() => { guilds[msg.guild.id].dispatcher.pause(); });
																	guilds[m.guild.id].isPaused = true;
																	guilds[m.guild.id].uniquePause = [];
																}, 250);
																return;
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
																m.channel.sendMessage('Music Paused! Resume with ' + tokens.prefix + '**resume**').then(() => { guilds[msg.guild.id].dispatcher.pause(); });
																guilds[m.guild.id].isPaused = true;
																guilds[m.guild.id].uniquePause = [];
															}, 500);
														} else {
															setTimeout(() => {
																m.channel.sendMessage((Math.round((members - 1) / 2) - guilds[msg.guild.id].uniquePause.length) + ' more vote' + ((Math.round((members - 1) / 2) - guilds[m.guild.id].uniquePause.length) > 1 ? 's' : '') + ' required! ' + guilds[m.guild.id].uniquePause.length + ' of ' + (members - 1) + ' members have voted!');
															}, 500);
														}
													}
												}
											}
										} else if (m.content.startsWith(tokens.prefix + 'resume')) {
											if (m.channel.id !== guilds[m.guild.id].textChannel.id) {
												m.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[m.guild.id].textChannel.name + "**!");
											} else {
												if (m.member.voiceChannel === undefined) {
													m.channel.sendMessage("You aren't in a voice channel!")
												} else {
													if (m.member.voiceChannel.name !== guilds[m.guild.id].voiceChannel.name) {
														m.channel.sendMessage("Wrong Voice Channel! Commands must be issued in while in **" + guilds[m.guild.id].voiceChannel.name + "** voice channel!");
													} else {
														let roles = m.member.roles.array();
														for (i = 0; i < roles.length; i++) {
															console.log(roles[i].name)
															if (!lodash.isEmpty(lodash.xor(guilds[msg.guild.id].moderators, roles[i].name)) || m.author.id == m.guild.ownerID) {
																m.channel.sendMessage('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
																setTimeout(() => {
																	m.channel.sendMessage('Music Resumed! Pause with ' + tokens.prefix + '**pause**').then(() => { guilds[msg.guild.id].dispatcher.resume(); });
																	guilds[m.guild.id].isPaused = false;
																	guilds[m.guild.id].uniqueResume = [];
																}, 250);
																return;
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
																m.channel.sendMessage('Music Resumed! Pause with ' + tokens.prefix + '**pause**').then(() => { guilds[msg.guild.id].dispatcher.resume(); });
																guilds[m.guild.id].isPaused = false;
																guilds[m.guild.id].uniqueResume = [];
															}, 500);
														} else {
															setTimeout(() => {
																m.channel.sendMessage((Math.round((members - 1) / 2) - guilds[msg.guild.id].uniqueResume.length) + ' more vote' + ((Math.round((members - 1) / 2) - guilds[m.guild.id].uniqueResume.length) > 1 ? 's' : '') + ' required! ' + guilds[m.guild.id].uniqueResume.length + ' of ' + (members - 1) + ' members have voted!');
															}, 500);
														}
													}
												}
											}
										} else if (m.content.startsWith(tokens.prefix + 'skip')) {
											if (m.channel.id !== guilds[msg.guild.id].textChannel.id) {
												m.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!");
											} else {
												if (m.member.voiceChannel === undefined) {
													msg.channel.sendMessage("You aren't in a voice channel!")
												} else {
													if (m.member.voiceChannel.name !== guilds[msg.guild.id].voiceChannel.name) {
														m.channel.sendMessage("Wrong Voice Channel! Commands must be issued in while in **" + guilds[m.guild.id].voiceChannel.name + "** voice channel!");
													} else {
														let roles = m.member.roles.array();
														for (i = 0; i < roles.length; i++) {
															console.log(roles[i].name)
															if (!lodash.isEmpty(lodash.xor(guilds[msg.guild.id].moderators, roles[i].name)) || m.author.id == m.guild.ownerID) {
																m.channel.sendMessage('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
																setTimeout(() => {
																	m.channel.sendMessage('Song skipped!').then(() => { guilds[msg.guild.id].dispatcher.end(); });
																}, 250);
																return;
															}
														}
														if (guilds[msg.guild.id].uniqueSkips.length == 0) {
															guilds[msg.guild.id].uniqueSkips.push(m.author.id);
															m.reply("Vote processed!");

														} else if (guilds[m.guild.id].uniqueSkips.length > 0) {
															if (!guilds[m.guild.id].uniqueSkips.find((element) => { return element == m.author.id; })) {
																guilds[m.guild.id].uniqueSkips.push(m.author.id);
																m.reply('Vote processed!');
															} else {
																m.reply('You have already voted!');
															}
														}
														console.log(guilds[m.guild.id].uniqueSkips.length);
														if ((guilds[m.guild.id].uniqueSkips.length / (members - 1)) >= .5) {
															setTimeout(() => {
																m.channel.sendMessage('Song skipped!').then(() => { guilds[msg.guild.id].dispatcher.end(); });
															}, 500);
														} else {
															setTimeout(() => {
																m.channel.sendMessage((Math.round((members - 1) / 2) - guilds[msg.guild.id].uniqueSkips.length) + ' more vote' + ((Math.round((members - 1) / 2) - guilds[m.guild.id].uniqueSkips.length) > 1 ? 's' : '') + ' required! ' + guilds[m.guild.id].uniqueSkips.length + ' of ' + (members - 1) + ' members have voted!');
															}, 500);
														}
													}
												}
											}
										} else if (m.content.startsWith(tokens.prefix + 'time')) {
											if (m.channel.id !== guilds[msg.guild.id].textChannel.id) {
												m.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[m.guild.id].textChannel.name + "**!");
											} else {
												if (m.member.voiceChannel === undefined) {
													m.channel.sendMessage("You aren't in a voice channel!")
												} else {
													if (m.member.voiceChannel.name !== guilds[msg.guild.id].voiceChannel.name) {
														m.channel.sendMessage("Wrong Voice Channel! Commands must be issued in while in **" + guilds[m.guild.id].voiceChannel.name + "** voice channel!");
													} else {
														yt.getInfo(song.url, (err, info) => {
															if (err) return m.channel.sendMessage("I couldn't get the video information :(");
															m.channel.sendMessage('Song Time:  **' + (guilds[m.guild.id].dispatcher.time / 1000).toString().toHHMMSS() + '** / **' + info.length_seconds.toHHMMSS() + '**\nTime Remaining:  **' + (((info.length_seconds * 1000) - guilds[m.guild.id].dispatcher.time) / 1000).toString().toHHMMSS() + '**');
														});
													}
												}
											}
										}
									});

									guilds[msg.guild.id].dispatcher.on('end', () => {
										console.log('here we be')
										guilds[msg.guild.id].collector.stop();
										if (guilds[msg.guild.id].running) {
											guilds[msg.guild.id].uniqueSkips = [];
											play(guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray.shift() : guilds[msg.guild.id].queue.uArray.shift())
										}
									});
									guilds[msg.guild.id].dispatcher.on('error', (err) => {
										console.log('THERE WAS AN ERROR DAD PLS');
										return guilds[msg.guild.id].textChannel.sendMessage('ERROR: ' + err).then(() => {
											guilds[msg.guild.id].collector.stop();
											play(guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray.shift() : guilds[msg.guild.id].queue.uArray.shift());
										});
									});
								})(guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray[0] : guilds[msg.guild.id].queue.uArray[0]);
							}, 1500);
						}
					}
				}
			}
		}
	},
	'queue': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			init(msg);
			if (guilds[msg.guild.id].textChannel !== undefined && guilds[msg.guild.id].voiceChannel !== undefined) {
				msg.channel.sendMessage("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

				setTimeout(function () {
					if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
						console.log(commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]])
						if (commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-reset' || commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-stop') {
							msg.reply("Retrying command");
							setTimeout(function () {
								commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
							}, 250);
						}
					}
				}, 500);
			} else {
				msg.channel.sendMessage("It doesn't look like you have any voice channels! Please create one and set it as the voice channel using " + tokens.prefix + "**setvoice**!");
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!");
			} else {
				console.log(guilds[msg.guild.id].queue.uArray);
				console.log(guilds[msg.guild.id].queue.rArray);
				if (guilds[msg.guild.id].queue === undefined || (guilds[msg.guild.id].queue.rArray.length === 0 && guilds[msg.guild.id].queue.uArray.length === 0)) return msg.channel.sendMessage(`Add some songs to the queue first with ${tokens.prefix}**play**, or start the radio with ` + tokens.prefix + `**start**!`);
				let tosend = [];
				if (guilds[msg.guild.id].queue.uArray.length !== 0) {
					guilds[msg.guild.id].queue.uArray.forEach((song, i) => { tosend.push(`${i + 1}. ${song.title} - Requested by: ${song.requester}`); });
					guilds[msg.guild.id].queue.rArray.forEach((song, i) => { tosend.push(`${i + 1}. ${song.title} - Requested by: ${song.requester}`); });
				} else {
					guilds[msg.guild.id].queue.rArray.forEach((song, i) => { tosend.push(`${i + 1}. ${song.title} - Requested by: ${song.requester}`); });
				}

				msg.channel.sendMessage(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0, 15).join('\n')}\`\`\``);

			}
		}
	},
	'help': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			init(msg);
			if (guilds[msg.guild.id].textChannel !== undefined && guilds[msg.guild.id].voiceChannel !== undefined) {
				msg.channel.sendMessage("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

				setTimeout(function () {
					if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
						console.log(commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]])
						if (commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-reset' || commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-stop') {
							msg.reply("Retrying command")
							setTimeout(function () {
								commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
							}, 250);
						}
					}
				}, 500);
			} else {
				msg.channel.sendMessage("It doesn't look like you have any voice channels! Please create one and set it as the voice channel using " + tokens.prefix + "**setvoice**!");
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!");
			} else {
				let tosend = ['```diff',
					'!=================  [MUSIC BOT COMMANDS] =================!'.toUpperCase(),
					tokens.prefix + 'play     : Adds a youtube link or performs a search query (must be in music channel).',
					tokens.prefix + 'start    : Starts the music queue. (must be in music channel)',
					'',
					'!== [the following commands don\'t need a voice channel] ==!'.toUpperCase(),
					tokens.prefix + 'help     : Displays available commands.',
					tokens.prefix + 'queue    : Shows the current queue, the next 15 songs are shown.',
					'',
					'!================  [Owner/Admin Commands] ================!'.toUpperCase(),
					tokens.prefix + 'setvoice : Sets the bot\'s voice channel.',
					tokens.prefix + 'settext  : Sets the bot\'s text channel.',
					tokens.prefix + 'setmod   : Adds role name to list of trusted roles.',
					'',
					'!== [the following commands are used while music plays] ==!'.toUpperCase(),
					tokens.prefix + 'pause    : Pauses the music. (requires majority vote)',
					tokens.prefix + 'resume   : Resumes the music. (requires majority vote)',
					tokens.prefix + 'skip     : Skips the playing song. (requires majority vote)',
					tokens.prefix + 'time     : Shows the playtime of the song.',
					'!=========================================================!',
					'```'];
				msg.channel.sendMessage(tosend.join('\n'));
			}
		}
	},
	'stop': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			init(msg);
			if (guilds[msg.guild.id].textChannel !== undefined && guilds[msg.guild.id].voiceChannel !== undefined) {
				msg.channel.sendMessage("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

				setTimeout(function () {
					if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
						console.log(commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]])
						if (commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-reset' || commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-stop') {
							msg.reply("Retrying command")
							setTimeout(function () {
								commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
							}, 250);
						}
					}
				}, 500);
			} else {
				msg.channel.sendMessage("It doesn't look like you have any voice channels! Please create one and set it as the voice channel using " + tokens.prefix + "**setvoice**!");
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!");
			} else {
				console.log("Stopping!")
				stop(msg);
				delete guilds[msg.guild.id].dispatcher;
				msg.guild.voiceConnection.disconnect();
			}
		}
	},
	'radio': (msg) => {
		if (!guilds[msg.guild.id].ran) {
			console.log(guilds);
			guilds[msg.guild.id].ran = true;
			fs.readFile('playlist.txt', function (err, data) {
				if (err) console.log(err);
				var lines = data.toString().split('\n');

				lines = shuffle(lines);

				for (i = 0; i < lines.length; i++) {

					(function (i) {
						var timer = setTimeout(function () {
							if (guilds[msg.guild.id].running) {
								console.log('running ' + guilds[msg.guild.id].running);
								yt.getInfo(lines[i].toString(), (err, info) => {
									if (err) {
										console.log('Invalid YouTube Link: ' + err);
									} else {
										guilds[msg.guild.id].queue.rArray.push({ url: lines[i].toString(), title: info.title, requester: 'Radio Jesus' });
										console.log(`added **${info.title}** to the queue`);
										console.log(i);
									}
								});
							} else {
								guilds[msg.guild.id].stop = false;
								clearTimeout(timer);
								return;
							}
						}, 750 * i)
					})(i);
				}
				console.log('read successfully!');
			});
		}
	},
	'play': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			init(msg);
			if (guilds[msg.guild.id].textChannel !== undefined && guilds[msg.guild.id].voiceChannel !== undefined) {
				msg.channel.sendMessage("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

				setTimeout(function () {
					if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
						console.log(commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]])
						if (commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-reset' || commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-stop') {
							msg.reply("Retrying command")
							setTimeout(function () {
								commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
							}, 250);
						}
					}
				}, 500);
			} else {
				msg.channel.sendMessage("It doesn't look like you have any voice channels! Please create one and set it as the voice channel using " + tokens.prefix + "**setvoice**!");
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
			} else {
				if (guilds[msg.guild.id].voiceChannel === undefined) {
					msg.channel.sendMessage("You haven't set a voice channel! I can't function without one :(")
				} else {
					if (msg.member.voiceChannel === undefined) {
						msg.channel.sendMessage("You aren't in a voice channel!")
					} else {
						if (msg.member.voiceChannel.name !== guilds[msg.guild.id].voiceChannel.name) {
							msg.channel.sendMessage("Wrong Voice Channel! Are you in the Music voice channel?");
						} else {
							let term = msg.content.substring(msg.content.indexOf(' ') + 1);
							let url_id = "";
							let url_base = "https://youtu.be/";

							console.log(term);

							if (term == '' || term === undefined || term == '-play' || term == '-play ') return msg.channel.sendMessage(`You must specify a video name or URL after ${tokens.prefix}play!\n` + "```Usage: " + tokens.prefix + "play [term] [url]```");
							else {
								if ((term.charAt(0) == 'w' && term.charAt(1) == 'w' && term.charAt(2) == 'w' && term.charAt(3) == '.') || (term.charAt(0) == 'h' && term.charAt(1) == 't' && term.charAt(2) == 't' && term.charAt(3) == 'p' && (term.charAt(4) == ':' || (term.charAt(4) == 's' && term.charAt(5) == ':')))) {
									if (term.toString() !== null) {
										yt.getInfo(term.toString(), (err, info) => {
											if (err) return msg.channel.sendMessage('Invalid YouTube Link: ' + err);
											if (info.livestream === '1') return msg.channel.sendMessage('This is a livestream!');
											console.log(info);
											//if (!guilds[msg.guild.id].queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].rArray = [], queue[msg.guild.id].uArray = [];
											guilds[msg.guild.id].queue.uArray.push({ url: term, title: info.title, requester: msg.author.username });
											//queue[msg.guild.id].songs.unshift({ url: term, title: info.title, requester: msg.author.username });
											msg.channel.sendMessage(`**${info.title}** has been added to the queue!`);
										});
									}
								} else {
									yt_client.search(term, 2, function (error, result) {
										if (error) {
											console.log("Nope!");
											console.log(error);
										} else {
											console.log("Success!");
											if (result.items[0] != undefined)
												url_id = JSON.stringify(result.items[0].id.videoId, null, 2);
											if (url_id != undefined) {
												url_id = url_id.toString().substring(1, url_id.length - 1);

												console.log(url_id);

												let url_f = url_base + url_id;
												yt.getInfo(url_f, (err, info) => {
													if (err) return msg.channel.sendMessage('I couldn\'t find a video with that name!');
													if (info.livestream === '1') return msg.channel.sendMessage('This is a livestream!');
													//if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].rArray = [], queue[msg.guild.id].uArray = [];

													guilds[msg.guild.id].queue.uArray.push({ url: url_f, title: info.title, requester: msg.author.username });
													//queue[msg.guild.id].songs.unshift({ url: url_f, title: info.title, requester: msg.author.username });
													msg.channel.sendMessage(`**${info.title}** had been added to the queue!`);
												});
											}
											else
												msg.channel.sendMessage("I couldn\'t find a video with that name!");
										}
									});
								}
							}
						}
					}
				}
			}
		}
	},
	'role': (msg) => {
		console.log(msg.member.roles);
	},
	'settext': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			init(msg);
			if (guilds[msg.guild.id].textChannel !== undefined && guilds[msg.guild.id].voiceChannel !== undefined) {
				msg.channel.sendMessage("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

				setTimeout(function () {
					if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
						console.log(commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]])
						if (commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-reset' || commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-stop') {
							msg.reply("Retrying command")
							setTimeout(function () {
								commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
							}, 250);
						}
					}
				}, 500);
			} else {
				msg.channel.sendMessage("It doesn't look like you have any voice channels! Please create one and set it as the voice channel using " + tokens.prefix + "**setvoice**!");
			}
		} else {
			let channels = msg.guild.channels;
			if (msg.author.id === msg.guild.owner.id) {
				let term = msg.content.substring(msg.content.indexOf(' ') + 1);
				if (term == '-settext') {
					msg.channel.sendMessage("No text channel was provided!\n" + "```Usage: " + tokens.prefix + "settext [text channel]```");
				} else {
					if (channels.find('name', term) === null) {
						msg.reply("Couln't find a channel with that name!")
					} else {
						let toSet = channels.find('name', term);
						console.log(toSet.id);
						if (toSet.type !== 'text') {
							msg.channel.sendMessage("You must provide the name of a text channel!\n" + "```Usage: " + tokens.prefix + "settext [text channel]```");
						} else {
							msg.reply("Okay! #**" + toSet.name + "** set as music bot command channel! Please issue further commands here!");
							guilds[msg.guild.id].textChannel = toSet;
						}
					}
				}
			} else {
				msg.reply("You're not the owner :(");
			}
		}
	},
	'setvoice': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			init(msg);
			if (guilds[msg.guild.id].textChannel !== undefined && guilds[msg.guild.id].voiceChannel !== undefined) {
				msg.channel.sendMessage("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

				setTimeout(function () {
					if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
						console.log(commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]])
						if (commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-reset' || commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-stop') {
							msg.reply("Retrying command")
							setTimeout(function () {
								commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
							}, 250);
						}
					}
				}, 500);
			} else {
				msg.channel.sendMessage("It doesn't look like you have any voice channels! Please create one and set it as the voice channel using " + tokens.prefix + "**setvoice**!");
			}
		} else {
			let channels = msg.guild.channels;
			if (msg.author.id === msg.guild.owner.id) {
				let term = msg.content.substring(msg.content.indexOf(' ') + 1);
				if (term == '-setvoice') {
					msg.channel.sendMessage("No voice channel was provided!\n" + "```Usage: " + tokens.prefix + "setvoice [voice channel]```");
				} else {
					if (channels.find('name', term) === null) {
						msg.reply("Couln't find a channel with that name! The channel name is case sensitive!")
					} else {
						let toSet = channels.findAll('name', term);
						//console.log(toSet);
						for (i = 0; i < toSet.length; i++) {
							//console.log(toSet[i]);
							if (toSet[i].type === 'voice') {
								console.log(toSet[i].name + ' ' + toSet[i].id)
								msg.reply("Okay! **" + toSet[i].name + "** set as music bot voice channel! Please issue further commands while in this channel!");
								guilds[msg.guild.id].voiceChannel = toSet[i];
								setTimeout(() => {
									guilds[msg.guild.id].voiceChannel.join().then(connection => console.log('Connected!')).catch(console.error);
									if (guilds[msg.guild.id].queue.playing) {
										guilds[msg.guild.id].dispatcher.end();
									}
								}, 1000);
							}
						}
					}
				}
			} else {
				msg.reply("You're not the owner :(");
			}
		}
	},
	'setmod': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			init(msg);
			if (guilds[msg.guild.id].textChannel !== undefined && guilds[msg.guild.id].voiceChannel !== undefined) {
				msg.channel.sendMessage("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

				setTimeout(function () {
					if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) {
						console.log(commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]])
						if (commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-reset' || commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]] !== '-stop') {
							msg.reply("Retrying command")
							setTimeout(function () {
								commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
							}, 250);
						}
					}
				}, 500);
			} else {
				msg.channel.sendMessage("It doesn't look like you have any voice channels! Please create one and set it as the voice channel using " + tokens.prefix + "**setvoice**!");
			}
		} else {
			let roles = msg.guild.roles.array();
			console.log(roles);
			if (msg.author.id === '204528346049150976') {
				let term = msg.content.substring(msg.content.indexOf(' ') + 1);
				if (term == '-setmod') {
					msg.channel.sendMessage("No group name was provided!\n" + "```Usage: " + tokens.prefix + "setmod [role name]```");
				} else {
					for (i = 0; i < roles.length; i++)
					{
						if (roles[i].name === term) {
							guilds[msg.guild.id].moderators.push(roles[i].name);
							msg.channel.sendMessage(term + " found! Added to list of bot moderators!");
						}
					}
				}
			} else {
				msg.reply("You're not the owner :(");
			}
		}
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('Couldn\'t connect');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'reboot': (msg) => {
		if (msg.author.id == tokens.adminID) process.exit(); //Requires a node module like Forever to work.
	}
};

client.on('ready', () => {
	console.log('ready!');
	client.guilds.forEach(guild => {
		console.log(guild.id)
		guild[guild.id] = {};
	});
});

function init(msg) {
	guilds[msg.guild.id].textChannel = msg.guild.channels.find('name', msg.channel.name);
	if (msg.member.voiceChannel === undefined) { 
		console.log("checking channels")
		for (i = 0; i < msg.guild.channels.array().length; i++) {
			if (msg.guild.channels.array()[i].type === 'voice') {
				console.log(msg.guild.channels.array()[i].name + ' ' + msg.guild.channels.array()[i].id)
				guilds[msg.guild.id].voiceChannel = msg.guild.channels.array()[i];
				break;
			}
		}
	} else {
		guilds[msg.guild.id].voiceChannel = msg.member.voiceChannel;
	}
	guilds[msg.guild.id].queue = {};
	guilds[msg.guild.id].queue.uArray = [];
	guilds[msg.guild.id].queue.rArray = [];
	guilds[msg.guild.id].moderators = [];
	guilds[msg.guild.id].uniqueSkips = [];
	guilds[msg.guild.id].uniquePause = [];
	guilds[msg.guild.id].uniqueResume = [];
	guilds[msg.guild.id].ran = false;
	guilds[msg.guild.id].isPaused = false;
	guilds[msg.guild.id].firstRun = true;
	guilds[msg.guild.id].dispatcher;
	guilds[msg.guild.id].collector = new Discord.MessageCollector(guilds[msg.guild.id].textChannel, m => m);
	guilds[msg.guild.id].running = true;

	return;
}

function stop(msg) {
	guilds[msg.guild.id].queue = {};
	guilds[msg.guild.id].queue.uArray = [];
	guilds[msg.guild.id].queue.rArray = [];
	guilds[msg.guild.id].uniqueSkips = [];
	guilds[msg.guild.id].uniquePause = [];
	guilds[msg.guild.id].uniqueResume = [];
	guilds[msg.guild.id].ran = false;
	guilds[msg.guild.id].isPaused = false;
	guilds[msg.guild.id].firstRun = true;
	delete guilds[msg.guild.id].dispatcher;
	guilds[msg.guild.id].collector.stop();
	guilds[msg.guild.id].changeVoice = false;
	guilds[msg.guild.id].running = false;

	return;
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

String.prototype.toHHMMSS = function () {
	var sec_num = parseInt(this, 10); // don't forget the second param
	var hours = Math.floor(sec_num / 3600);
	var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	var seconds = sec_num - (hours * 3600) - (minutes * 60);

	if (hours < 10) { hours = "0" + hours; }
	if (minutes < 10) { minutes = "0" + minutes; }
	if (seconds < 10) { seconds = "0" + seconds; }
	return hours + ':' + minutes + ':' + seconds;
}

client.on('message', msg => {
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
});

client.login(tokens.d_token);