window.SHOWCASE = {
  headline:
    "Turned a 2-minute widescreen video into 2 vertical 9:16 social clips with burned word-highlighted captions and a complete YouTube publishing package.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Local video repurposing output",
      caption:
        "Transcribed speech locally, cropped to vertical format, normalized audio, and generated YouTube metadata.",
      items: [
        {
          label: "Vertical 9:16 clips",
          value: 2,
          note: "1080x1920 ready for Reels & Shorts",
          tone: "good",
        },
        {
          label: "Source duration",
          value: "120 s",
          note: "1920x1080 widescreen input (4.34 MB)",
          tone: "info",
        },
        {
          label: "YouTube titles drafted",
          value: 3,
          note: "Direct, curiosity, and story hooks",
          tone: "good",
        },
        {
          label: "SEO tags generated",
          value: 10,
          note: "Ready to paste into YouTube Studio",
          tone: "info",
        },
      ],
    },
    {
      type: "before_after",
      title: "Raw horizontal video vs. publish-ready assets",
      before: {
        "Video format": "16:9 widescreen (1920x1080), 120.0s",
        "Subtitles": "None",
        "Audio & chapters": "Unedited track, no timestamps",
        "YouTube copy": "Not written",
      },
      after: {
        "Vertical clips": "2 clips at 9:16 (1080x1920), 90.0s & 75.8s",
        "Subtitles": "Word-highlighted captions burned into frames",
        "Chapters": "3 timestamped chapters (00:00, 00:30, 00:44)",
        "YouTube pack": "3 CTR title options, full description & 10 tags",
      },
    },
    {
      type: "table",
      title: "Rendered vertical clips",
      columns: ["Clip file", "Window", "Duration", "File size", "Opening hook", "Resolution"],
      rows: [
        ["clip_01_momento_1_i_wish.mp4", "30.0s – 120.0s", "90.0 s", "3.85 MB", "I wish you success", "1080x1920"],
        ["clip_02_momento_2_id_want.mp4", "44.2s – 120.0s", "75.8 s", "3.10 MB", "I'd want you boldly millionaires...", "1080x1920"],
      ],
      tones: {
        "1080x1920": "good",
      },
    },
  ],
};
