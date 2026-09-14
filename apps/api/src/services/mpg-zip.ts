import { crc32 } from "node:zlib";

type Entry = { name: string; data: Buffer };
const u16 = (value: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(value); return b; };
const u32 = (value: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(value >>> 0); return b; };

export function zip(entries: Entry[]): Buffer {
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replace(/[^\p{L}\p{N}._/-]/gu, "_"), "utf8");
    const checksum = crc32(entry.data);
    const header = Buffer.concat([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(checksum), u32(entry.data.length), u32(entry.data.length), u16(name.length), u16(0), name]);
    local.push(header, entry.data);
    central.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(checksum), u32(entry.data.length), u32(entry.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += header.length + entry.data.length;
  }
  const directory = Buffer.concat(central);
  return Buffer.concat([...local, directory, u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(directory.length), u32(offset), u16(0)]);
}
