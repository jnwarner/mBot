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

const commands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Add some songs to the queue first with ${tokens.prefix}add`);
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.sendMessage('Already Playing');
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(song);
			if (song === undefined) return msg.channel.sendMessage('Queue is empty').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.sendMessage(`Playing: **${song.title}** as requested by: **${song.requester}**`);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : tokens.passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('message', m => {
				if (m.content.startsWith(tokens.prefix + 'pause')) {
					msg.channel.sendMessage('paused').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(tokens.prefix + 'resume')){
					msg.channel.sendMessage('resumed').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(tokens.prefix + 'skip')){
					msg.channel.sendMessage('skipped').then(() => {dispatcher.end();});
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
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t connect to your voice channel...');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Add some songs to the queue first with ${tokens.prefix}add`);
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);});
		msg.channel.sendMessage(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'help': (msg) => {
		let tosend = ['```xl', tokens.prefix + 'join : "Join Voice channel of msg sender"',	tokens.prefix + 'add : "Add a valid youtube link to the queue"', tokens.prefix + 'queue : "Shows the current queue, up to 15 songs shown."', tokens.prefix + 'play : "Play the music queue if already joined to a voice channel"', '', 'the following commands only function while the play command is running:'.toUpperCase(), tokens.prefix + 'pause : "pauses the music"',	tokens.prefix + 'resume : "resumes the music"', tokens.prefix + 'skip : "skips the playing song"', tokens.prefix + 'time : "Shows the playtime of the song."',	'volume+(+++) : "increases volume by 2%/+"',	'volume-(---) : "decreases volume by 2%/-"',	'```'];
		msg.channel.sendMessage(tosend.join('\n'));
	},
	'radio': (msg) => {
		fs.readFile('playlist.txt', function(err, data){
    		if(err) throw err;
    		var lines = data.toString().split('\n');
			queue[msg.guild.id] = {}; 
			queue[msg.guild.id].playing = false;
			queue[msg.guild.id].songs = [];


			console.log(lines.length)

				for (i = 0; i < lines.length; i++) {
					(function(i) {
						setTimeout(function() {
							yt.getInfo(lines[i].toString(), (err, info) => {
								if(err) return console.log('Invalid YouTube Link: ' + err);
								queue[msg.guild.id].songs.push({url: lines[i].toString(), title: info.title, requester: msg.author.username});
								console.log(`added **${info.title}** to the queue`);
							});
						}, 300 * i)
					})(i);
				}
				 

			console.log('read successfully!');
 		})
	},
	'add': (msg) => {
		let term = msg.content.substring(msg.content.indexOf(' ')+1);
		let url_id = ""; 
		let url_base = "https://youtu.be/";

		if (term == '' || term === undefined) return msg.channel.sendMessage(`You must add a url, or youtube video id after ${tokens.prefix}add`);
		else {
			if ((term.charAt(0) == 'w' && term.charAt(1) == 'w' && term.charAt(2) == 'w' && term.charAt(3) == '.') || (term.charAt(0) == 'h' && term.charAt(1) == 't' && term.charAt(2) == 't' && term.charAt(3) == 'p' && (term.charAt(4) == ':' || (term.charAt(4) == 's' && term.charAt(5) == ':')))) {
				yt.getInfo(term, (err, info) => {
					if(err) return msg.channel.sendMessage('Invalid YouTube Link: ' + err);
					if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
					queue[msg.guild.id].songs.unshift({url: term, title: info.title, requester: msg.author.username});
					msg.channel.sendMessage(`added **${info.title}** to the queue`);
				});
			} else {
				yt_client.search(term, 2, function(error, result) {
		  			if (error) {
						console.log("Nope!");
    					console.log(error);
  					} else {
						console.log("Success!");
    					url_id = JSON.stringify(result.items[0].id.videoId, null, 2);
						url_id = url_id.toString().substring(1, url_id.length - 1);
						console.log(url_id);

						let url_f = url_base + url_id;
						yt.getInfo(url_f.toString(), (err, info) => {
							if(err) return msg.channel.sendMessage('Invalid YouTube Link: ' + err);
								if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
									queue[msg.guild.id].songs.unshift({url: url_f, title: info.title, requester: msg.author.username});
										msg.channel.sendMessage(`added **${info.title}** to the queue`);
						});
  					}
				});
			}	
		} 
	},
	'populate': (msg) => {
		let id = msg.content.substring(msg.content.indexOf(' ') + 1)
		exec('./playlist2links ' + id, puts);
		msg.channel.sendMessage('Added playlist to queue!')
	},
	'reboot': (msg) => {
		if (msg.author.id == tokens.adminID) process.exit(); //Requires a node module like Forever to work.
	}
};

client.on('ready', () => {
	console.log('ready!');
});

client.on('message', msg => {
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
});
client.login(tokens.d_token);
