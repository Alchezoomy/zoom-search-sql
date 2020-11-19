// helper function that will take in the /meetings endpoint obj.body and returns an array of download_urls matching the filter conditions

// const { default: fetch } = require("node-fetch");
const client = require("../client");
const zoom_token = process.env.zoom_token;

module.exports = async (obj) => {
  for (let child of obj.meetings) {
    let video_download_url = "";
    let audio_download_url = "";
    let transcript_download_url = "";
    let chat_download_url = "";

    for (let key of child.recording_files) {
      ({
        transcript_download_url,
        video_download_url,
        audio_download_url,
        chat_download_url,
      } = extractDownloadUrls(
        key,
        transcript_download_url,
        video_download_url,
        audio_download_url,
        chat_download_url
      ));
    }

    await seedMeetingData({
      ...child,
      transcript_download_url,
      video_download_url,
      audio_download_url,
      chat_download_url,
    });
  }
};

function extractDownloadUrls(
  key,
  transcript_download_url,
  video_download_url,
  audio_download_url,
  chat_download_url
) {
  if (key.recording_type === "audio_transcript") {
    transcript_download_url = formatUrl(key.download_url);
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
  return {
    transcript_download_url,
    video_download_url,
    audio_download_url,
    chat_download_url,
  };
}

function formatUrl(url) {
  return `${url}?access_token=${zoom_token}`;
}

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
