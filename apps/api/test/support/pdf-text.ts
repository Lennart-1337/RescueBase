import { inflateSync } from "node:zlib";

function inflatePdfStreams(pdf: Buffer) {
  const content = pdf.toString("latin1");
  const decoded: string[] = [];
  let cursor = 0;
  while (cursor < content.length) {
    const filterIndex = content.indexOf("/Filter /FlateDecode", cursor);
    if (filterIndex === -1) break;
    const streamIndex = content.indexOf("stream", filterIndex);
    const endStreamIndex = content.indexOf("endstream", streamIndex);
    if (streamIndex === -1 || endStreamIndex === -1) break;
    let dataStart = streamIndex + 6;
    if (pdf[dataStart] === 0x0d && pdf[dataStart + 1] === 0x0a) dataStart += 2;
    else if (pdf[dataStart] === 0x0a) dataStart += 1;
    const dataEnd = pdf[endStreamIndex - 1] === 0x0d && pdf[endStreamIndex - 2] !== 0x0a ? endStreamIndex - 1 : endStreamIndex;
    try {
      decoded.push(inflateSync(pdf.subarray(dataStart, dataEnd)).toString("utf8"));
    } catch {
      // Ignore non-content streams.
    }
    cursor = endStreamIndex + 9;
  }
  return decoded.join("\n");
}

export function extractVisiblePdfText(pdf: Buffer) {
  return inflatePdfStreams(pdf)
    .split(/\r?\n/)
    .flatMap((line) => {
      const hexMatches = [...line.matchAll(/<([0-9A-Fa-f]+)>/g)].map((match) =>
        Buffer.from(match[1] ?? "", "hex").toString("latin1"),
      );
      const literalMatches = [...line.matchAll(/\(([^()]*)\)/g)].map(
        (match) => match[1] ?? "",
      );
      return [...hexMatches, ...literalMatches];
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePdfText(text: string) {
  return text
    .toLocaleLowerCase("de-DE")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}@.+:/-]+/gu, "");
}

