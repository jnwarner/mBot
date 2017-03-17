const Discord = require('discord.js');
const util = require('util');
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
// let queue = {};
// let songs = [];
// let uniqueSkips = [];
// let ran = false;
// let isPaused = false;
// let firstRun = true;
// let currentSong;
// let voiceChannel;
// let textChannel;



const commands = {
	'start': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			if (msg.guild.channels.find('name', 'general') === null) {
				msg.channel.sendMessage("Set a text channel with " + tokens.prefix + "settext and voice channel with " + tokens.prefix + "setvoice");
			} else {
				init(msg);
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!");
			} else {
				if (msg.member.voiceChannel === undefined) {
					msg.channel.sendMessage("You aren't in a voice channel!")
				} else {
					if (msg.member.voiceChannel.name !== guilds[msg.guild.id].voiceChannel.name) {
						msg.channel.sendMessage("Wrong Voice Channel! Are you in the Music voice channel?");
					} else {
						setTimeout(() => {
							if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.start(msg));
							if (guilds[msg.guild.id].queue.playing) return msg.channel.sendMessage('Music is already playing! Did you mean ' + tokens.prefix + '**resume**?');
							guilds[msg.guild.id].queue.playing = true;

							const voiceChannel = msg.member.voiceChannel;

							let members = voiceChannel.members.array().length;

							console.log(guilds[msg.guild.id].queue.rArray.length);

							(function play(song, seek = 0) {
								console.log(song);
								if (song === undefined) return msg.channel.sendMessage('Queue is empty').then(() => {
									guilds[msg.guild.id].queue.playing = false;
									msg.member.voiceChannel.leave();
								});
								msg.channel.sendMessage(`Playing: **${song.title}** as requested by: **${song.requester}**`);
								guilds[msg.guild.id].dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes: tokens.passes, seek: seek });
								console.log(guilds[msg.guild.id].firstRun);
								console.log(msg.channel);
								if (guilds[msg.guild.id].firstRun) {
									guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray.shift() : guilds[msg.guild.id].queue.uArray.shift();
									guilds[msg.guild.id].collector = new Discord.MessageCollector(msg.channel, m => m);
									guilds[msg.guild.id].firstRun = false;
								}
								// if (!guilds[msg.guild.id].firstRun) {

								// 	if (collector === undefined || collector === null) {
								// 		console.log('collector was undefined');
								// 		collector = new Discord.MessageCollector(msg.channel, m => m);
								// 	}
								// }
								console.log(guilds[msg.guild.id].collector);
								setInterval(() => {
									if (guilds[msg.guild.id].changeVoice) {
										guilds[msg.guild.id].collector.stop();
									}
								}, 500);
								guilds[msg.guild.id].collector.on('message', m => {
									setInterval(function () {
										members = voiceChannel.members.array().length;
										if (!guilds[m.guild.id].isPaused) {
											if (members < 2) {
												guilds[msg.guild.id].dispatcher.pause();
											} else {
												guilds[msg.guild.id].dispatcher.resume();
											}
										}
									}, 500);
									if (m.content.startsWith(tokens.prefix + 'pause')) {
										if (m.channel.id !== guilds[m.guild.id].textChannel.id) {
											m.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[m.guild.id].textChannel.name + "**!");
										} else {
											if (m.member.voiceChannel === undefined) {
												msg.channel.sendMessage("You aren't in a voice channel!")
											} else {
												if (m.member.voiceChannel.name !== guilds[m.guild.id].voiceChannel.name) {
													m.channel.sendMessage("Wrong Voice Channel! Are you in the Music voice channel?");
												} else {
													m.channel.sendMessage('paused').then(() => { guilds[msg.guild.id].dispatcher.pause(); });
													guilds[m.guild.id].isPaused = true;
												}
											}
										}
									} else if (m.content.startsWith(tokens.prefix + 'resume')) {
										if (m.channel.id !== guilds[m.guild.id].textChannel.id) {
											m.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[m.guild.id].textChannel.name + "**!");
										} else {
											if (m.member.voiceChannel === undefined) {
												msg.channel.sendMessage("You aren't in a voice channel!")
											} else {
												if (m.member.voiceChannel.name !== guilds[m.guild.id].voiceChannel.name) {
													m.channel.sendMessage("Wrong Voice Channel! Are you in the Music voice channel?");
												} else {
													m.channel.sendMessage('resumed').then(() => { guilds[msg.guild.id].dispatcher.resume(); });
													guilds[m.guild.id].isPaused = false;
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
													m.channel.sendMessage("Wrong Voice Channel! Are you in the Music voice channel?");
												} else {
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
															m.channel.sendMessage('Song skipped!').then(() => { dispatcher.end(); });
															guilds[m.guild.id].uniqueSkips = [];
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
													m.channel.sendMessage("Wrong Voice Channel! Are you in the Music voice channel?");
												} else {
													msg.channel.sendMessage(guilds[msg.guild.id].dispatcher.time);
													msg.channel.sendMessage(`time: ${Math.floor(guilds[msg.guild.id].dispatcher.time / 60000)}:${Math.floor((guilds[msg.guild.id].dispatcher.time % 60000) / 1000) < 10 ? '0' + Math.floor((guilds[msg.guild.id].dispatcher.time % 60000) / 1000) : Math.floor((guilds[msg.guild.id].dispatcher.time % 60000) / 1000)}`);
												}
											}
										}
									}
								});
								guilds[msg.guild.id].dispatcher.on('end', () => {
									console.log('here we be')
									guilds[msg.guild.id].collector.stop();
									play(guilds[msg.guild.id].queue.uArray.length === 0 ? guilds[msg.guild.id].queue.rArray.shift() : guilds[msg.guild.id].queue.uArray.shift())
									//play(queue[msg.guild.id].songs.shift());
								});
								guilds[msg.guild.id].dispatcher.on('error', (err) => {
									return msg.channel.sendMessage('error: ' + err).then(() => {
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
	},
	'queue': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			if (msg.guild.channels.find('name', 'general') === null) {
				msg.channel.sendMessage("Set a text channel with " + tokens.prefix + "settext and voice channel with " + tokens.prefix + "setvoice");
			} else {
				init(msg);
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!");
			} else {
				if (guilds[msg.guild.id].queue === undefined) return msg.channel.sendMessage(`Add some songs to the queue first with ${tokens.prefix}play`);
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
			if (msg.guild.channels.find('name', 'general') === null) {
				msg.channel.sendMessage("Set a text channel with " + tokens.prefix + "settext and voice channel with " + tokens.prefix + "setvoice");
			} else {
				init(msg);
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!");
			} else {
				if (msg.member.voiceChannel === undefined) {
					msg.channel.sendMessage("You aren't in a voice channel!")
				} else {
					if (msg.member.voiceChannel === undefined) {
						msg.channel.sendMessage("You aren't in a voice channel!")
					} else {
						let tosend = ['```diff',
							'!=================  [MUSIC BOT COMMANDS] =================!'.toUpperCase(),
							tokens.prefix + 'play    : Adds a youtube link or performs a search query.',
							tokens.prefix + 'queue  : Shows the current queue, the next 15 songs are shown.',
							tokens.prefix + 'start   : Starts the music queue. (must be in music channel)',
							tokens.prefix + 'help   : Displays available commands.',
							'',
							'!== [the following commands are used while music plays] ==!'.toUpperCase(),
							tokens.prefix + 'pause  : Pauses the music. (admins only)',
							tokens.prefix + 'resume : Resumes the music. (admins only)',
							tokens.prefix + 'skip   : Skips the playing song. (requires majority vote)',
							tokens.prefix + 'time   : Shows the playtime of the song.',
							'!=========================================================!',
							'```'];
						msg.channel.sendMessage(tosend.join('\n'));
					}
				}
			}
		}
	},
	'stop': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			if (msg.guild.channels.find('name', 'general') === null) {
				msg.channel.sendMessage("Set a text channel with " + tokens.prefix + "settext and voice channel with " + tokens.prefix + "setvoice");
			} else {
				init(msg);
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in #**" + guilds[msg.guild.id].textChannel.name + "**!");
			} else {
				console.log("Stopping!")
				guilds[msg.guild.id].queue = {};
				guilds[msg.guild.id].queue.uArray = [];
				guilds[msg.guild.id].queue.rArray = [];
				guilds[msg.guild.id].uniqueSkips = [];
				guilds[msg.guild.id].collector;
				guilds[msg.guild.id].ran = false;
				guilds[msg.guild.id].isPaused = false;
				guilds[msg.guild.id].firstRun = true;
				guilds[msg.guild.id].changeVoice = false;
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
				//if (!guilds[msg.guild.id].queue.hasOwnProperty(msg.guild.id)) guilds[msg.guild.id].queue = {}, guilds[msg.guild.id].queue.playing = false, guilds[msg.guild.id].queue.rArray = [], guilds[msg.guild.id].queue.uArray = [];

				lines = shuffle(lines);

				for (i = 0; i < lines.length; i++) {
					(function (i) {
						setTimeout(function () {
							yt.getInfo(lines[i].toString(), (err, info) => {
								if (err) {
									console.log('Invalid YouTube Link: ' + err);
								} else {
									guilds[msg.guild.id].queue.rArray.push({ url: lines[i].toString(), title: info.title, requester: msg.author.username });
									console.log(`added **${info.title}** to the queue`);
									console.log(i);
								}
							});
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
			if (msg.guild.channels.find('name', 'general') === null) {
				msg.channel.sendMessage("Set a text channel with " + tokens.prefix + "settext and voice channel with " + tokens.prefix + "setvoice");
			} else {
				init(msg);
			}
		} else {
			if (msg.channel.id !== guilds[msg.guild.id].textChannel.id) {
				msg.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
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
	},
	'settext': (msg) => {
		if (!guilds[msg.guild.id]) {
			guilds[msg.guild.id] = {};
			if (msg.guild.channels.find('name', 'general') === null) {
				msg.channel.sendMessage("Set a text channel with " + tokens.prefix + "settext and voice channel with " + tokens.prefix + "setvoice");
			} else {
				guilds[msg.guild.id].textChannel = msg.guild.channels.find('name', 'general');
				guilds[msg.guild.id].voiceChannel = msg.guild.channels.find('name', 'General');
				guilds[msg.guild.id].queue = {};
				guilds[msg.guild.id].queue.uArray = [];
				guilds[msg.guild.id].queue.rArray = [];
				guilds[msg.guild.id].uniqueSkips = [];
				guilds[msg.guild.id].collector;
				guilds[msg.guild.id].ran = false;
				guilds[msg.guild.id].isPaused = false;
				guilds[msg.guild.id].firstRun = true;
				guilds[msg.guild.id].changeVoice = false;
				commands.radio(msg);
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
								guilds[msg.guild.id].collector = new new Discord.MessageCollector(toSet.channel, m => m);
							}
						}
					}
				} else {
					msg.reply("You're not the owner :(");
				}
				msg.channel.sendMessage("Hi! I set the text channel to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");
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
							guilds[msg.guild.id].changeVoice = true;
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
			if (msg.guild.channels.find('name', 'general') === null) {
				msg.channel.sendMessage("Set a text channel with " + tokens.prefix + "settext and voice channel with " + tokens.prefix + "setvoice");
			} else {
				guilds[msg.guild.id].textChannel = msg.guild.channels.find('name', 'general');
				guilds[msg.guild.id].voiceChannel = msg.guild.channels.find('name', 'General');
				guilds[msg.guild.id].queue = {};
				guilds[msg.guild.id].queue.uArray = [];
				guilds[msg.guild.id].queue.rArray = [];
				guilds[msg.guild.id].uniqueSkips = [];
				guilds[msg.guild.id].collector;
				guilds[msg.guild.id].ran = false;
				guilds[msg.guild.id].isPaused = false;
				guilds[msg.guild.id].firstRun = true;
				guilds[msg.guild.id].changeVoice = false;
				commands.radio(msg);
				let channels = msg.guild.channels;
				if (msg.author.id === msg.guild.owner.id) {
					let term = msg.content.substring(msg.content.indexOf(' ') + 1);
					if (term == '-setvoice') {
						msg.channel.sendMessage("No voice channel was provided!\n" + "```Usage: " + tokens.prefix + "setvoice [voice channel]```");
					} else {
						if (channels.find('name', term) === null) {
							msg.reply("Couln't find a channel with that name! Setting to default voice channel!")
						} else {
							let toSet = channels.findAll('name', term);
							//console.log(toSet);
							for (i = 0; i < toSet.length; i++) {
								//console.log(toSet[i]);
								if (toSet[i].type === 'voice') {
									console.log(toSet[i].name + ' ' + toSet[i].id)
									guilds[msg.guild.id].voiceChannel = toSet[i];
									setTimeout(() => {
										guilds[msg.guild.id].voiceChannel.join().then(connection => console.log('Connected!')).catch(console.error);
										commands.start();
									}, 50);
								}
							}
						}
					}
				} else {
					msg.reply("You're not the owner :(");
				}
				setTimeout(() => {
					msg.channel.sendMessage("Hi! I set the text channel to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and a voice channel with " + tokens.prefix + "**setvoice**!");
				}, 500);
			}
		} else {
			let channels = msg.guild.channels;
			if (msg.author.id === msg.guild.owner.id) {
				let term = msg.content.substring(msg.content.indexOf(' ') + 1);
				if (term == '-setvoice') {
					msg.channel.sendMessage("No voice channel was provided!\n" + "```Usage: " + tokens.prefix + "setvoice [voice channel]```");
				} else {
					if (channels.find('name', term) === null) {
						msg.reply("Couln't find a channel with that name!")
					} else {
						let toSet = channels.findAll('name', term);
						//console.log(toSet);
						for (i = 0; i < toSet.length; i++) {
							//console.log(toSet[i]);
							if (toSet[i].type === 'voice') {
								console.log(toSet[i].name + ' ' + toSet[i].id)
								msg.reply("Okay! **" + toSet[i].name + "** set as music bot voice channel! Please issue further commands while in this channel!");
								guilds[msg.guild.id].voiceChannel = toSet[i];
								guilds[msg.guild.id].queue.playing = false;
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
	guilds[msg.guild.id].textChannel = msg.guild.channels.find('name', 'general');
	guilds[msg.guild.id].voiceChannel = msg.guild.channels.find('name', 'General');
	guilds[msg.guild.id].queue = {};
	guilds[msg.guild.id].queue.uArray = [];
	guilds[msg.guild.id].queue.rArray = [];
	guilds[msg.guild.id].uniqueSkips = [];
	guilds[msg.guild.id].ran = false;
	guilds[msg.guild.id].isPaused = false;
	guilds[msg.guild.id].firstRun = true;
	guilds[msg.guild.id].dispatcher;
	guilds[msg.guild.id].collector;
	guilds[msg.guild.id].changeVoice = false;
	commands.radio(msg);
	msg.channel.sendMessage("Hi! Since this is the first run I set the channels by default to #**" + guilds[msg.guild.id].textChannel.name + "** for bot commands, and **" + guilds[msg.guild.id].voiceChannel.name + "** for audio!\nSet a text channel with " + tokens.prefix + "**settext** and voice channel with " + tokens.prefix + "**setvoice**");

	return;
}

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		console.log(currentIndex);

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

client.on('message', msg => {
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
});

client.login(tokens.d_token);