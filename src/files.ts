export function download(content: string | Blob, name: string, type: string) {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function imageBlob(dataUrl: string): Blob {
  const data = dataUrl.split(",")[1];
  return new Blob(
    [Uint8Array.from(atob(data), (character) => character.charCodeAt(0))],
    { type: "image/png" },
  );
}
