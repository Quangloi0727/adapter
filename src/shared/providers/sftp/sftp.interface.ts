export interface Metadata {
	key?: string;
	size?: number;
	mimeType?: string;
}

export class UploadStat {
  key: string;
  success: boolean;
  relPath: string;
  location?: string;
  takeTime: number;
}
