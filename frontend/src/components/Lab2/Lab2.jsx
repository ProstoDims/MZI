import { useState } from "react";
import "./Lab2.css";

const Lab2 = () => {
  const [inputText, setInputText] = useState("");
  const [key, setKey] = useState(
    "E9DEE72C8F0C0FA62DDB49F46F73964706075316ED247A3739CBA38303A98BF6".toUpperCase()
  );
  const [iv, setIv] = useState("000102030405060708090A0B0C0D0E0F");
  const [outputText, setOutputText] = useState("");
  const [operation, setOperation] = useState("encrypt");
  const [status, setStatus] = useState("");

  const H = Uint8Array.from([
    0xb1, 0x94, 0xba, 0xc8, 0x0a, 0x08, 0xf5, 0x3b, 0x36, 0x6d, 0x00, 0x8e,
    0x58, 0x4a, 0x5d, 0xe4, 0x85, 0x04, 0xfa, 0x9d, 0x1b, 0xb6, 0xc7, 0xac,
    0x25, 0x2e, 0x72, 0xc2, 0x02, 0xfd, 0xce, 0x0d, 0x5b, 0xe3, 0xd6, 0x12,
    0x17, 0xb9, 0x61, 0x81, 0xfe, 0x67, 0x86, 0xad, 0x71, 0x6b, 0x89, 0x0b,
    0x5c, 0xb0, 0xc0, 0xff, 0x33, 0xc3, 0x56, 0xb8, 0x35, 0xc4, 0x05, 0xae,
    0xd8, 0xe0, 0x7f, 0x99, 0xe1, 0x2b, 0xdc, 0x1a, 0xe2, 0x82, 0x57, 0xec,
    0x70, 0x3f, 0xcc, 0xf0, 0x95, 0xee, 0x8b, 0xf1, 0xc1, 0xab, 0x76, 0x38,
    0x9f, 0xe6, 0x78, 0xca, 0xf7, 0xc6, 0xf8, 0x60, 0xd5, 0xbb, 0x9c, 0x4f,
    0xf3, 0x3c, 0x65, 0x7b, 0x63, 0x7c, 0x30, 0x6a, 0xdd, 0x4e, 0xa7, 0x79,
    0x9e, 0xb2, 0x3d, 0x31, 0x3e, 0x98, 0xb5, 0x6e, 0x27, 0xd3, 0xbc, 0xcf,
    0x59, 0x1e, 0x18, 0x1f, 0x4c, 0x5a, 0xb7, 0x93, 0xe9, 0xde, 0xe7, 0x2c,
    0x8f, 0x0c, 0x0f, 0xa6, 0x2d, 0xdb, 0x49, 0xf4, 0x6f, 0x73, 0x96, 0x47,
    0x06, 0x07, 0x53, 0x16, 0xed, 0x24, 0x7a, 0x37, 0x39, 0xcb, 0xa3, 0x83,
    0x03, 0xa9, 0x8b, 0xf6, 0x92, 0xbd, 0x9b, 0x1c, 0xe5, 0xd1, 0x41, 0x01,
    0x54, 0x45, 0xfb, 0xc9, 0x5e, 0x4d, 0x0e, 0xf2, 0x68, 0x20, 0x80, 0xaa,
    0x22, 0x7d, 0x64, 0x2f, 0x26, 0x87, 0xf9, 0x34, 0x90, 0x40, 0x55, 0x11,
    0xbe, 0x32, 0x97, 0x13, 0x43, 0xfc, 0x9a, 0x48, 0xa0, 0x2a, 0x88, 0x5f,
    0x19, 0x4b, 0x09, 0xa1, 0x7e, 0xcd, 0xa4, 0xd0, 0x15, 0x44, 0xaf, 0x8c,
    0xa5, 0x84, 0x50, 0xbf, 0x66, 0xd2, 0xe8, 0x8a, 0xa2, 0xd7, 0x46, 0x52,
    0x42, 0xa8, 0xdf, 0xb3, 0x69, 0x74, 0xc5, 0x51, 0xeb, 0x23, 0x29, 0x21,
    0xd4, 0xef, 0xd9, 0xb4, 0x3a, 0x62, 0x28, 0x75, 0x91, 0x14, 0x10, 0xea,
    0x77, 0x6c, 0xda, 0x1d,
  ]);

  const hexToBytes = (hex) => {
    const clean = hex.replace(/[^0-9A-Fa-f]/g, "");
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2)
      out[i / 2] = parseInt(clean.substr(i, 2), 16);
    return out;
  };
  const bytesToHex = (bytes) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  const stringToBytes = (str) => new TextEncoder().encode(str);
  const bytesToString = (bytes) => new TextDecoder().decode(bytes);

  const rotl32 = (x, r) => ((x << r) | (x >>> (32 - r))) >>> 0;
  const G_r = (word32, r) => {
    const b0 = (word32 >>> 24) & 0xff,
      b1 = (word32 >>> 16) & 0xff,
      b2 = (word32 >>> 8) & 0xff,
      b3 = word32 & 0xff;
    const sb0 = H[b0],
      sb1 = H[b1],
      sb2 = H[b2],
      sb3 = H[b3];
    return rotl32(((sb0 << 24) | (sb1 << 16) | (sb2 << 8) | sb3) >>> 0, r);
  };
  const G5 = (w) => G_r(w, 5),
    G13 = (w) => G_r(w, 13),
    G21 = (w) => G_r(w, 21);

  const splitKeyTo32 = (keyBytes) => {
    const kb = new Uint8Array(32);
    kb.set(keyBytes.slice(0, 32));
    const K = new Uint32Array(8);
    for (let i = 0; i < 8; i++)
      K[i] =
        (kb[i * 4] << 24) |
        (kb[i * 4 + 1] << 16) |
        (kb[i * 4 + 2] << 8) |
        kb[i * 4 + 3];
    return K;
  };

  const beltBlockEncrypt = (blockBytes, keyBytes) => {
    const X = new Uint32Array(4);
    for (let i = 0; i < 4; i++)
      X[i] =
        (blockBytes[i * 4] << 24) |
        (blockBytes[i * 4 + 1] << 16) |
        (blockBytes[i * 4 + 2] << 8) |
        blockBytes[i * 4 + 3];
    const K = splitKeyTo32(keyBytes);
    let [a, b, c, d] = X;
    const Kword = (idx) => K[(idx - 1) % 8];
    for (let i = 1; i <= 8; i++) {
      b ^= G5((a + Kword(7 * i - 6)) >>> 0);
      c ^= G21((d + Kword(7 * i - 5)) >>> 0);
      a ^= G13((b + Kword(7 * i - 4)) >>> 0);
      const e = G21((b ^ c ^ Kword(7 * i - 3)) >>> 0) ^ (i >>> 0);
      b = (b + e) >>> 0;
      c = (c + e) >>> 0;
      d ^= G13((c + Kword(7 * i - 2)) >>> 0);
      b ^= G21((a + Kword(7 * i - 1)) >>> 0);
      c ^= G5((d + Kword(7 * i)) >>> 0);
      [a, b] = [b, a];
      [c, d] = [d, c];
      [b, c] = [c, b];
    }
    const Y = new Uint8Array(16);
    const putWord = (off, w) => {
      Y[off] = (w >>> 24) & 0xff;
      Y[off + 1] = (w >>> 16) & 0xff;
      Y[off + 2] = (w >>> 8) & 0xff;
      Y[off + 3] = w & 0xff;
    };
    putWord(0, b);
    putWord(4, d);
    putWord(8, a);
    putWord(12, c);
    return Y;
  };

  const processCFB = (data, keyBytes, ivBytes, encrypt = true) => {
    if (ivBytes.length !== 16) throw new Error("IV must be 16 bytes");
    const out = new Uint8Array(data.length);
    let feedback = ivBytes.slice();
    for (let i = 0; i < data.length; i += 16) {
      const gamma = beltBlockEncrypt(feedback, keyBytes);
      const blockSize = Math.min(16, data.length - i);
      for (let j = 0; j < blockSize; j++) {
        if (encrypt) {
          out[i + j] = data[i + j] ^ gamma[j];
          feedback[j] = out[i + j];
        } else {
          out[i + j] = data[i + j] ^ gamma[j];
          feedback[j] = data[i + j];
        }
      }
    }
    return out;
  };

  const processData = () => {
    setStatus("Processing...");
    setTimeout(() => {
      try {
        const keyBytes = hexToBytes(key);
        const ivBytes = hexToBytes(iv);
        const data =
          operation === "encrypt"
            ? stringToBytes(inputText)
            : hexToBytes(inputText);
        const result = processCFB(
          data,
          keyBytes,
          ivBytes,
          operation === "encrypt"
        );
        setOutputText(
          operation === "encrypt" ? bytesToHex(result) : bytesToString(result)
        );
        setStatus("Success!");
      } catch (err) {
        setStatus("Error: " + err.message);
      }
    }, 50);
  };

  return (
    <div className="stb-cipher">
      <h2>СТБ 34.101.31-2011 (Belt) — Гаммирование с обратной связью</h2>

      <div className="controls">
        <div className="input-group">
          <label>Ключ (hex, 64 символа = 256 бит):</label>
          <input
            type="text"
            value={key}
            onChange={(e) =>
              setKey(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ""))
            }
            className="text-input"
          />
        </div>

        <div className="input-group">
          <label>IV (hex, 32 символа = 16 байт):</label>
          <input
            type="text"
            value={iv}
            onChange={(e) =>
              setIv(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ""))
            }
            className="text-input"
          />
        </div>

        <div className="operation-selector">
          <label>Операция:</label>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
          >
            <option value="encrypt">Шифрование</option>
            <option value="decrypt">Дешифрование</option>
          </select>
        </div>

        <div className="input-group">
          <label>
            {operation === "encrypt"
              ? "Текст для шифрования:"
              : "Hex для дешифрования:"}
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="text-area"
            rows={4}
          />
        </div>

        <button onClick={processData} className="process-btn">
          {operation === "encrypt" ? "Зашифровать" : "Расшифровать"}
        </button>

        <div className="input-group">
          <label>Результат:</label>
          <textarea
            value={outputText}
            readOnly
            className="text-area output"
            rows={4}
          />
        </div>

        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
};

export default Lab2;
