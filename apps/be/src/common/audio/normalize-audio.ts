import { audioToWav } from './audio-to-wav';
import { mimeToExt } from './mime-to-ext';

const STT_SUPPORTED_EXT = ['mp3', 'aac', 'ac3', 'ogg', 'flac', 'wav', 'm4a'];

export async function normalizeAudio(file: Express.Multer.File): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
}> {
  const inputExt = mimeToExt(file.mimetype);

  // STT가 직접 받을 수 있으면 그대로 사용
  if (STT_SUPPORTED_EXT.includes(inputExt)) {
    return {
      buffer: file.buffer,
      contentType: file.mimetype,
      filename: file.originalname,
    };
  }

  // 그 외 포맷은 WAV로 변환
  const wavBuffer = await audioToWav(file.buffer, inputExt);

  return {
    buffer: wavBuffer,
    contentType: 'audio/wav',
    filename: file.originalname.replace(/\.[^.]+$/, '.wav'),
  };
}
