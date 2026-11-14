// Render the app's code-native wallet mark without an image dependency.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
const directory = new URL(
    "../src-electron/electron-assets/icons/",
    import.meta.url
);
mkdirSync(directory, { recursive: true });
function crc32(bytes) {
    let crc = -1;
    for (const byte of bytes) {
        crc ^= byte;
        for (let i = 0; i < 8; i++)
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ -1) >>> 0;
}
function chunk(type, data) {
    const name = Buffer.from(type);
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([size, name, data, crc]);
}
function rounded(x, y, left, top, width, height, radius) {
    const dx = Math.max(left + radius - x, 0, x - left - width + radius);
    const dy = Math.max(top + radius - y, 0, y - top - height + radius);
    return (
        x >= left &&
        x <= left + width &&
        y >= top &&
        y <= top + height &&
        dx * dx + dy * dy <= radius * radius
    );
}
function pixel(x, y) {
    const dark = [25, 53, 46, 255],
        light = [204, 230, 168, 255];
    if (!rounded(x, y, 0, 0, 128, 128, 28)) return [0, 0, 0, 0];
    let color = dark;
    if (rounded(x, y, 30, 28, 58, 35, 10) || rounded(x, y, 30, 43, 68, 52, 10))
        color = light;
    if (rounded(x, y, 35, 43, 63, 10, 5)) color = dark;
    if (
        rounded(x, y, 68, 62, 30, 23, 11.5) ||
        (x >= 79 && x <= 98 && y >= 62 && y <= 85)
    )
        color = dark;
    if ((x - 81) ** 2 + (y - 73.5) ** 2 <= 3.5 ** 2) color = light;
    return color;
}
function png(size) {
    const raw = Buffer.alloc((size * 4 + 1) * size);
    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
            const rgba = [0, 0, 0, 0];
            for (let sy = 0; sy < 2; sy++)
                for (let sx = 0; sx < 2; sx++) {
                    const sample = pixel(
                        ((x + (sx + 0.5) / 2) * 128) / size,
                        ((y + (sy + 0.5) / 2) * 128) / size
                    );
                    sample.forEach((value, channel) => {
                        rgba[channel] += value / 4;
                    });
                }
            const offset = y * (size * 4 + 1) + 1 + x * 4;
            rgba.forEach((value, channel) => {
                raw[offset + channel] = Math.round(value);
            });
        }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(size);
    header.writeUInt32BE(size, 4);
    header[8] = 8;
    header[9] = 6;
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0))
    ]);
}
writeFileSync(new URL("icon.png", directory), png(512));
const entries = [
    ["icp4", 16],
    ["icp5", 32],
    ["icp6", 64],
    ["ic07", 128],
    ["ic08", 256],
    ["ic09", 512],
    ["ic10", 1024]
].map(([type, size]) => {
    const data = png(size),
        header = Buffer.alloc(8);
    header.write(type);
    header.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([header, data]);
});
const icnsHeader = Buffer.alloc(8);
icnsHeader.write("icns");
icnsHeader.writeUInt32BE(
    8 + entries.reduce((sum, entry) => sum + entry.length, 0),
    4
);
writeFileSync(
    new URL("icon.icns", directory),
    Buffer.concat([icnsHeader, ...entries])
);
const icoData = png(256),
    icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(icoData.length, 14);
icoHeader.writeUInt32LE(22, 18);
writeFileSync(
    new URL("icon.ico", directory),
    Buffer.concat([icoHeader, icoData])
);
