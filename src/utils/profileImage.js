const PROFILE_IMAGE_MAX_SIZE = 640;
const PROFILE_IMAGE_QUALITY = 0.85;

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("無法讀取這張圖片"));
    image.src = source;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("無法讀取上傳的檔案"));
    reader.readAsDataURL(file);
  });
}

export async function createPersistentProfileImage(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("請選擇圖片檔案");
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("圖片尺寸無效");
  }

  const scale = Math.min(
    1,
    PROFILE_IMAGE_MAX_SIZE / Math.max(sourceWidth, sourceHeight)
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", PROFILE_IMAGE_QUALITY);
}
