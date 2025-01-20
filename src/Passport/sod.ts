import { ContentInfo, SignedData } from "@peculiar/asn1-cms";
import { AsnConvert } from "@peculiar/asn1-schema";

export class DocumentSecurityObject {
  public readonly contentInfo: ContentInfo;
  public readonly signedData: SignedData;

  public constructor(contentInfo: ContentInfo) {
    this.contentInfo = contentInfo;
    this.signedData = AsnConvert.parse(contentInfo.content, SignedData)
    
  }
  public toJSON(): object {
    // used for easier debugging :)
    return {
      contentInfo: this.contentInfo,
      signedData: this.signedData
    };
  }
  public static fromBuffer(buffer: Uint8Array): DocumentSecurityObject {
    // read first byte. make sure it is 77.
    if (buffer[0] !== 0x77) {
      throw new Error("Invalid SOD format. Incorrect magic byte. Expected 0x77, got 0x" + buffer[0].toString(16) + " instead.");
    }
    buffer = buffer.subarray(1);
    // read length byte.
    let length = buffer[0];
    buffer = buffer.subarray(1);
    // check if length is short/long format
    if ((length & 0x80) === 0x80) {
      // LENGTH in LONG FORMAT.
      const lenOfLength = length & 0x7F;
      length = 0;
      // cnt bytes in big-endian format.
      for (let i = 0; i < lenOfLength; i++) {
        length = (length << 8) | buffer[i];
      }
      buffer = buffer.subarray(lenOfLength);
    } else {
      // LENGTH in SHORT FORMAT.
      length = length & 0x7F;
    }
    if (length !== buffer.length) {
      throw new Error("Invalid SOD format. Incorrect length.");
    }
    // REST OF THE BUFFER IS IN CMS FORMAT.
    const contentInfo = AsnConvert.parse(buffer, ContentInfo);
    return new DocumentSecurityObject(contentInfo);
  }
}