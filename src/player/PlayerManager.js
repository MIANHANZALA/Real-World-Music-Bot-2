const { DisTube } = require('distube');
const PlayerQueue = require('./PlayerQueue');
const PlayerErrorHandler = require('./PlayerErrorHandler');
const PlayerEvents = require('./PlayerEvents');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const fs = require("fs");
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();
const path = require('path');
class PlayerManager {
    constructor(client, distubeOptions) {
        this.client = client;
     
        this.messageDeleteTimeout = 10000;
        
        this.distube = new DisTube(client, {
          ...distubeOptions,
          plugins: [
            new YtDlpPlugin({
              update: false, 
              cookies: path.join(__dirname, '../config/cookies.txt'), 
            }),
          ],
        });
        
        this.queue = new PlayerQueue();
        this.errorHandler = new PlayerErrorHandler();
        this.events = new PlayerEvents(this.distube);
    
        this.initialize();
      }

  initialize() {
    this.distube.on('playSong', (queue, song) => this.handlePlaySong(queue, song));
    this.distube.on('addSong', (queue, song) => this.handleAddSong(queue, song));
    this.distube.on('addList', (queue, playlist) => this.handleAddList(queue, playlist));
    this.distube.on('finish', (queue) => this.handleFinish(queue));
    this.distube.on('error', (error) => this.errorHandler.handleError(error));
    this.distube.on('disconnect', (queue) => this.handleDisconnect(queue));
    this.distube.on('empty', (queue) => this.handleEmpty(queue));
    //this.distube.on('debug', (message) => console.debug(`DisTube Debug: ${message}`));
  }
  
  async handlePlaySong(queue, song) {
    try {
      if (!queue || !queue.voiceChannel) {
        return; 
      }
      
      if (queue.textChannel) {
      
        if (!song || !song.name || !song.url) {
          return; 
        }
        
        const embed = new EmbedBuilder()
          .setColor('#0099ff') 
          .setTitle('Now Playing') 
          .setDescription(`🎶 **[${song.name}](${song.url})**`) 
          .addFields(
            { name: 'Tier', value: `**Free ( Non Premium)**`, inline: true },
          )
          .setTimestamp();

    
        if (song.duration && song.formattedDuration) {
          embed.addFields({ name: 'Duration', value: `**${song.formattedDuration}**`, inline: true });
        }

    
        if (song.thumbnail) {
          embed.setImage(song.thumbnail); 
        }

        const sentMessage = await queue.textChannel.send({ embeds: [embed] });
        
      
        setTimeout(() => {
          sentMessage.delete().catch(() => {}); 
        }, this.messageDeleteTimeout);
      }
    } catch (error) {
      // Silently handle errors without logging to chat
      console.error('Error in handlePlaySong:', error);
    }
  }
  
  async handleAddSong(queue, song) {
    try {
      if (!queue || !queue.voiceChannel || !queue.textChannel) {
        return; 
      }
      

      if (!song || !song.name) {
        return; 
      }
      
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Song Added to Queue')
        .setDescription(`- Song Name: **${song.name}**\n- Channel: **${queue.voiceChannel.name}**`)
        .setTimestamp();


      const sentMessage = await queue.textChannel.send({ embeds: [embed] });
      
  
      setTimeout(() => {
        sentMessage.delete().catch(() => {}); 
      }, this.messageDeleteTimeout);
    } catch (error) {
    
      console.error('Error in handleAddSong:', error);
    }
  }

  handleAddList(queue, playlist) {
    // No need to log or send message for playlists
    return;
  }

  handleFinish(queue) {
    if (!queue || !queue.voiceChannel) {
      return; 
    }
    this.queue.clear(queue.voiceChannel.id);
  }

  handleDisconnect(queue) {
    if (!queue || !queue.voiceChannel) {
      return; 
    }
    this.queue.clear(queue.voiceChannel.id);
  }

  handleEmpty(queue) {
    if (!queue || !queue.voiceChannel) {
      return; 
    }
    this.queue.clear(queue.voiceChannel.id);
  }

  async playSong(channel, song, options) {
    try {

      await this.distube.voices.join(channel);
      
  
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const queue = await this.distube.play(channel, song, options);
      this.queue.add(queue);
      return queue;
    } catch (error) {
      if (error.errorCode === 'VOICE_CONNECT_FAILED') {
      
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await this.distube.voices.join(channel);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const queue = await this.distube.play(channel, song, options);
          this.queue.add(queue);
          return queue;
        } catch (retryError) {
          this.errorHandler.handleError(retryError);
          throw retryError;
        }
      } else {
        this.errorHandler.handleError(error);
        throw error;
      }
    }
  }

  async stop(channel) {
    try {
      const queue = this.queue.get(channel.id);
      if (queue) {
        await this.distube.stop(queue.voiceChannel);
        this.queue.clear(channel.id);
      }
    } catch (error) {
      this.errorHandler.handleError(error);
    }
  }

  async skip(channel) {
    try {
      const queue = this.queue.get(channel.id);
      if (queue) {
        await this.distube.skip(queue.voiceChannel);
      }
    } catch (error) {
      this.errorHandler.handleError(error);
    }
  }

  async leave(channel) {
    try {
      const queue = this.queue.get(channel.id);
      if (queue) {
        await this.distube.voices.get(queue.voiceChannel.id)?.leave();
        this.queue.clear(channel.id);
      }
    } catch (error) {
      this.errorHandler.handleError(error);
    }
  }
}

module.exports = PlayerManager;
