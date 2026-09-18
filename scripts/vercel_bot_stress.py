#!/usr/bin/env python3
"""
Vercel Usage & Limits Scaling Bot Simulation
Simulates concurrent bot traffic against a deployed Vercel application
to observe how Edge Requests, Serverless Function Invocations, Cache Hits/Misses,
and Concurrency limits scale on the Vercel Dashboard.
"""

import argparse
import concurrent.futures
import http.client
import json
import random
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

USER_AGENTS = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "VercelLimitScaleTester/1.0",
]

DEFAULT_PATHS = [
    "/",
    "/subjects",
    "/notes",
    "/notes?q=physics",
    "/notes?q=mathematics",
    "/notes?q=chemistry",
    "/notes?year=1",
    "/notes?type=PYQ",
    "/subjects/cmtb676eu000lnzpd04ywd60d",
    "/notes/cmtb676if001dnzpdbge7paz0",
    "/api/files/sample.pdf",
    "/favicon.ico",
]

STATIC_PATHS = [
    "/",
    "/favicon.ico",
    "/_next/static/css/f3dceff21f308b6c.css",
]


class LoadTestResult:
    def __init__(self):
        self.total_requests = 0
        self.status_codes = Counter()
        self.vercel_cache_headers = Counter()
        self.vercel_regions = Counter()
        self.latencies = []
        self.errors = Counter()
        self.start_time = None
        self.end_time = None


def make_request(base_url: str, path: str, mode: str, timeout: float = 10.0):
    url = urllib.parse.urljoin(base_url, path)
    if mode == "serverless":
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}_cb={random.randint(1000000, 9999999)}"

    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "identity",
    }

    req = urllib.request.Request(url, headers=headers)
    t0 = time.perf_counter()
    status_code = None
    cache_header = "NONE"
    region = "UNKNOWN"
    err_msg = None

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = (time.perf_counter() - t0) * 1000.0
            status_code = resp.status
            cache_header = resp.headers.get("X-Vercel-Cache", "NONE")
            vercel_id = resp.headers.get("X-Vercel-Id", "")
            if "::" in vercel_id:
                region = vercel_id.split("::")[0]
            elif vercel_id:
                region = vercel_id[:4]
            _ = resp.read(16384)
    except urllib.error.HTTPError as e:
        elapsed = (time.perf_counter() - t0) * 1000.0
        status_code = e.code
        cache_header = e.headers.get("X-Vercel-Cache", "NONE")
        vercel_id = e.headers.get("X-Vercel-Id", "")
        if "::" in vercel_id:
            region = vercel_id.split("::")[0]
        _ = e.read(2048) if hasattr(e, "read") else b""
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000.0
        err_msg = type(e).__name__

    return status_code, elapsed, cache_header, region, err_msg


def run_bot_worker(bot_id: int, base_url: str, mode: str, paths: list, stop_event, result_lock, stats, delay: float):
    while not stop_event["stop"]:
        path = random.choice(paths)
        status_code, elapsed, cache_hdr, region, err_msg = make_request(base_url, path, mode)

        with result_lock:
            stats.total_requests += 1
            if status_code is not None:
                stats.status_codes[status_code] += 1
                stats.vercel_cache_headers[cache_hdr] += 1
                stats.vercel_regions[region] += 1
                stats.latencies.append(elapsed)
            if err_msg:
                stats.errors[err_msg] += 1

            if stop_event.get("max_requests") and stats.total_requests >= stop_event["max_requests"]:
                stop_event["stop"] = True
                break

        if delay > 0:
            time.sleep(delay)


