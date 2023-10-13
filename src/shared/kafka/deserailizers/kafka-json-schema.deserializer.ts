import { BufferMessage } from '../interfaces';

export class KafkaJsonSchemaDeserializer {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deserialize(msg: BufferMessage, metadata: any): Promise<any> {
    const { value, key, offset, timestamp, headers, partition } = msg;

    const keyDecoded = await this.tryDecode(key);
    const valueDecoded = await this.tryDecode(value);

    return {
      key: keyDecoded,
      value: valueDecoded,
      offset,
      timestamp,
      headers,
      partition,
    };
  }

  private async tryDecode(payload: Buffer): Promise<any> {
    let json = payload?.toString();
    if (!json || json.length < 5) {
      return undefined;
    }

    json = json.substring(5);
    if (!json.startsWith('{') && !json.startsWith('[')) {
      return undefined;
    }

    return JSON.parse(json);
  }
}
