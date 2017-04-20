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

const commands = {
	'start': (msg) => {
		if (!guilds[msg.guild.id] || guilds[msg.guild.id].textChannel.name === undefined || guilds[msg.guild.id].voiceChannel.name === undefined) {
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
								if (!msg.guild.voiceConnection) return commands.join(guilds[msg.guild.id].voiceChannel).then(() => commands.start(msg));
								if (guilds[msg.guild.id].queue.playing) return msg.channel.sendMessage('Music is already playing!')
								guilds[msg.guild.id].queue.playing = true;

								(function play(song, seek = 0) {
									console.log(song);
									if (song === undefined) return msg.channel.sendMessage('Queue is empty').then(() => {
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
										setInterval(function () {
											var voiceChannel = guilds[msg.guild.id].voiceChannel;
											if (guilds[msg.guild.id].running) {
												members = voiceChannel.members.array().length;
												//console.log('members: ' + members);
												if (guilds[msg.guild.id].collector.channel !== guilds[msg.guild.id].textChannel) {
													console.log('-----Setting channel!-----');
													guilds[msg.guild.id].collector.channel = guilds[msg.guild.id].textChannel;
													console.log(guilds[msg.guild.id].collector);
												}
												if (guilds[msg.guild.id].clientUser !== undefined) {

													if (guilds[msg.guild.id].voiceChannel !== guilds[msg.guild.id].clientUser.voiceChannel) {
														guilds[msg.guild.id].voiceChannel = guilds[msg.guild.id].clientUser.voiceChannel;
														writeDB()
													}
												} if (guilds[msg.guild.id].clientUser === undefined) {
													commands.join(guilds[msg.guild.id].voiceChannel)
												} if (guilds[msg.guild.id].dispatcher === undefined) {
													var lastMessageID = guilds[msg.guild.id].textChannel.lastMessageID
													console.log(lastMessageID)
													guilds[msg.guild.id].textChannel.fetchMessage(lastMessageID).then(msg => {
														commands.join(guilds[msg.guild.id].voiceChannel)
														setTimeout(() => {
															commands.start(msg)
														}, 1000)
													})
												}
												if (!guilds[msg.guild.id].isPaused) {
													if (members < 2) {
														guilds[msg.guild.id].dispatcher.pause();
													} else {
														guilds[msg.guild.id].dispatcher.resume();
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
															for (j = 0; j < guilds[m.guild.id].moderators.length; j++) {
																if (roles[i].name === guilds[m.guild.id].moderators[j] || m.author.id == m.guild.ownerID) {
																	m.channel.sendMessage('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
																	setTimeout(() => {
																		m.channel.sendMessage('Music Paused! Resume with ' + tokens.prefix + '**resume**').then(() => { guilds[msg.guild.id].dispatcher.pause(); });
																		guilds[m.guild.id].isPaused = true;
																		guilds[m.guild.id].uniquePause = [];
																	}, 250);
																	return;
																}
															}
														}
														if (m.author.id === tokens.adminID) {
															m.channel.sendMessage("**DEV DADDY " + m.author.username.toUpperCase() + " TRUMPS ALL**");
															setTimeout(() => {
																m.channel.sendMessage('Music Paused! Resume with ' + tokens.prefix + '**resume**').then(() => { guilds[msg.guild.id].dispatcher.pause(); });
																guilds[m.guild.id].isPaused = true;
																guilds[m.guild.id].uniquePause = [];
															}, 250);
															return;
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
															for (j = 0; j < guilds[m.guild.id].moderators.length; j++) {
																if (roles[i].name === guilds[m.guild.id].moderators[j] || m.author.id == m.guild.ownerID) {
																	m.channel.sendMessage('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
																	setTimeout(() => {
																		m.channel.sendMessage('Music Resumed! Pause with ' + tokens.prefix + '**pause**').then(() => { guilds[msg.guild.id].dispatcher.resume(); });
																		guilds[m.guild.id].isPaused = false;
																		guilds[m.guild.id].uniqueResume = [];
																	}, 250);
																	return;
																}
															}
														}
														if (m.author.id === tokens.adminID) {
															m.channel.sendMessage("**DEV DADDY " + m.author.username.toUpperCase() + " TRUMPS ALL**");
															setTimeout(() => {
																m.channel.sendMessage('Music Resumed! Pause with ' + tokens.prefix + '**pause**').then(() => { guilds[msg.guild.id].dispatcher.resume(); });
																guilds[m.guild.id].isPaused = false;
																guilds[m.guild.id].uniqueResume = [];
															}, 250);
															return;
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
															for (j = 0; j < guilds[m.guild.id].moderators.length; j++) {
																if (roles[i].name === guilds[m.guild.id].moderators[j] || m.author.id == m.guild.ownerID) {
																	m.channel.sendMessage('**' + m.author.username.toUpperCase() + " TRUMPS ALL**");
																	setTimeout(() => {
																		m.channel.sendMessage('Song skipped!').then(() => { guilds[msg.guild.id].dispatcher.end(); });
																	}, 250);
																	return;
																}
															}
														}
														if (m.author.id === tokens.adminID) {
															m.channel.sendMessage("**DEV DADDY " + m.author.username.toUpperCase() + " TRUMPS ALL**");
															setTimeout(() => {
																m.channel.sendMessage('Song skipped!').then(() => { guilds[msg.guild.id].dispatcher.end(); });
															}, 250);
															return;
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
										} else if (m.content.startsWith(tokens.prefix + 'song')) {
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
															m.channel.sendMessage('Current Song: **' + info.title + '**\nRequested By: **' + song.requester + '**\nSong Time:  **' + (guilds[m.guild.id].dispatcher.time / 1000).toString().toHHMMSS() + '** / **' + info.length_seconds.toHHMMSS() + '**\nTime Remaining:  **' + (((info.length_seconds * 1000) - guilds[m.guild.id].dispatcher.time) / 1000).toString().toHHMMSS() + '**\nWatch Link: ' + song.url);
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
											guilds[msg.guild.id].uniquePause = [];
											guilds[msg.guild.id].uniqueResume = [];
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
							}, 2000);
						}
					}
				}
			}
		}
	},
	'list': (msg) => {
		if (!guilds[msg.guild.id] || guilds[msg.guild.id].textChannel === undefined || guilds[msg.guild.id].voiceChannel === undefined) {
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
				if (guilds[msg.guild.id].queue === undefined || (guilds[msg.guild.id].queue.rArray.length === 0 && guilds[msg.guild.id].queue.uArray.length === 0)) return msg.channel.sendMessage(`Add some songs to the queue first with ${tokens.prefix}**play**, or start the radio with ` + tokens.prefix + `**start**!`);
				let tosend = [];
				if (guilds[msg.guild.id].queue.uArray.length !== 0) {
					tosend.push(`--------------- [ USER QUEUE ] ---------------`)
					guilds[msg.guild.id].queue.uArray.forEach((song, i) => { tosend.push(`${i + 1}. ${song.title} - Requested by: ${song.requester}`); });
					tosend.push(`-------------- [ RADIO QUEUE ] --------------`)
					guilds[msg.guild.id].queue.rArray.forEach((song, i) => { tosend.push(`${(guilds[msg.guild.id].queue.uArray.length) + i + 1}. ${song.title} - Requested by: ${song.requester}`); });

					msg.channel.sendMessage(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0, 17).join('\n')}\`\`\``);
				} else {
					tosend.push(`-------------- [ RADIO QUEUE ] --------------`)
					guilds[msg.guild.id].queue.rArray.forEach((song, i) => { tosend.push(`${i + 1}. ${song.title} - Requested by: ${song.requester}`); });

					msg.channel.sendMessage(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`diff\n${tosend.slice(0, 16).join('\n')}\`\`\``);
				}
			}
		}
	},
	'help': (msg) => {
		if (!guilds[msg.guild.id] || guilds[msg.guild.id].textChannel === undefined || guilds[msg.guild.id].voiceChannel === undefined) {
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
					tokens.prefix + 'play      : Adds a youtube video to the queue (must be in music channel).',
					tokens.prefix + 'addlist   : Adds a youtube playlist to the queue (must be playlist ID)',
					tokens.prefix + 'start     : Starts the music queue. (bot will attempt this on ready)',
					'',
					'!== [the following commands don\'t need a voice channel] ==!'.toUpperCase(),
					tokens.prefix + 'help      : Displays available commands.',
					tokens.prefix + 'list      : Shows the current queue, the next 15 songs are shown.',
					'',
					'!== [the following commands are used while music plays] ==!'.toUpperCase(),
					tokens.prefix + 'pause     : Pauses the music. (requires majority vote)',
					tokens.prefix + 'resume    : Resumes the music. (requires majority vote)',
					tokens.prefix + 'skip      : Skips the playing song. (requires majority vote)',
					tokens.prefix + 'song      : Shows information about the current song.',
					'',
					'!===================  [Owner Commands] ===================!'.toUpperCase(),
					tokens.prefix + 'setvoice  : Sets the bot\'s voice channel.',
					tokens.prefix + 'settext   : Sets the bot\'s text channel.',
					tokens.prefix + 'addmod    : Adds role name to list of trusted roles.',
					tokens.prefix + 'removemod : Removes role name from list of trusted roles.',
					tokens.prefix + 'listmod   : Displays currently added roles.',
					'',
					'!=================  [Moderator Commands] =================!'.toUpperCase(),
					tokens.prefix + 'remove    : Removes song from queue.',
					tokens.prefix + 'pause     : Pauses the music. (can bypass vote)',
					tokens.prefix + 'resume    : Resumes the music. (can bypass vote)',
					tokens.prefix + 'skip      : Skips the playing song. (can bypass vote)',
					// '',
					// '!=====================  [Extra Info] =====================!'.toUpperCase(),
					// '',
					'!=========================================================!',
					'```'];
				msg.channel.sendMessage(tosend.join('\n'));
			}
		}
	},
	'stop': (msg) => {
		if (!guilds[msg.guild.id] || guilds[msg.guild.id].textChannel === undefined || guilds[msg.guild.id].voiceChannel === undefined) {
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
		if (guilds[msg.guild.id] || guilds[msg.guild.id].textChannel !== undefined || guilds[msg.guild.id].voiceChannel !== undefined) {
			guilds[msg.guild.id].ran = true;
			fs.readFile('playlist.txt', function (err, data) {
				if (err) console.log(err);
				var lines = data.toString().split('\n');

				lines = shuffle(lines);

				for (i = 0; i < lines.length; i++) {

					(function (i) {
						var timer = setTimeout(function () {
							if (guilds[msg.guild.id].running) {
								//console.log('running ' + guilds[msg.guild.id].running);
								yt.getInfo(lines[i].toString(), (err, info) => {
									if (err) {
										console.log('Invalid YouTube Link: ' + err);
									} else {
										guilds[msg.guild.id].queue.rArray.push({ url: lines[i].toString(), title: info.title, requester: 'Radio Jesus' });
										//console.log(`added **${info.title}** to the queue`);
										//console.log(i);
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
	'addlist': (msg) => {
		if (!guilds[msg.guild.id] || guilds[msg.guild.id].textChannel === undefined || guilds[msg.guild.id].voiceChannel === undefined) {
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
							}, 250)
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

							if (term == '' || term === undefined || term == '-addlist' || term == '-addlist ') return msg.channel.sendMessage(`You must specify a playlist ID after ${tokens.prefix}**addlist**!\n` + "```Usage: " + tokens.prefix + "addlist [playlist ID]```")

							msg.channel.sendMessage("Attempting to get playlist content!")
							var playlist = []

							setTimeout(() => {

								getPlist(term, null, playlist, function (playlist) {
									if (playlist === null) return msg.channel.sendMessage("Invalid Playlist ID! I need the string of characters as shown between the brackets!```youtube.com/playlist?list=[Playlist ID]```")
									playlist = shuffle(playlist)
									msg.channel.sendMessage("Got it! Adding **" + Object.keys(playlist).length + "** videos from **" + playlist[0].snippet.channelTitle + "**'s playlist!")
									for (i = (Object.keys(playlist).length - 1); i >= 0; i--) {
										(function (i) {
											var tmr = setTimeout(function () {
												console.log(i)
												if (playlist[i] !== undefined) {
													console.log(playlist[i].snippet.resourceId.videoId)

													yt.getInfo(('https://youtu.be/' + playlist[i].snippet.resourceId.videoId), (err, info) => {
														if (err) console.log('Invalid YouTube Link: ' + err);
														else {
															if (info.livestream === '1') return msg.channel.sendMessage('This is a livestream!');
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
					}
				}
			}
		}
	},
	'p': (msg) => {
		if (!guilds[msg.guild.id] || guilds[msg.guild.id].textChannel === undefined || guilds[msg.guild.id].voiceChannel === undefined) {
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
			commands.play(msg)
		}
	},
	'play': (msg) => {
		if (!guilds[msg.guild.id] || guilds[msg.guild.id].textChannel === undefined || guilds[msg.guild.id].voiceChannel === undefined) {
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
													if (err) return msg.channel.sendMessage('I couldn\'t find a video with that name!');
													if (info.livestream === '1') return msg.channel.sendMessage('This is a livestream!');
													//if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [], queue[msg.guild.id].rArray = [], queue[msg.guild.id].uArray = [];

													guilds[msg.guild.id].queue.uArray.push({ url: url_f, title: info.title, requester: msg.author.username });
													//queue[msg.guild.id].songs.unshift({ url: url_f, title: info.title, requester: msg.author.username });
													msg.channel.sendMessage(`**${info.title}** has been added to the queue!`);
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
	'remove': (msg) => {
		if (!guilds[msg.guild.id] || guilds[msg.guild.id].textChannel === undefined || guilds[msg.guild.id].voiceChannel === undefined) {
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

							console.log(term);

							if (term == '' || term === undefined || term == '-remove' || term == '-remove ') return msg.channel.sendMessage(`You must specify an index after ${tokens.prefix}**remove**!\n` + "```Usage: " + tokens.prefix + "remove [index of song in queue]```");
							else {
								num = parseInt(term)
								if (num === NaN) {
									return msg.channel.sendMessage("I couldn't find a number in your message! Try again, with an index in the queue!")
								} else {
									if (guilds[msg.guild.id].queue.uArray.length >= 0 && guilds[msg.guild.id].queue.rArray.length >= 0) {
										if (num > 0 && num <= (guilds[msg.guild.id].queue.uArray.length + guilds[msg.guild.id].queue.rArray.length)) {
											if (num > 0 && num <= guilds[msg.guild.id].queue.uArray.length) {
												let roles = msg.member.roles.array();
												for (i = 0; i < roles.length; i++) {
													console.log(roles[i].name)
													for (j = 0; j < guilds[msg.guild.id].moderators.length; j++) {
														if (roles[i].name === guilds[msg.guild.id].moderators[j]) {
															msg.channel.sendMessage("Removing **" + guilds[msg.guild.id].queue.uArray[num - 1].title + "** from the queue! Sorry **" + guilds[msg.guild.id].queue.uArray[num - 1].requester + "**!")
															guilds[msg.guild.id].queue.uArray.splice((num - 1), 1)
															return
														}
													}
												}
												if (msg.author.id == msg.guild.ownerID || msg.author.id == tokens.adminID) {
													msg.channel.sendMessage("Removing **" + guilds[msg.guild.id].queue.uArray[num - 1].title + "** from the queue! Sorry **" + guilds[msg.guild.id].queue.uArray[num - 1].requester + "**!")
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
															msg.channel.sendMessage("Removing **" + guilds[msg.guild.id].queue.rArray[toRemove].title + "** from the queue! Sorry **" + guilds[msg.guild.id].queue.rArray[toRemove].requester + "**!")
															guilds[msg.guild.id].queue.rArray.splice(toRemove, 1)
															return
														}
													}
												}
												if (msg.author.id == msg.guild.ownerID || msg.author.id == tokens.adminID) {
													msg.channel.sendMessage("Removing **" + guilds[msg.guild.id].queue.rArray[toRemove].title + "** from the queue! Sorry **" + guilds[msg.guild.id].queue.rArray[toRemove].requester + "**!")
													guilds[msg.guild.id].queue.rArray.splice(toRemove, 1)
													return
												}
											}
										} else {
											msg.channel.sendMessage("There isn't a song at that index!")
										}
									} else {
										msg.channel.sendMessage("The queue is empty!")
									}
								}
							}
						}
					}
				}
			}
		}
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
			if (msg.author.id === msg.guild.owner.id || msg.author.id === tokens.adminID) {
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
							writeDB()
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
			if (msg.author.id === msg.guild.owner.id || msg.author.id === tokens.adminID) {
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
								writeDB()
								setTimeout(() => {
									guilds[msg.guild.id].voiceChannel.join().then(connection => console.log('Connected!')).catch(console.error);
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
	'addmod': (msg) => {
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
			if (msg.author.id === tokens.adminID || msg.author.id === msg.guild.owner.id) {
				let term = msg.content.substring(msg.content.indexOf(' ') + 1);
				if (term == '-setmod') {
					msg.channel.sendMessage("No group name was provided!\n" + "```Usage: " + tokens.prefix + "setmod [role name]```");
				} else {
					for (i = 0; i < roles.length; i++) {
						if (roles[i].name.toUpperCase() === term.toUpperCase()) {
							guilds[msg.guild.id].moderators.push(roles[i].name);
							writeDB()
							msg.channel.sendMessage("**" + roles[i].name + "** found! Added to list of bot moderators!");
						}
					}
				}
			} else {
				msg.reply("You're not the owner :(");
			}
		}
	},
	'removemod': (msg) => {
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
			if (msg.author.id === tokens.adminID || msg.author.id === msg.guild.owner.id) {
				let term = msg.content.substring(msg.content.indexOf(' ') + 1);
				if (term == '-removemod' || term == '-removemod ' || term == undefined || term == ' ') {
					msg.channel.sendMessage("No group name was provided!\n" + "```Usage: " + tokens.prefix + "setmod [role name]```");
				} else {
					for (i = 0; i < roles.length; i++) {
						if (roles[i].name.toUpperCase() === term.toUpperCase()) {
							var index = guilds[msg.guild.id].moderators.indexOf(term)
							guilds[msg.guild.id].moderators.splice(index, 1);
							writeDB()
							msg.channel.sendMessage("**" + roles[i].name + "** found! Removed from the list of bot moderators!");
						}
					}
				}
			} else {
				msg.reply("You're not the owner :(");
			}
		}
	},
	'listmod': (msg) => {
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
			if (msg.author.id === tokens.adminID || msg.author.id === msg.guild.owner.id) {
				let mods = []
				for (i = 0; i < guilds[msg.guild.id].moderators.length; i++) {
					mods.push(guilds[msg.guild.id].moderators[i])
				}
				msg.channel.sendMessage(`**${msg.guild.name}**'s List of Moderators:\n\`\`\`diff\n${mods.join('\n')}\`\`\``);
			} else {
				msg.reply("You're not the owner :(");
			}
		}
	},
	'join': (voiceChannel) => {
		return new Promise((resolve, reject) => {
			if (!voiceChannel || voiceChannel.type !== 'voice' || !voiceChannel.joinable) return msg.reply('I couldn\'t connect! Is your voice channel private?');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'reboot': (msg) => {
		if (msg.author.id == tokens.adminID) process.exit(); //Requires a node module like Forever to work.
	},
	'log': () => {
		writeDB();
	},
	'rlog': () => {
		readDB();
	}
};

client.on('ready', () => {
	console.log('ready!');
	client.user.setGame('bit.ly/2nsKXCg | ' + tokens.prefix + 'help')
	client.guilds.forEach(guild => {
		setTimeout(() => {
			console.log(guild.id)
			readDB(guild);
		}, 250)
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
	guilds[msg.guild.id].uniqueRemove = []
	guilds[msg.guild.id].ran = false;
	guilds[msg.guild.id].isPaused = false;
	guilds[msg.guild.id].firstRun = true;
	guilds[msg.guild.id].dispatcher;
	guilds[msg.guild.id].collector = new Discord.MessageCollector(guilds[msg.guild.id].textChannel, m => m);
	guilds[msg.guild.id].running = true;

	writeDB();

	return;
}

function writeDB() {
	let dbName = "db.json";
	let toLog = {};
	console.log('trying the bullshit');
	for (var i = 0; i < Object.keys(guilds).length; i++) {
		console.log(Object.keys(guilds[Object.keys(guilds)[i]]).length)
		if (Object.keys(guilds[Object.keys(guilds)[i]]).length > 3) {
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
		if (err) console.log("OH SHIT NO");
		else console.log("i did it");
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
			if (data !== undefined && data !== '') {
				console.log("parsing")
				obj = JSON.parse(data);
				guilds[guild.id].textChannel = {}
				guilds[guild.id].voiceChannel = {}
				guilds[guild.id].moderators = []
				for (i = 0; i < Object.keys(obj).length; i++) {
					//console.log(Object.keys(obj)[i])
					//console.log(guild.id)
					if (Object.keys(obj)[i] === guild.id && obj[Object.keys(obj)[i]].textChannel.id !== undefined) {
						//console.log("Text channel to add " + obj[Object.keys(obj)[i]].textChannel.id)
						//console.log("Voice channel to add " + obj[Object.keys(obj)[i]].voiceChannel.id)
						guilds[guild.id].textChannel = guildChannels.find('id', obj[Object.keys(obj)[i]].textChannel.id)
						guilds[guild.id].voiceChannel = guildChannels.find('id', obj[Object.keys(obj)[i]].voiceChannel.id)
						guilds[guild.id].moderators = obj[Object.keys(obj)[i]].moderators
						guilds[guild.id].queue = {};
						guilds[guild.id].queue.uArray = [];
						guilds[guild.id].queue.rArray = [];
						guilds[guild.id].uniqueSkips = [];
						guilds[guild.id].uniquePause = [];
						guilds[guild.id].uniqueResume = [];
						guilds[guild.id].uniqueRemove = []
						guilds[guild.id].ran = false;
						guilds[guild.id].isPaused = false;
						guilds[guild.id].firstRun = true;
						guilds[guild.id].running = true;
						guilds[guild.id].collector = new Discord.MessageCollector(guilds[guild.id].textChannel, m => m);

						guilds[guild.id].textChannel.sendMessage("Sorry, I had to take a break! Attempting to restart music in **" + guilds[guild.id].voiceChannel.name + "**!")

						setTimeout(() => {
							var lastMessageID = guilds[guild.id].textChannel.lastMessageID
							console.log(lastMessageID)
							guilds[guild.id].textChannel.fetchMessage(lastMessageID).then(msg => {
								commands.join(guilds[guild.id].voiceChannel)
								setTimeout(() => {
									commands.start(msg)
								}, 1000)
							})
						}, 3000)
					}
				}
			} else console.log("nothing to parse")
		}
	})
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

client.login(tokens.b_token);