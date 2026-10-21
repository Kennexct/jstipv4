// Photos in the Android app use the native "Take photo / Choose from gallery" sheet (ADR-006).
// The WebView file chooser can only open the camera when `capture` is set, and its files may
// have no MIME type. The website keeps the normal <input type="file">.
import { Capacitor } from '@capacitor/core';

export const nativePhotos = () => Capacitor.isNativePlatform();

// Resolves to an image Blob, or null if the person cancelled.
export async function takeNativePhoto() {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  let photo;
  try {
    photo = await Camera.getPhoto({
      source: CameraSource.Prompt,
      resultType: CameraResultType.DataUrl,
      quality: 80,
      width: 1600,
      correctOrientation: true,
      promptLabelHeader: 'Add a photo',
      promptLabelPicture: 'Take photo',
      promptLabelPhoto: 'Choose from gallery',
      promptLabelCancel: 'Cancel',
    });
  } catch (e) {
    if (/cancel|no image picked/i.test(e?.message || '')) return null;
    throw Error('Couldn’t open the camera or gallery. Check the app’s camera permission.');
  }
  return (await fetch(photo.dataUrl)).blob();
}

// Props for an <input type="file">: in the app, open the native sheet instead of the WebView chooser.
export function photoInputProps(onFiles, onError) {
  return {
    onClick: (e) => {
      if (!nativePhotos()) return;
      e.preventDefault();
      takeNativePhoto()
        .then((blob) => blob && onFiles([blob]))
        .catch((err) => onError(err.message));
    },
    onChange: (e) => {
      const files = [...(e.target.files || [])];
      e.target.value = '';
      if (files.length) onFiles(files);
    },
  };
}