def run_bots(base_url: str, num_bots: int, max_requests: int = None, duration: int = None, mode: str = "mixed", delay: float = 0.0):
    print("=" * 65)
    print(f"🚀 Launching {num_bots} Bot(s) against: {base_url}")
    print(f"📌 Mode: {mode.upper()} | Max Requests: {max_requests or 'Unlimited'} | Duration: {duration or 'N/A'}s | Delay: {delay}s")
    print("=" * 65 + "\n")

    paths = STATIC_PATHS if mode == "cache" else DEFAULT_PATHS

    import threading
    result_lock = threading.Lock()
    stats = LoadTestResult()
    stats.start_time = time.time()
    stop_event = {"stop": False, "max_requests": max_requests}

    def reporter():
        last_total = 0
        last_time = time.time()
        while not stop_event["stop"]:
            time.sleep(1.0)
            now = time.time()
            with result_lock:
                current_total = stats.total_requests
                codes = dict(stats.status_codes)
                cache_h = dict(stats.vercel_cache_headers)
                recent_lat = stats.latencies[-20:] if stats.latencies else []

            delta_req = current_total - last_total
            dt = now - last_time
            rps = delta_req / dt if dt > 0 else 0
            avg_lat = (sum(recent_lat) / len(recent_lat)) if recent_lat else 0

            print(f"⏱  [Reqs: {current_total:4d}] RPS: {rps:5.1f} | 200: {codes.get(200, 0):3d} | 429: {codes.get(429, 0):2d} | 5xx: {codes.get(500, 0) + codes.get(504, 0):2d} | Cache HIT/MISS: {cache_h.get('HIT', 0)}/{cache_h.get('MISS', 0)} | Avg Lat: {avg_lat:5.0f}ms")
            last_total = current_total
            last_time = now

            if duration and (now - stats.start_time) >= duration:
                stop_event["stop"] = True
                break

    reporter_thread = threading.Thread(target=reporter, daemon=True)
    reporter_thread.start()

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_bots) as executor:
        futures = [
            executor.submit(run_bot_worker, i, base_url, mode, paths, stop_event, result_lock, stats, delay)
            for i in range(num_bots)
        ]
        concurrent.futures.wait(futures)

    stop_event["stop"] = True
    stats.end_time = time.time()
    total_time = stats.end_time - stats.start_time

    print("\n" + "=" * 65)
    print("📊 VERCEL BOT RUN SUMMARY")
    print("=" * 65)
    print(f"Total Time:             {total_time:.2f}s")
    print(f"Total Requests:         {stats.total_requests}")
    print(f"Average RPS:            {stats.total_requests / total_time if total_time > 0 else 0:.2f} req/s")

    print("\n--- HTTP Status Codes ---")
    for code, count in sorted(stats.status_codes.items()):
        pct = (count / stats.total_requests * 100) if stats.total_requests > 0 else 0
        tag = ""
        if code == 200:
            tag = " (OK)"
        elif code == 302:
            tag = " (REDIRECT)"
        elif code == 429:
            tag = " (RATE LIMITED / CONCURRENCY CAPPED)"
        elif code == 500:
            tag = " (SERVERLESS ERROR)"
        elif code == 504:
            tag = " (FUNCTION TIMEOUT)"
        print(f"  {code}{tag}: {count} ({pct:.1f}%)")

    if stats.errors:
        print("\n--- Connection / Client Errors ---")
        for err, count in stats.errors.items():
            print(f"  {err}: {count}")

    print("\n--- Vercel Edge Cache ---")
    for cache_status, count in sorted(stats.vercel_cache_headers.items()):
        pct = (count / stats.total_requests * 100) if stats.total_requests > 0 else 0
        desc = ""
        if cache_status == "HIT":
            desc = " -> Served by Vercel Global Edge (Zero Serverless Invocations)"
        elif cache_status == "MISS":
            desc = " -> Invoked Serverless Function (Counts toward Invocations / GB-hrs)"
        elif cache_status == "PRERENDER":
            desc = " -> Static pre-rendered asset"
        print(f"  {cache_status}: {count} ({pct:.1f}%){desc}")

    print("\n--- Edge Pop Regions (Arrival Edge) ---")
    for region, count in stats.vercel_regions.most_common(5):
        print(f"  {region}: {count}")

    if stats.latencies:
        sorted_lat = sorted(stats.latencies)
        p50 = sorted_lat[int(len(sorted_lat) * 0.50)]
        p95 = sorted_lat[int(len(sorted_lat) * 0.95)]
        p99 = sorted_lat[int(len(sorted_lat) * 0.99)]
        avg = sum(sorted_lat) / len(sorted_lat)
        print("\n--- Latency Breakdown ---")
        print(f"  Min: {sorted_lat[0]:.1f}ms")
        print(f"  Avg: {avg:.1f}ms")
        print(f"  P50: {p50:.1f}ms")
        print(f"  P95: {p95:.1f}ms")
        print(f"  P99: {p99:.1f}ms")
        print(f"  Max: {sorted_lat[-1]:.1f}ms")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulate bots against Vercel to inspect usage limits scaling")
    parser.add_argument("--url", default="https://notes-hub-sage.vercel.app", help="Base URL of deployed app")
    parser.add_argument("--bots", type=int, default=5, help="Number of concurrent bots (threads)")
    parser.add_argument("--requests", type=int, default=100, help="Total requests to dispatch")
    parser.add_argument("--duration", type=int, default=None, help="Duration in seconds (overrides requests if set)")
    parser.add_argument("--mode", choices=["mixed", "serverless", "cache"], default="mixed",
                        help="Traffic mode: 'mixed' (realistic), 'serverless' (force dynamic invocations), 'cache' (test Edge hits)")
    parser.add_argument("--delay", type=float, default=0.0, help="Delay between requests per bot in seconds")

    args = parser.parse_args()
    run_bots(
        base_url=args.url,
        num_bots=args.bots,
        max_requests=args.requests if not args.duration else None,
        duration=args.duration,
        mode=args.mode,
        delay=args.delay,
    )
