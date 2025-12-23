const express = require("express");
const { execFile, spawn } = require("child_process");

const app = express();
app.use(express.json());

const YTDLP = "yt-dlp";

app.get("/", (req, res) => {
  res.send(`
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>yt-dlp Player</title>
<style>
body { font-family: sans-serif; max-width: 700px; margin: 20px auto; }
video { width: 100%; background: #000; }
</style>
</head>
<body>
<h1>yt-dlp YouTube 再生・DL</h1>

<input id="url" size="50" placeholder="YouTube URL">
<button onclick="getInfo()">情報取得</button>

<h3>フォーマット</h3>
<select id="format"></select>

<h3>再生</h3>
<button onclick="play()">再生</button>
<video id="player" controls></video>

<h3>ダウンロード</h3>
<a id="dl" href="#">ダウンロード</a>

<script>
async function getInfo() {
  const url = document.getElementById("url").value;
  const res = await fetch("/info", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ url })
  });
  const info = await res.json();
  const sel = document.getElementById("format");
  sel.innerHTML = "";
  info.formats.forEach(f => {
    const o = document.createElement("option");
    o.value = f.format_id;
    o.textContent = f.format_id + " | " + (f.resolution || "") + " | " + f.ext;
    sel.appendChild(o);
  });
}

async function play() {
  const url = document.getElementById("url").value;
  const format = document.getElementById("format").value;
  const res = await fetch("/stream?url=" + encodeURIComponent(url) + "&format=" + format);
  const data = await res.json();
  document.getElementById("player").src = data.urls[0];
}

document.getElementById("format").onchange = () => {
  const url = document.getElementById("url").value;
  const format = document.getElementById("format").value;
  document.getElementById("dl").href = "/download?url=" + encodeURIComponent(url) + "&format=" + format;
};
</script>
</body>
</html>
  `);
});

app.post("/info", (req, res) => {
  const { url } = req.body;
  execFile(YTDLP, ["-J", "--no-playlist", url], (err, stdout) => {
    if (err) return res.status(500).json({ error: "yt-dlp error" });
    res.json(JSON.parse(stdout));
  });
});

app.get("/stream", (req, res) => {
  const { url, format } = req.query;
  const args = ["-g", "--no-playlist"];
  if (format) args.push("-f", format);
  args.push(url);

  execFile(YTDLP, args, (err, stdout) => {
    if (err) return res.status(500).json({ error: "yt-dlp error" });
    res.json({ urls: stdout.trim().split("\n") });
  });
});

app.get("/download", (req, res) => {
  const { url, format } = req.query;
  const args = ["-o", "-", "--no-playlist"];
  if (format) args.push("-f", format);
  args.push(url);

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", "attachment; filename=video.mp4");

  const p = spawn(YTDLP, args);
  p.stdout.pipe(res);
});

app.listen(3000, () => console.log("http://localhost:3000"));
