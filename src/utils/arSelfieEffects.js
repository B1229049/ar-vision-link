export const AR_SELFIE_EFFECTS = [
  { id: "none", label: "無特效", icon: "×" },
  { id: "sparkle", label: "星光", icon: "✦" },
  { id: "heart", label: "愛心", icon: "♥" },
  { id: "blush", label: "腮紅", icon: "●" },
  { id: "freckles", label: "雀斑", icon: "∴" },
  { id: "sunglasses", label: "墨鏡", icon: "▰" },
  { id: "crown", label: "皇冠", icon: "♛" },
  { id: "cat", label: "狗狗", icon: "ฅ" },
];

const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const LEFT_EYE = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function point(landmarks, index, width, height) {
  const landmark = landmarks[index];
  return {
    x: (1 - landmark.x) * width,
    y: landmark.y * height,
    z: landmark.z || 0,
  };
}

function averagePoints(points) {
  return points.reduce(
    (sum, item) => ({ x: sum.x + item.x / points.length, y: sum.y + item.y / points.length }),
    { x: 0, y: 0 }
  );
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
}

function drawHeart(ctx, x, y, size, color, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, 0.28);
  ctx.bezierCurveTo(-0.95, -0.4, -0.54, -1.15, 0, -0.55);
  ctx.bezierCurveTo(0.54, -1.15, 0.95, -0.4, 0, 0.28);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx, x, y, radius, color, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI / 4) * index - Math.PI / 2;
    const length = index % 2 === 0 ? radius : radius * 0.36;
    const pointX = Math.cos(angle) * length;
    const pointY = Math.sin(angle) * length;
    if (index === 0) ctx.moveTo(pointX, pointY);
    else ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawSunglasses(ctx, metrics) {
  const { eyeCenter, eyeDistance, eyeAngle } = metrics;
  const lensWidth = eyeDistance * 0.58;
  const lensHeight = eyeDistance * 0.38;
  const lensOffset = eyeDistance * 0.31;
  const frameWidth = clamp(eyeDistance * 0.055, 4, 14);

  ctx.save();
  ctx.translate(eyeCenter.x, eyeCenter.y);
  ctx.rotate(eyeAngle);
  ctx.lineWidth = frameWidth;
  ctx.strokeStyle = "#070a12";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0, 0, 0, 0.62)";
  ctx.shadowBlur = eyeDistance * 0.08;

  [-1, 1].forEach((side) => {
    const x = side * lensOffset - lensWidth / 2;
    const y = -lensHeight * 0.47;
    const gradient = ctx.createLinearGradient(x, y, x + lensWidth, y + lensHeight);
    gradient.addColorStop(0, "rgba(9, 12, 24, 0.98)");
    gradient.addColorStop(0.52, "rgba(20, 28, 48, 0.96)");
    gradient.addColorStop(1, "rgba(3, 6, 13, 0.99)");
    ctx.beginPath();
    roundedRectPath(ctx, x, y, lensWidth, lensHeight, lensHeight * 0.28);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = "#b9e8ff";
    ctx.lineWidth = Math.max(2, frameWidth * 0.32);
    ctx.beginPath();
    ctx.moveTo(x + lensWidth * 0.14, y + lensHeight * 0.22);
    ctx.lineTo(x + lensWidth * 0.52, y + lensHeight * 0.08);
    ctx.stroke();
    ctx.restore();
  });

  ctx.beginPath();
  ctx.moveTo(-eyeDistance * 0.025, -lensHeight * 0.08);
  ctx.quadraticCurveTo(0, -lensHeight * 0.3, eyeDistance * 0.025, -lensHeight * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-lensOffset - lensWidth / 2, -lensHeight * 0.2);
  ctx.lineTo(-eyeDistance * 0.82, -lensHeight * 0.42);
  ctx.moveTo(lensOffset + lensWidth / 2, -lensHeight * 0.2);
  ctx.lineTo(eyeDistance * 0.82, -lensHeight * 0.42);
  ctx.stroke();
  ctx.restore();
}

