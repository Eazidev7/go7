#!/usr/bin/env python3
"""
Go7 notification sound generator — PROVENANCE / REPRODUCIBILITY.

This is the generator that produced every tone in public/sounds/.
It exists so the sound set is reproducible and auditable: the Go7 tones are
synthesised from scratch here (additive bell / marimba / sparkle partials with
exponential decay envelopes), NOT downloaded from a sample library.

That means:
  * no third-party audio licence
  * no attribution requirement in the app
  * no external asset that can disappear or change under you

Usage
-----
    python scripts/generate-go7-sounds.py                     # WAVs into ./sounds-out
    python scripts/generate-go7-sounds.py --out public/sounds --mp3
    python scripts/generate-go7-sounds.py --mp3 --ffmpeg node_modules/ffmpeg-static/ffmpeg.exe

With --mp3 it encodes and writes the files where the apps expect them
(public/sounds/<name>.mp3). Without it you get WAVs for inspection.

Dependencies: Python 3 standard library only (math, os, struct, wave, argparse).
MP3 encoding shells out to ffmpeg (ffmpeg-static is already a devDependency).

Sound design notes
------------------
* Every tone is normalised to the same peak so none jumps out in level.
* A 12 ms tail fade guarantees no click at the end of any tone.
* `new-job` is 3 x 1.0 s identical cycles whose tails decay to silence, so the
  file LOOPS seamlessly — the MP3 encoder gap lands in that silence and is
  therefore inaudible. It also carries a low thump so it survives engine noise.
"""

import argparse
import math
import os
import shutil
import struct
import subprocess
import sys
import wave

SR = 44100  # sample rate for every tone

# ---------------------------------------------------------------- partial sets
# Bell-like: inharmonic partials give the "ding" character.
BELL = ((1, 1.0), (2.0, 0.42), (2.76, 0.24), (3.0, 0.15), (4.07, 0.09))
# Marimba / pluck: fast upper partials.
MARIMBA = ((1, 1.0), (3.9, 0.26), (9.2, 0.08))
# Warm low tone for negative / resolving feedback.
WARM = ((1, 1.0), (2.0, 0.30), (3.0, 0.10))
# Bright sparkle for rewards.
SPARK = ((1, 1.0), (2.76, 0.30), (5.4, 0.14))

# ----------------------------------------------------------------- note table
C5, D5, E5, F5, G5, A5, B5, GS5 = 523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 830.61
C6, D6, E6, F6, G6, A6, B6 = 1046.50, 1174.66, 1318.51, 1396.91, 1567.98, 1760.00, 1975.53
C7, D7, E7 = 2093.00, 2349.32, 2637.02
B4 = 493.88


# ------------------------------------------------------------------ synthesis
def add_partial(buf, freq, amp, decay, attack=0.004):
    """Add one decaying sine partial into buf (in place)."""
    n = len(buf)
    a = max(1, int(SR * attack))
    inc = 2.0 * math.pi * freq / SR
    for i in range(n):
        g = (i / a) if i < a else math.exp(-decay * ((i - a) / SR))
        buf[i] += amp * g * math.sin(inc * i)


def tone(duration, notes, partials=BELL, decay=5.0):
    """notes: iterable of (start_seconds, frequency, amplitude)."""
    n = int(SR * duration)
    buf = [0.0] * n
    for start, freq, amp in notes:
        off = int(SR * start)
        seg = [0.0] * (n - off)
        for ratio, pa in partials:
            f = freq * ratio
            if f > SR / 2 - 100:  # stay below Nyquist
                continue
            add_partial(seg, f, amp * pa, decay * (1.0 + (ratio - 1.0) * 0.5))
        for i, v in enumerate(seg):
            buf[off + i] += v
    return buf


def master(buf, peak=0.82, lowpass=14000, tail_ms=12):
    """Remove DC, low-pass for smoothness, fade the tail, normalise."""
    n = len(buf)
    mean = sum(buf) / n
    buf = [v - mean for v in buf]

    rc = 1.0 / (2.0 * math.pi * lowpass)
    dt = 1.0 / SR
    alpha = dt / (rc + dt)
    y = 0.0
    out = []
    for v in buf:
        y += alpha * (v - y)
        out.append(y)
    buf = out

    if tail_ms:
        fade = int(SR * tail_ms / 1000.0)
        for i in range(fade):
            buf[n - fade + i] *= 1.0 - (i / fade)

    m = max(abs(v) for v in buf) or 1.0
    return [max(-1.0, min(1.0, v / m * peak)) for v in buf]


