// helper function that will take in the /meetings endpoint obj.body and returns an array of download_urls matching the filter conditions

// const { default: fetch } = require("node-fetch");
const nfetch = require("node-fetch");
const webvtt = require("node-webvtt");

const client = require("../client");
const zoom_token = process.env.zoom_token;

module.exports = async (obj) => {
  for (let child of obj.meetings) {
    const uuid = child.uuid;
    let transcript_download_url = "";

    for (let key of child.recording_files) {
      if (key.recording_type === "audio_transcript") {
        transcript_download_url = formatUrl(key.download_url);

        await parseTranscriptData(transcript_download_url, uuid);
      }
    }
  }

  function formatUrl(url) {
    return `${url}?access_token=${zoom_token}`;
  }

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
};