function drawFreckles(ctx, landmarks, width, height, eyeDistance) {
  const anchors = [117, 118, 119, 100, 126, 142, 346, 347, 348, 329, 355, 371];
  const offsets = [
    [-0.018, -0.006], [0.012, 0.01], [-0.006, 0.022], [0.02, -0.018],
  ];
  ctx.save();
  ctx.fillStyle = "rgba(91, 50, 38, 0.82)";
  ctx.shadowColor = "rgba(255, 214, 180, 0.2)";
  ctx.shadowBlur = 2;
  anchors.forEach((index, anchorIndex) => {
    const anchor = point(landmarks, index, width, height);
    offsets.slice(0, anchorIndex % 3 === 0 ? 3 : 2).forEach(([offsetX, offsetY], dotIndex) => {
      const radius = clamp(eyeDistance * (0.008 + ((anchorIndex + dotIndex) % 3) * 0.002), 2.4, 5.5);
      ctx.beginPath();
      ctx.arc(
        anchor.x + eyeDistance * offsetX,
        anchor.y + eyeDistance * offsetY,
        radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  });
  ctx.restore();
}

function drawCrown(ctx, metrics) {
  const { forehead, eyeDistance, eyeAngle } = metrics;
  const crownWidth = eyeDistance * 1.45;
  const crownHeight = eyeDistance * 0.64;
  ctx.save();
  ctx.translate(forehead.x, forehead.y - crownHeight * 0.6);
  ctx.rotate(eyeAngle);
  const gradient = ctx.createLinearGradient(0, -crownHeight, 0, crownHeight * 0.2);
  gradient.addColorStop(0, "#fff8ad");
  gradient.addColorStop(1, "#f59e0b");
  ctx.fillStyle = gradient;
  ctx.strokeStyle = "#fff7d1";
  ctx.lineWidth = clamp(eyeDistance * 0.025, 3, 8);
  ctx.shadowColor = "rgba(251, 191, 36, 0.88)";
  ctx.shadowBlur = eyeDistance * 0.12;
  ctx.beginPath();
  ctx.moveTo(-crownWidth / 2, crownHeight * 0.25);
  ctx.lineTo(-crownWidth * 0.44, -crownHeight * 0.62);
  ctx.lineTo(-crownWidth * 0.2, -crownHeight * 0.18);
  ctx.lineTo(0, -crownHeight);
  ctx.lineTo(crownWidth * 0.2, -crownHeight * 0.18);
  ctx.lineTo(crownWidth * 0.44, -crownHeight * 0.62);
  ctx.lineTo(crownWidth / 2, crownHeight * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  [-0.32, 0, 0.32].forEach((position, index) => {
    ctx.beginPath();
    ctx.fillStyle = ["#ef4444", "#8b5cf6", "#0ea5e9"][index];
    ctx.arc(crownWidth * position, crownHeight * 0.05, eyeDistance * 0.055, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawCat(ctx, metrics) {
  const { forehead, nose, eyeDistance, eyeAngle } = metrics;
  ctx.save();
  ctx.translate(forehead.x, forehead.y);
  ctx.rotate(eyeAngle);
  ctx.fillStyle = "rgba(31, 20, 48, 0.97)";
  ctx.strokeStyle = "#f9a8d4";
  ctx.lineWidth = clamp(eyeDistance * 0.025, 3, 8);
  [-1, 1].forEach((side) => {
    const centerX = side * eyeDistance * 0.48;
    ctx.beginPath();
    ctx.moveTo(centerX - eyeDistance * 0.28, 0);
    ctx.lineTo(centerX + side * eyeDistance * 0.08, -eyeDistance * 0.62);
    ctx.lineTo(centerX + eyeDistance * 0.28, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();

  ctx.save();
  ctx.translate(nose.x, nose.y);
  ctx.rotate(eyeAngle);
  ctx.fillStyle = "#f472b6";
  ctx.beginPath();
  ctx.moveTo(-eyeDistance * 0.075, eyeDistance * 0.04);
  ctx.lineTo(eyeDistance * 0.075, eyeDistance * 0.04);
  ctx.lineTo(0, eyeDistance * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = clamp(eyeDistance * 0.014, 2, 5);
  [-1, 1].forEach((side) => {
    [-0.08, 0.02, 0.12].forEach((verticalOffset, index) => {
      ctx.beginPath();
      ctx.moveTo(side * eyeDistance * 0.13, eyeDistance * (0.12 + verticalOffset));
      ctx.lineTo(side * eyeDistance * (0.6 + index * 0.04), eyeDistance * (0.08 + verticalOffset * 1.5));
      ctx.stroke();
    });
  });
  ctx.restore();
}

export function smoothFaceLandmarks(previous, current, amount = 0.46) {
  if (!previous || previous.length !== current.length) {
    return current.map((item) => ({ ...item }));
  }
  return current.map((item, index) => ({
    x: previous[index].x + (item.x - previous[index].x) * amount,
    y: previous[index].y + (item.y - previous[index].y) * amount,
    z: previous[index].z + ((item.z || 0) - (previous[index].z || 0)) * amount,
  }));
}

export function renderFaceEffect(ctx, landmarks, width, height, effectId, blendshapes = {}, time = performance.now()) {
  if (!landmarks?.length || effectId === "none") return;
  const leftEyePoints = LEFT_EYE.map((index) => point(landmarks, index, width, height));
  const rightEyePoints = RIGHT_EYE.map((index) => point(landmarks, index, width, height));
  const leftEyeCenter = averagePoints(leftEyePoints);
  const rightEyeCenter = averagePoints(rightEyePoints);
  const eyeCenter = averagePoints([leftEyeCenter, rightEyeCenter]);
  const eyeDistance = Math.hypot(rightEyeCenter.x - leftEyeCenter.x, rightEyeCenter.y - leftEyeCenter.y);
  const eyeAngle = Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x);
  const metrics = {
    eyeCenter,
    eyeDistance,
    eyeAngle,
    forehead: point(landmarks, 10, width, height),
    nose: point(landmarks, 1, width, height),
    leftCheek: point(landmarks, 117, width, height),
    rightCheek: point(landmarks, 346, width, height),
  };

  if (effectId === "sunglasses") drawSunglasses(ctx, metrics);
  if (effectId === "freckles") drawFreckles(ctx, landmarks, width, height, eyeDistance);
  if (effectId === "crown") drawCrown(ctx, metrics);
  if (effectId === "cat") drawCat(ctx, metrics);

  if (effectId === "blush") {
    ctx.save();
    ctx.fillStyle = "rgba(255, 105, 142, 0.32)";
    ctx.shadowColor = "rgba(255, 105, 142, 0.9)";
    ctx.shadowBlur = eyeDistance * 0.12;
    [metrics.leftCheek, metrics.rightCheek].forEach((cheek) => {
      ctx.beginPath();
      ctx.ellipse(cheek.x, cheek.y, eyeDistance * 0.23, eyeDistance * 0.1, eyeAngle, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  if (effectId === "heart") {
    drawHeart(ctx, metrics.forehead.x - eyeDistance * 0.65, metrics.forehead.y - eyeDistance * 0.62, eyeDistance * 0.19, "rgba(255, 80, 133, 0.94)", eyeAngle - 0.12);
    drawHeart(ctx, metrics.forehead.x + eyeDistance * 0.58, metrics.forehead.y - eyeDistance * 0.42, eyeDistance * 0.13, "rgba(255, 163, 194, 0.92)", eyeAngle + 0.18);
  }

  if (effectId === "sparkle") {
    const smile = ((blendshapes.mouthSmileLeft || 0) + (blendshapes.mouthSmileRight || 0)) / 2;
    const pulse = 1 + Math.sin(time / 180) * 0.12 + smile * 0.18;
    [
      [-0.72, -0.42, 0.11], [0.7, -0.32, 0.09], [0, -0.76, 0.14],
      [-0.92, 0.12, 0.07], [0.92, 0.08, 0.07],
    ].forEach(([x, y, size], index) => {
      drawStar(
        ctx,
        metrics.forehead.x + eyeDistance * x,
        metrics.forehead.y + eyeDistance * y,
        eyeDistance * size * pulse,
        index % 2 ? "rgba(216, 180, 254, 0.96)" : "rgba(255, 244, 170, 0.98)",
        time / 900 + index
      );
    });
  }
}

function clampColor(value) {
  return clamp(value, 0, 255);
}

export function createFilteredSnapshot(source, overlayOrFilterId, requestedFilterId, targetAspectRatio) {
  const overlay = typeof overlayOrFilterId === "string" ? null : overlayOrFilterId;
  const filterId = typeof overlayOrFilterId === "string" ? overlayOrFilterId : requestedFilterId;
  const snapshot = document.createElement("canvas");
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = source.width;
  let sourceHeight = source.height;

  if (targetAspectRatio > 0) {
    const sourceAspectRatio = sourceWidth / sourceHeight;
    if (sourceAspectRatio > targetAspectRatio) {
      sourceWidth = Math.round(sourceHeight * targetAspectRatio);
      sourceX = Math.round((source.width - sourceWidth) / 2);
    } else if (sourceAspectRatio < targetAspectRatio) {
      sourceHeight = Math.round(sourceWidth / targetAspectRatio);
      sourceY = Math.round((source.height - sourceHeight) / 2);
    }
  }

  snapshot.width = sourceWidth;
  snapshot.height = sourceHeight;
  const ctx = snapshot.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    snapshot.width,
    snapshot.height
  );
  if (filterId === "natural") {
    if (overlay) {
      ctx.drawImage(
        overlay,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        snapshot.width,
        snapshot.height
      );
    }
    return snapshot;
  }

  const imageData = ctx.getImageData(0, 0, snapshot.width, snapshot.height);
  const pixels = imageData.data;
  for (let index = 0; index < pixels.length; index += 4) {
    let red = pixels[index];
    let green = pixels[index + 1];
    let blue = pixels[index + 2];
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    if (filterId === "warm") {
      red = red * 1.1 + 10; green = green * 1.04 + 3; blue *= 0.88;
    } else if (filterId === "cool") {
      red *= 0.9; green = green * 1.03 + 2; blue = blue * 1.13 + 8;
    } else if (filterId === "vivid") {
      red = (luminance + (red - luminance) * 1.5 - 128) * 1.1 + 128;
      green = (luminance + (green - luminance) * 1.5 - 128) * 1.1 + 128;
      blue = (luminance + (blue - luminance) * 1.5 - 128) * 1.1 + 128;
    } else if (filterId === "soft") {
      red = ((red - 128) * 0.88 + 128) * 0.92 + 255 * 0.08;
      green = ((green - 128) * 0.88 + 128) * 0.92 + 247 * 0.08;
      blue = ((blue - 128) * 0.88 + 128) * 0.92 + 252 * 0.08;
    } else if (filterId === "film") {
      const sepiaRed = red * 0.393 + green * 0.769 + blue * 0.189;
      const sepiaGreen = red * 0.349 + green * 0.686 + blue * 0.168;
      const sepiaBlue = red * 0.272 + green * 0.534 + blue * 0.131;
      red = ((red * 0.58 + sepiaRed * 0.42) - 128) * 1.1 + 128;
      green = ((green * 0.58 + sepiaGreen * 0.42) - 128) * 1.1 + 128;
      blue = ((blue * 0.58 + sepiaBlue * 0.42) - 128) * 1.1 + 128;
    } else if (filterId === "mono") {
      red = green = blue = (luminance - 128) * 1.12 + 128;
    }
    pixels[index] = clampColor(red);
    pixels[index + 1] = clampColor(green);
    pixels[index + 2] = clampColor(blue);
  }
  ctx.putImageData(imageData, 0, 0);
  if (overlay) {
    ctx.drawImage(
      overlay,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      snapshot.width,
      snapshot.height
    );
  }
  return snapshot;
}

export function createSelfieThumbnail(canvas) {
  const maximumSide = 360;
  const scale = Math.min(1, maximumSide / Math.max(canvas.width, canvas.height));
  const thumbnail = document.createElement("canvas");
  thumbnail.width = Math.round(canvas.width * scale);
  thumbnail.height = Math.round(canvas.height * scale);
  thumbnail.getContext("2d").drawImage(canvas, 0, 0, thumbnail.width, thumbnail.height);
  return thumbnail.toDataURL("image/jpeg", 0.72);
}
