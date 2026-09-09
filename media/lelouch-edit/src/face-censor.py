import cv2, numpy as np, sys, os, json

SRC = sys.argv[1]
OUT_DIR = sys.argv[2]
CELL = int(sys.argv[3]) if len(sys.argv) > 3 else 16     # mosaic cell size (px)
ALPHA = float(sys.argv[4]) if len(sys.argv) > 4 else 0.78 # how opaque the mosaic is
os.makedirs(OUT_DIR, exist_ok=True)

cap = cv2.VideoCapture(SRC)
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
N = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); FPS = cap.get(cv2.CAP_PROP_FPS)
print("src", W, H, N, FPS)

casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
prof = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")

# ---- pass 1: detect the face in every frame -------------------------------
raw = []
frames = []
i = 0
while True:
    ok, fr = cap.read()
    if not ok: break
    frames.append(fr)
    small = cv2.resize(fr, (W // 2, H // 2))
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    det = casc.detectMultiScale(gray, 1.12, 5, minSize=(70, 70))
    if len(det) == 0:
        det = prof.detectMultiScale(gray, 1.12, 5, minSize=(70, 70))
    if len(det) == 0:
        det = cv2.flip(gray, 1), None
        g2 = cv2.flip(gray, 1)
        d2 = prof.detectMultiScale(g2, 1.12, 5, minSize=(70, 70))
        det = np.array([[W // 2 - (x + w), y, w, h] for (x, y, w, h) in d2]) if len(d2) else []
    if len(det):
        x, y, w, h = max(det, key=lambda b: b[2] * b[3])
        raw.append((i, x * 2, y * 2, w * 2, h * 2))
    i += 1
cap.release()
print("detected in", len(raw), "of", len(frames), "frames")

# ---- fill gaps: interpolate between detections, hold at the ends ----------
boxes = [None] * len(frames)
for (i, x, y, w, h) in raw: boxes[i] = [x, y, w, h]
known = [i for i, b in enumerate(boxes) if b]
if not known:
    raise SystemExit("no face found")
for i in range(len(boxes)):
    if boxes[i]: continue
    prev = max([k for k in known if k < i], default=None)
    nxt = min([k for k in known if k > i], default=None)
    if prev is None: boxes[i] = list(boxes[nxt])
    elif nxt is None: boxes[i] = list(boxes[prev])
    else:
        t = (i - prev) / (nxt - prev)
        boxes[i] = [boxes[prev][j] + (boxes[nxt][j] - boxes[prev][j]) * t for j in range(4)]

# ---- smooth the track so the patch never jitters --------------------------
sm = np.array(boxes, dtype=float)
k = 9
pad = np.vstack([np.repeat(sm[:1], k, 0), sm, np.repeat(sm[-1:], k, 0)])
ker = np.ones(2 * k + 1) / (2 * k + 1)
sm = np.stack([np.convolve(pad[:, j], ker, 'valid') for j in range(4)], 1)

# ---- pass 2: soft, semi-transparent mosaic over the face ------------------
for i, fr in enumerate(frames):
    x, y, w, h = sm[i]
    cx, cy = x + w / 2, y + h / 2 - h * 0.06
    rx, ry = w * 0.78, h * 0.92                      # cover forehead to chin
    x0, y0 = int(max(0, cx - rx)), int(max(0, cy - ry))
    x1, y1 = int(min(W, cx + rx)), int(min(H, cy + ry))
    roi = fr[y0:y1, x0:x1]
    rh, rw = roi.shape[:2]
    if rh < 8 or rw < 8:
        cv2.imwrite(f"{OUT_DIR}/f_{i:04d}.png", fr); continue

    blurred = cv2.GaussianBlur(roi, (0, 0), max(2.0, CELL * 0.45))
    small = cv2.resize(blurred, (max(1, rw // CELL), max(1, rh // CELL)), interpolation=cv2.INTER_AREA)
    mosaic = cv2.resize(small, (rw, rh), interpolation=cv2.INTER_NEAREST)

    # soft elliptical mask so the patch blends instead of showing a box
    mask = np.zeros((rh, rw), np.float32)
    cv2.ellipse(mask, (rw // 2, rh // 2), (int(rw * 0.46), int(rh * 0.47)), 0, 0, 360, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (0, 0), min(rw, rh) * 0.09)
    a = (mask * ALPHA)[..., None]
    fr[y0:y1, x0:x1] = (mosaic * a + roi * (1 - a)).astype(np.uint8)
    cv2.imwrite(f"{OUT_DIR}/f_{i:04d}.png", fr)

json.dump({"fps": FPS, "n": len(frames)}, open(f"{OUT_DIR}/meta.json", "w"))
print("wrote", len(frames), "frames")
