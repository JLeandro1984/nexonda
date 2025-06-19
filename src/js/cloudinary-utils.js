
export async function uploadToCloudinaryByType(file, type, preset = "brandConnectPresetName", cloudName = "dmq4e5bm5") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);
  debugger;
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (data.secure_url) {
    return {
      url: data.secure_url,
      deleteToken: data.delete_token || null,
    };
  }

  throw new Error(data.error?.message || "Erro ao fazer upload");
}

export async function deleteFromCloudinaryByToken(deleteToken, cloudName = "dmq4e5bm5") {
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/delete_by_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token: deleteToken }),
      }
    );

    const data = await response.json();

    if (data.result === "ok") {
      console.log("Mídia deletada com sucesso.");
      return true;
    } else {
      console.warn("Falha ao deletar mídia:", data);
      return false;
    }
  } catch (error) {
    console.error("Erro ao deletar mídia do Cloudinary:", error);
    return false;
  }
}

export function showMediaPreview(container, url, type) {
  container.innerHTML = "";

  if (type === "image") {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Pré-visualização da imagem";
    img.style.maxWidth = "300px";
    img.style.borderRadius = "8px";
    container.appendChild(img);
  } else if (type === "video") {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.style.maxWidth = "300px";
    video.style.borderRadius = "8px";
    container.appendChild(video);
  }
}
