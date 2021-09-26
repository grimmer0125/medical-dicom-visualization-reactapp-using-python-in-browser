
const JpegBaselineDecoder = require("./jpeg-baseline").JpegImage
const jpegLossless = require("jpeg-lossless-decoder-js");
const Jpx2000Image = require('./jpx');
const JpegLSDecoder = require('./jpeg-ls');

const decompressJPEG = {
  lossless: (bytes: any) => {
    const buffer = bytes.getBuffer()
    const decoder = new jpegLossless.lossless.Decoder();
    const decoded = decoder.decode(buffer.data);
    buffer.release()
    return decoded.buffer
  },
  baseline: (bytes: any, bitsAllocated: number) => {
    // JPEGBaseline
    const buffer = bytes.getBuffer()
    const decoder = new JpegBaselineDecoder();
    decoder.parse(new Uint8Array(buffer.data));
    const width = decoder.width;
    const height = decoder.height;

    let decoded;
    if (bitsAllocated === 8) {
      decoded = decoder.getData(width, height);
    } else if (bitsAllocated === 16) {
      decoded = decoder.getData16(width, height);
    }
    buffer.release()
    return decoded.buffer;
  },
  jpeg2000: (bytes: any) => {
    // JPEG_2000
    // remaining not tested yet: "1.2.840.10008.1.2.4.90"
    const buffer = bytes.getBuffer()
    const decoder = new Jpx2000Image();
    decoder.parse(new Uint8Array(buffer.data));
    const decoded = decoder.tiles[0].items;
    buffer.release()
    return decoded.buffer;
  },
  jpegls: (bytes: any, isBytesInteger: boolean) => {
    // JPEGLS
    const buffer = bytes.getBuffer()
    const decoder = new JpegLSDecoder();
    const decoded = decoder.decodeJPEGLS(new Uint8Array(buffer.data), isBytesInteger);
    buffer.release()
    return decoded.pixelData.buffer;
  }

}

export default decompressJPEG;
