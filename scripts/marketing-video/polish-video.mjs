import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import {
  OUTPUT_DIR,
  RAW_VIDEO,
  POLISHED_VIDEO,
  POLISHED_VERTICAL,
  BRAND,
} from './config.mjs';

const FONT =
  process.env.GO7_VIDEO_FONT ||
  (process.platform === 'win32'
    ? 'C:/Windows/Fonts/arialbd.ttf'
    : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');

function runFfmpeg(args, label) {
  const result = spawnSync(ffmpegPath, args, { stdio: 'inherit', encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed (${label})`);
  }
}

function escDrawtext(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function buildTitleCard(outFile, title, subtitle, durationSec = 2.5) {
  const vf = [
    `drawtext=fontfile='${FONT}':text='${escDrawtext(title)}':fontsize=92:fontcolor=white:x=(w-text_w)/2:y=(h/2)-120`,
    `drawtext=fontfile='${FONT}':text='${escDrawtext(subtitle)}':fontsize=42:fontcolor=white@0.92:x=(w-text_w)/2:y=(h/2)+10`,
  ].join(',');

  runFfmpeg(
    [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=0xE30613:s=1080x1920:d=${durationSec}:r=30`,
      '-vf', vf,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outFile,
    ],
    'title-card'
  );
}

function scaleMain(inFile, outFile) {
  runFfmpeg(
    [
      '-y',
      '-i', inFile,
      '-vf',
      'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p,fade=t=in:st=0:d=0.55',
      '-r', '30',
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'medium',
      '-movflags', '+faststart',
      '-an',
      outFile,
    ],
    'scale-main'
  );
}

function concatVideos(files, outFile) {
  const listPath = path.join(OUTPUT_DIR, 'concat-list.txt');
  const body = files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listPath, body, 'utf8');

  runFfmpeg(
    [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'medium',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-an',
      outFile,
    ],
    'concat'
  );
}

async function main() {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static binary not found');
  }
  if (!fs.existsSync(RAW_VIDEO)) {
    throw new Error(`Missing raw video. Run: npm run video:record\nExpected: ${RAW_VIDEO}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const intro = path.join(OUTPUT_DIR, 'intro.mp4');
  const outro = path.join(OUTPUT_DIR, 'outro.mp4');
  const mainScaled = path.join(OUTPUT_DIR, 'main-scaled.mp4');

  console.log('Polishing marketing video...');
  buildTitleCard(intro, BRAND.title, BRAND.tagline, 2.5);
  buildTitleCard(outro, BRAND.cta, 'Fast delivery in Abeokuta', 2.2);
  scaleMain(RAW_VIDEO, mainScaled);
  concatVideos([intro, mainScaled, outro], POLISHED_VERTICAL);

  // 16:9 version for YouTube / web
  runFfmpeg(
    [
      '-y',
      '-i', POLISHED_VERTICAL,
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'medium',
      '-movflags', '+faststart',
      '-an',
      POLISHED_VIDEO,
    ],
    'landscape'
  );

  console.log('Done.');
  console.log('  Vertical (Reels/TikTok):', POLISHED_VERTICAL);
  console.log('  Landscape (web/YouTube):', POLISHED_VIDEO);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

