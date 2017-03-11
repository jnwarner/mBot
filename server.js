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

let queue = {};
let songs = [];
let uniqueSkips = [];
let ran = false;
let isPaused = false;



const commands = {
	'start': (msg) => {
		if (msg.channel.id !== '289634319591407617') {
			msg.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
		} else {
			if (msg.member.voiceChannel.name.toLowerCase() !== 'music') {
				msg.channel.sendMessage("Wrong Voice Channel! User must be in the music voice channel!");
			} else {
				commands.radio(msg);
				setTimeout(() => {
					if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Add some songs to the queue first with ${tokens.prefix}add`);
					if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.start(msg));
					if (queue[msg.guild.id].playing) return msg.channel.sendMessage('Music is already playing!');
					let dispatcher;
					queue[msg.guild.id].playing = true;

					const voiceChannel = msg.member.voiceChannel;

					let members = voiceChannel.members.array().length;

					(function play(song) {
						console.log(song);
						if (song === undefined) return msg.channel.sendMessage('Queue is empty').then(() => {
							queue[msg.guild.id].playing = false;
							msg.member.voiceChannel.leave();
						});
						msg.channel.sendMessage(`Playing: **${song.title}** as requested by: **${song.requester}**`);
						dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes: tokens.passes });
						let collector = msg.channel.createCollector(m => m);
						queue[msg.guild.id].songs.shift();
						collector.on('message', m => {
							setInterval(function () {
								members = voiceChannel.members.array().length;
								if (!isPaused) {
									if (members < 2) {
										dispatcher.pause();
									} else {
										dispatcher.resume();
									}
								}
							}, 500);
							if (m.content.startsWith(tokens.prefix + 'pause')) {
								if (m.channel.id !== '289634319591407617') {
									m.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
								} else {
									if (m.member.voiceChannel.name.toLowerCase() !== 'music') {
										m.channel.sendMessage("Wrong Voice Channel! User must be in the music voice channel!");
									} else {
										m.channel.sendMessage('paused').then(() => { dispatcher.pause(); });
										isPaused = true;
									}
								}
							} else if (m.content.startsWith(tokens.prefix + 'resume')) {
								if (m.channel.id !== '289634319591407617') {
									m.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
								} else {
									if (m.member.voiceChannel.name.toLowerCase() !== 'music') {
										m.channel.sendMessage("Wrong Voice Channel! User must be in the music voice channel!");
									} else {
										m.channel.sendMessage('resumed').then(() => { dispatcher.resume(); });
										isPaused = false;
									}
								}
							} else if (m.content.startsWith(tokens.prefix + 'skip')) {
								if (m.channel.id !== '289634319591407617') {
									m.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
								} else {
									if (m.member.voiceChannel.name.toLowerCase() !== 'music') {
										m.channel.sendMessage("Wrong Voice Channel! User must be in the music voice channel!");
									} else {
										if (uniqueSkips.length == 0) {
											uniqueSkips.push(m.author.id);
											m.reply("Vote processed!");

										} else if (uniqueSkips.length > 0) {
											if (!uniqueSkips.find((element) => { return element == m.author.id; })) {
												uniqueSkips.push(m.author.id);
												m.reply('Vote processed!');
											} else {
												m.reply('You have already voted!');
											}
										}
										console.log(uniqueSkips.length);
										if ((uniqueSkips.length / (members - 1)) >= .5) {
											setTimeout(() => {
												m.channel.sendMessage('Song skipped!').then(() => { dispatcher.end(); });
												uniqueSkips = [];
											}, 500);
										} else {
											setTimeout(() => {
												m.channel.sendMessage((Math.round((members - 1) / 2) - uniqueSkips.length) + ' more vote' + ((Math.round((members - 1) / 2) - uniqueSkips.length) > 1 ? 's' : '') + ' required! ' + uniqueSkips.length + ' of ' + (members - 1) + ' members have voted!');
											}, 500);
										}
									}
								}
							} else if (m.content.startsWith(tokens.prefix + 'time')) {
								if (m.channel.id !== '289634319591407617') {
									m.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
								} else {
									if (m.member.voiceChannel.name.toLowerCase() !== 'music') {
										m.channel.sendMessage("Wrong Voice Channel! User must be in the music voice channel!");
									} else {
										msg.channel.sendMessage(`time: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000) / 1000) < 10 ? '0' + Math.floor((dispatcher.time % 60000) / 1000) : Math.floor((dispatcher.time % 60000) / 1000)}`);
									}
								}
							}
						});
						dispatcher.on('end', () => {
							collector.stop();
							play(queue[msg.guild.id].songs.shift());
						});
						dispatcher.on('error', (err) => {
							return msg.channel.sendMessage('error: ' + err).then(() => {
								collector.stop();
								play(queue[msg.guild.id].songs.shift());
							});
						});
					})(queue[msg.guild.id].songs[0]);
				}, 1500);
			}
		}
	},
	'queue': (msg) => {
		if (msg.channel.id !== '289634319591407617') {
			msg.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
		} else {
			if (msg.member.voiceChannel.name.toLowerCase() !== 'music') {
				msg.channel.sendMessage("Wrong Voice Channel! User must be in the music voice channel!");
			} else {
				if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Add some songs to the queue first with ${tokens.prefix}add`);
				let tosend = [];
				queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i + 1}. ${song.title} - Requested by: ${song.requester}`); });
				msg.channel.sendMessage(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0, 15).join('\n')}\`\`\``);
			}
		}
	},
	'help': (msg) => {
		if (msg.channel.id !== '289634319591407617') {
			msg.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
		} else {
			if (msg.member.voiceChannel.name.toLowerCase() !== 'music') {
				msg.channel.sendMessage("Wrong Voice Channel!");
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
	},
	'radio': (msg) => {
		if (!ran) {
			ran = true;
			fs.readFile('playlist.txt', function (err, data) {
				if (err) console.log(err);
				var lines = data.toString().split('\n');
				if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];

				lines = shuffle(lines);

				for (i = 0; i < lines.length; i++) {
					(function (i) {
						setTimeout(function () {
							yt.getInfo(lines[i].toString(), (err, info) => {
								if (err) {
									console.log('Invalid YouTube Link: ' + err);
								} else {
									queue[msg.guild.id].songs.push({ url: lines[i].toString(), title: info.title, requester: msg.author.username });
									console.log(`added **${info.title}** to the queue`);
									console.log(i);
								}

							});
							console.log(lines[i]);
						}, 750 * i)
					})(i);
				}
				console.log('read successfully!');
			});
		}
	},
	'play': (msg) => {
		if (msg.channel.id !== '289634319591407617') {
			msg.channel.sendMessage("Wrong text channel! Commands must be issued in the music channel!");
		} else {
			if (msg.member.voiceChannel.name.toLowerCase() !== 'music') {
				msg.channel.sendMessage("Wrong Voice Channel! User must be in the music voice channel!");
			} else {
				let term = msg.content.substring(msg.content.indexOf(' ') + 1);
				let url_id = "";
				let url_base = "https://youtu.be/";

				if (term == '' || term === undefined || term == '-add' || term == '-add ') return msg.channel.sendMessage(`You must add a url, or youtube video id after ${tokens.prefix}add`);
				else {
					if ((term.charAt(0) == 'w' && term.charAt(1) == 'w' && term.charAt(2) == 'w' && term.charAt(3) == '.') || (term.charAt(0) == 'h' && term.charAt(1) == 't' && term.charAt(2) == 't' && term.charAt(3) == 'p' && (term.charAt(4) == ':' || (term.charAt(4) == 's' && term.charAt(5) == ':')))) {
						yt.getInfo(term.stringify(), (err, info) => {
							if (err) return msg.channel.sendMessage('Invalid YouTube Link: ' + err);
							if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
							queue[msg.guild.id].songs.unshift({ url: term, title: info.title, requester: msg.author.username });
							msg.channel.sendMessage(`**${info.title}** has been added to the queue!`);
						});
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
										if (err) return msg.channel.sendMessage('That isn\'t a valid link!');
										if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
										queue[msg.guild.id].songs.unshift({ url: url_f, title: info.title, requester: msg.author.username });
										msg.channel.sendMessage(`**${info.title}** had been added to the queue!`);
									});
								}
								else
									msg.channel.sendMessage("That isn\'t a valid link!");
							}
						});
					}
				}
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
});

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