// total refactor

// const { default: fetch } = require("node-fetch");
const nfetch = require("node-fetch");
const webvtt = require("node-webvtt");

const client = require("../client");
const zoom_token = process.env.zoom_token;

module.exports = async (obj) => {
  for (let child of obj.meetings) {
    const uuid = child.uuid;
    let video_download_url = "";
    let audio_download_url = "";
    let transcript_download_url = "";
    let chat_download_url = "";

    for (let key of child.recording_files) {
      if (key.recording_type === "audio_transcript") {
        transcript_download_url = formatUrl(key.download_url);

        await parseTranscriptData(transcript_download_url, uuid);
      }
      if (key.file_type === "MP4") {
        video_download_url = formatUrl(key.download_url);
      }
      if (key.recording_type === "audio_only") {
        audio_download_url = formatUrl(key.download_url);
      }
      if (key.recording_type === "chat_file") {
        chat_download_url = formatUrl(key.download_url);
      }
    }

    await seedMeetingData({
      ...child,
      video_download_url,
      audio_download_url,
      transcript_download_url,
      chat_download_url,
    });

    if (chat_download_url) {
      await parseChatData(chat_download_url, uuid);
    }
  }
};

function formatUrl(url) {
  return `${url}?access_token=${zoom_token}`;
}

// parse and seed the transcripts

async function parseTranscriptData(url, uuid) {
  try {
    const request = await nfetch(url);
    const text = await request.text();
    const parsed = webvtt.parse(text, { strict: false });

    for (let data of parsed.cues) {
      seedTranscriptData(uuid, data);
    }
  } catch (e) {
    console.log("ERROR***********************");
    console.log(e.message);
  }
}

async function seedTranscriptData(uuid, data) {
  try {
    await client.query(
      `
    INSERT INTO transcripts
    (uuid, identifier, time_start, time_end, speaker, text, keywords)
    VALUES
    ($1, $2, $3, $4, $5, $6, $7) 
    RETURNING *`,
      [uuid, data.identifier, data.start, data.end, "", data.text, "keywords"]
    );
  } catch (e) {
    console.log("ERROR***********************");
    console.log(e.message);
  }
}

// seed the meetings

async function seedMeetingData({
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
}) {
  try {
    await client.query(
      `
        INSERT INTO meetings
        (uuid, host_id, topic, start_time, share_url, duration, video_play_url, audio_play_url, transcript_url, chat_file, meeting_views, meeting_fav)
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
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
      ]
    );
  } catch (e) {
    console.log("ERROR***********************");
    console.log(e.message);
  }
}

// parse and seed the chats

async function parseChatData(url, uuid) {
  try {
    const request = await nfetch(url);
    const text = await request.text();
    const splitText = text.split("\r\n");
    const array = [];

    for (let line of splitText) {
      let arr = line.split("\t");
      array.push({
        uuid: uuid,
        timestamp: arr[0] || "",
        speaker: arr[1] || "",
        text: arr[2] || "",
      });
    }

    for (let data of array) {
      seedChatData(uuid, data);
    }
  } catch (e) {
    console.log("ERROR***********************");
    console.log(e.message);
  }
}

async function seedChatData(uuid, data) {
  try {
    await client.query(
      `
        INSERT INTO chats
        (uuid, timestamp, speaker, text)
        VALUES
        ($1, $2, $3, $4)
        `,
      [uuid, data.timestamp, data.speaker, data.text]
    );
  } catch (e) {
    console.log("ERROR***********************");
    console.log(e.message);
  }
}