def new_job_loop():
    """3 x 1.0 s cycles, seamless at the loop point. See module docstring."""
    cycle, cycles = 1.0, 3
    n = int(SR * cycle * cycles)
    buf = [0.0] * n
    for c in range(cycles):
        base = c * cycle
        for offset, freq, amp, decay in (
            (0.00, E6, 0.95, 7.0),
            (0.13, G6, 0.95, 7.0),
            (0.26, C7, 1.00, 8.0),
        ):
            off = int(SR * (base + offset))
            seg = [0.0] * (n - off)
            for ratio, pa in BELL:
                f = freq * ratio
                if f > SR / 2 - 100:
                    continue
                add_partial(seg, f, amp * pa, decay * (1.0 + (ratio - 1.0) * 0.5))
            for i, v in enumerate(seg):
                buf[off + i] += v
        # low supporting thump so the alert carries outdoors
        off = int(SR * (base + 0.26))
        seg = [0.0] * (n - off)
        add_partial(seg, C7 / 4.0, 0.28, 9.0)
        add_partial(seg, (C7 / 4.0) * 2.0, 0.28 * 0.18, 13.5)
        for i, v in enumerate(seg):
            buf[off + i] += v
    # 3 ms micro-fades only, so the loop seam stays silent but inaudible
    f = int(SR * 0.003)
    for i in range(f):
        buf[i] *= i / f
        buf[n - 1 - i] *= i / f
    return master(buf, peak=0.84, lowpass=16000, tail_ms=0)


# -------------------------------------------------------------------- the set
SET = {
    # ---- shared (customer + rider) ----
    "notification":      dict(dur=0.75, notes=[(0.0, G5, 0.9), (0.13, C6, 0.85)], decay=6.0, lp=12000),
    "notify":            dict(dur=0.70, notes=[(0.0, E6, 0.92)], decay=5.2, lp=11000),
    "success":           dict(dur=0.95, notes=[(0.0, C6, 0.85), (0.085, E6, 0.85), (0.17, G6, 0.9)], decay=4.6, lp=12000),
    "error":             dict(dur=0.80, notes=[(0.0, A5, 0.85), (0.18, GS5, 0.85)], partials=WARM, decay=5.5, lp=5000),
    "order-assigned":    dict(dur=0.90, notes=[(0.0, G5, 0.85), (0.105, C6, 0.85), (0.21, E6, 0.9)], decay=5.0, lp=12000),
    "status-update":     dict(dur=0.55, notes=[(0.0, D6, 0.9)], partials=MARIMBA, decay=9.0, lp=9000),
    "order-complete":    dict(dur=1.00, notes=[(0.0, C6, 0.9), (0.17, G5, 0.95)], partials=WARM, decay=4.0, lp=9000),
    "location-ping":     dict(dur=0.22, notes=[(0.0, C7, 0.7)], partials=MARIMBA, decay=22.0, lp=15000),
    "chat":              dict(dur=0.45, notes=[(0.0, A5, 0.85), (0.095, C6, 0.8)], partials=MARIMBA, decay=12.0, lp=14000),
    # ---- rider priority ----
    "new-job":           None,  # built by new_job_loop()
    "job-cancelled":     dict(dur=0.95, notes=[(0.0, F5, 0.9), (0.20, B4, 0.95)], partials=WARM, decay=4.5, lp=6000),
    "earnings-credited": dict(dur=1.05, notes=[(0.0, C6, 0.85), (0.075, E6, 0.85), (0.15, G6, 0.85), (0.225, C7, 0.95)], decay=5.5, lp=15000),
    # ---- gamification (customer app) ----
    "level-up":          dict(dur=1.10, notes=[(0.0, C6, 0.85), (0.085, E6, 0.85), (0.17, G6, 0.9), (0.255, C7, 1.0)], decay=5.0, lp=14000),
    "mission-complete":  dict(dur=0.95, notes=[(0.0, G6, 0.9), (0.16, E6, 0.95)], partials=WARM, decay=4.2, lp=14000),
    "badge-unlock":      dict(dur=0.80, notes=[(0.0, A6, 0.8), (0.11, E7, 0.9), (0.22, A6, 0.55)], partials=SPARK, decay=8.0, lp=14000),
    "legendary-badge":   dict(dur=1.40, notes=[(0.0, G5, 0.8), (0.10, C6, 0.85), (0.20, E6, 0.85), (0.30, G6, 0.9), (0.40, C7, 1.0)], decay=4.6, lp=14000),
    "streak-milestone":  dict(dur=0.75, notes=[(0.0, C6, 0.85), (0.09, E6, 0.85), (0.18, G6, 0.9)], decay=6.0, lp=14000),
    "reward-unlock":     dict(dur=0.65, notes=[(0.0, D7, 0.85), (0.115, A6, 0.75)], partials=SPARK, decay=9.0, lp=14000),
    "prize-won":         dict(dur=1.50, notes=[(0.0, C6, 0.85), (0.10, E6, 0.85), (0.20, G6, 0.9), (0.34, C7, 1.0), (0.46, G6, 0.6), (0.56, C7, 0.7)], decay=4.0, lp=14000),
}


