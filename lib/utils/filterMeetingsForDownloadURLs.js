// helper function that will take in the /meetings endpoint obj.body and returns an array of download_urls matching the filter conditions

// const { default: fetch } = require("node-fetch");
const nfetch = require('node-fetch');
const webvtt = require('node-webvtt');
const hostDetails = require('./hostDetails.js');
const client = require('../client');
const zoom_token = process.env.zoom_token;

// really cool function--also, nice work exporting it as default here
module.exports = async(obj) => {
  for(let child of obj.meetings) {
    const uuid = child.uuid;
    const host_id = child.host_id;
    const topic = child.topic;
    const start_time = child.start_time;
    const share_url = child.share_url;
    const duration = child.duration;
    const hostObject = hostDetails(host_id);

    let video_download_url = '';
    let audio_download_url = '';
    let transcript_download_url = '';
    let chat_download_url = '';


    // Loops through each recording file to parse out each file type
    for(let key of child.recording_files) {
      if(key.recording_type === 'audio_transcript') {
        transcript_download_url = `${key.download_url}?access_token=${zoom_token}`;
        try {
          const request = await nfetch(transcript_download_url);
          const text = await request.text();
          const parsed = webvtt.parse(text, { strict: false });

          for(let dataPoint of parsed.cues) {
            await client.query(
              `
            INSERT INTO transcripts
            (uuid, identifier, time_start, time_end, text)
            VALUES
            ($1, $2, $3, $4, $5) 
            RETURNING *`,
              [
                uuid,
                dataPoint.identifier,
                dataPoint.start,
                dataPoint.end,
                dataPoint.text,
              ]
            );
          }
        } catch(e) {
          console.log('ERROR***********************');
          console.log(e.message);
        }
      }
      if(key.file_type === 'MP4') {
        video_download_url = `${key.download_url}?access_token=${zoom_token}`;
      }
      if(key.recording_type === 'audio_only') {
        audio_download_url = `${key.download_url}?access_token=${zoom_token}`;
      }
      if(key.recording_type === 'chat_file') {
        chat_download_url = `${key.download_url}?access_token=${zoom_token}`;
      }
    }

    // inserts meeting data into SQL table
    await client.query(
      `
        INSERT INTO meetings
        (uuid, host_id, topic, start_time, share_url, duration, video_play_url, audio_play_url, transcript_url, chat_file, meeting_views, meeting_fav, host_name, pic_url, color)
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
        RETURNING *
        `,
      [
        uuid,
        host_id,
        topic,
        start_time,
        share_url,
        duration,
        video_download_url,
        audio_download_url,
        transcript_download_url,
        chat_download_url,
        0,
        0,
        hostObject.name,
        hostObject.pic_url,
        hostObject.color
      ]
    );

    if(chat_download_url) {
      try {
        const request = await nfetch(chat_download_url);
        const text = await request.text();
        const firstParse = text.split('\r\n');

        const secondParse = firstParse.map(line => {
          const tempArray = line.split('\t');

          return {
            uuid: uuid,
            timestamp: tempArray[0] || '',
            speaker: tempArray[1] || '',
            text: tempArray[2] || '',
          };
        });

        const promises = secondParse.map(chatDataPoint => client.query(
          `
          INSERT INTO chats
          (uuid, timestamp, speaker, text)
          VALUES
          ($1, $2, $3, $4)
          `,
          [
            uuid,
            chatDataPoint.timestamp,
            chatDataPoint.speaker,
            chatDataPoint.text,
          ]
        ));
        
        // using Promise.all is more conventional in my experience, though it probably won't save any time here.
        await Promise.all(promises);
      } catch(e) {
        console.log('ERROR***********************');
        console.log(e.message);
      }
    }
  }
};