def build(name):
    spec = SET[name]
    if spec is None:
        return new_job_loop()
    return master(
        tone(spec["dur"], spec["notes"], spec.get("partials", BELL), spec["decay"]),
        lowpass=spec["lp"],
    )


def write_wav(path, buf):
    w = wave.open(path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", int(v * 32767)) for v in buf))
    w.close()


def find_ffmpeg(explicit):
    if explicit:
        return explicit if os.path.exists(explicit) else None
    for cand in (
        os.path.join("node_modules", "ffmpeg-static", "ffmpeg.exe"),
        os.path.join("node_modules", "ffmpeg-static", "ffmpeg"),
        "ffmpeg",
    ):
        if os.path.exists(cand) or shutil.which(cand):
            return cand
    return None


def main():
    ap = argparse.ArgumentParser(description="Generate the Go7 notification sound set.")
    ap.add_argument("--out", default="sounds-out", help="output directory")
    ap.add_argument("--mp3", action="store_true", help="encode MP3 into --out (default writes WAV)")
    ap.add_argument("--ffmpeg", default=None, help="path to ffmpeg for --mp3")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    ffmpeg = find_ffmpeg(args.ffmpeg) if args.mp3 else None
    if args.mp3 and not ffmpeg:
        print("ERROR: --mp3 requested but ffmpeg not found. Pass --ffmpeg <path>.")
        return 1

    tmp = os.path.join(args.out, "_wav")
    os.makedirs(tmp, exist_ok=True)

    print(f"{'tone':22} {'dur':>7}  {'peak':>6} {'rms':>7}   output")
    total = 0
    for name in SET:
        buf = build(name)
        wav_path = os.path.join(tmp, name + ".wav")
        write_wav(wav_path, buf)

        peak = max(abs(v) for v in buf)
        rms = math.sqrt(sum(v * v for v in buf) / len(buf))

        if args.mp3:
            out_path = os.path.join(args.out, name + ".mp3")
            subprocess.run(
                [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", wav_path,
                 "-codec:a", "libmp3lame", "-b:a", "128k", "-ac", "1", out_path],
                check=True,
            )
            size_kb = os.path.getsize(out_path) / 1024
            total += size_kb
            label, size = name + ".mp3", f"{size_kb:.0f} KB"
        else:
            size = f"{os.path.getsize(wav_path) / 1024:.0f} KB"
            label = name + ".wav"

        print(f"{name:22} {len(buf) / SR:6.2f}s  {peak:6.3f} {rms:7.4f}   {label}  {size}")

    if args.mp3:
        shutil.rmtree(tmp, ignore_errors=True)
        print(f"\n{len(SET)} tones written to {args.out} ({total:.0f} KB total)")
    else:
        print(f"\n{len(SET)} WAVs in {tmp}. Re-run with --mp3 to encode final files into {args.out}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
