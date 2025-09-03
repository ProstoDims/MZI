import { useState } from "react";
import "./Lab1.css";

const S_BOXES = [
  [4, 10, 9, 2, 13, 8, 0, 14, 6, 11, 1, 12, 7, 15, 5, 3],
  [14, 11, 4, 12, 6, 13, 15, 10, 2, 3, 8, 1, 0, 7, 5, 9],
  [5, 8, 1, 13, 10, 3, 4, 2, 14, 15, 12, 7, 6, 0, 9, 11],
  [7, 13, 10, 1, 0, 8, 9, 15, 14, 4, 6, 12, 11, 2, 5, 3],
  [6, 12, 7, 1, 5, 15, 13, 8, 4, 10, 9, 14, 0, 3, 11, 2],
  [4, 11, 10, 0, 7, 2, 1, 13, 3, 6, 8, 5, 9, 12, 15, 14],
  [13, 11, 4, 1, 3, 15, 5, 9, 0, 10, 14, 7, 6, 8, 2, 12],
  [1, 15, 13, 0, 5, 7, 10, 4, 9, 2, 3, 14, 6, 11, 8, 12],
];

const BLOCK_SIZE = 8;

const Lab1 = () => {
  const [inputText, setInputText] = useState("");
  const [key, setKey] = useState(
    "00112233445566778899AABBCCDDEEFF00112233445566778899AABBCCDDEEFF"
  );
  const [iv, setIv] = useState("1122334455667788");
  const [outputText, setOutputText] = useState("");
  const [mode, setMode] = useState("encrypt");
  const [status, setStatus] = useState("");

  const stringToBytes = (str) => {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes;
  };

  const bytesToString = (bytes) => {
    let str = "";
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return str;
  };

  const hexToBytes = (hex) => {
    const clean = hex.replace(/\s+/g, "").toLowerCase();
    if (clean.length % 2 !== 0) throw new Error("HEX длина должна быть чётной");
    if (!/^[0-9a-f]*$/.test(clean))
      throw new Error("Только HEX-символы 0-9 a-f");
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
      out[i / 2] = parseInt(clean.substr(i, 2), 16);
    }
    return out;
  };

  const bytesToHex = (bytes) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const feistelFunction = (data, roundKey) => {
    let temp = (data + roundKey) >>> 0;

    let result = 0;
    for (let i = 0; i < 8; i++) {
      const fourBits = (temp >>> (4 * i)) & 0xf;
      const sub = S_BOXES[i][fourBits] & 0xf;
      result |= sub << (4 * i);
    }

    result = ((result << 11) | (result >>> (32 - 11))) >>> 0;
    return result >>> 0;
  };

  const generateRoundKeys = (keyBytes) => {
    const keys = [];
    for (let i = 0; i < 8; i++) {
      const k =
        (keyBytes[i * 4] << 24) |
        (keyBytes[i * 4 + 1] << 16) |
        (keyBytes[i * 4 + 2] << 8) |
        keyBytes[i * 4 + 3];
      keys.push(k >>> 0);
    }
    return keys;
  };

  const processBlock = (block, roundKeys, encrypt) => {
    let l =
      (block[0] << 24) | (block[1] << 16) | (block[2] << 8) | (block[3] & 0xff);
    let r =
      (block[4] << 24) | (block[5] << 16) | (block[6] << 8) | (block[7] & 0xff);

    l = l >>> 0;
    r = r >>> 0;

    for (let round = 0; round < 32; round++) {
      const oldL = l;
      let keyIndex;

      if (encrypt) {
        keyIndex = round < 24 ? round % 8 : 7 - (round % 8);
      } else {
        keyIndex = round < 8 ? round % 8 : 7 - (round % 8);
      }

      l = r;
      const f = feistelFunction(r, roundKeys[keyIndex]);
      r = (oldL ^ f) >>> 0;
    }

    const out = new Uint8Array(BLOCK_SIZE);
    out[0] = (r >>> 24) & 0xff;
    out[1] = (r >>> 16) & 0xff;
    out[2] = (r >>> 8) & 0xff;
    out[3] = r & 0xff;
    out[4] = (l >>> 24) & 0xff;
    out[5] = (l >>> 16) & 0xff;
    out[6] = (l >>> 8) & 0xff;
    out[7] = l & 0xff;
    return out;
  };

  const processGamma = (data, keyStr) => {
    const keyBytes = hexToBytes(keyStr);
    if (keyBytes.length !== 32)
      throw new Error("Key must be 32 bytes (64 hex characters)");

    const roundKeys = generateRoundKeys(keyBytes);
    let ivBytes = hexToBytes(iv);
    if (ivBytes.length !== 8) throw new Error("IV должен быть 8 байт (16 hex)");

    const res = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i += BLOCK_SIZE) {
      const gamma = processBlock(ivBytes, roundKeys, true);

      const chunk = data.slice(i, i + BLOCK_SIZE);
      for (let j = 0; j < chunk.length; j++) {
        res[i + j] = chunk[j] ^ gamma[j];
      }

      ivBytes = gamma;
    }
    return res;
  };

  const handleProcessText = () => {
    setStatus("Processing...");
    try {
      let data;
      if (mode === "encrypt") {
        data = stringToBytes(inputText);
      } else {
        data = hexToBytes(inputText);
      }

      const result = processGamma(data, key);
      if (!result) return;

      if (mode === "encrypt") {
        setOutputText(bytesToHex(result));
      } else {
        setOutputText(bytesToString(result));
      }
      setStatus("Success!");
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const generateRandomKey = () => {
    const randomKey = new Uint8Array(32);
    crypto.getRandomValues(randomKey);
    setKey(bytesToHex(randomKey).toUpperCase());
  };

  const generateRandomIv = () => {
    const randomIv = new Uint8Array(8);
    crypto.getRandomValues(randomIv);
    setIv(bytesToHex(randomIv).toUpperCase());
  };

  return (
    <div className="lab-content">
      <h2>ГОСТ 28147-89 (Гаммирование)</h2>

      <div className="lab-controls">
        <div className="mode-selector">
          <label className="radio-label">
            <input
              type="radio"
              value="encrypt"
              checked={mode === "encrypt"}
              onChange={(e) => setMode(e.target.value)}
            />
            <span>Шифрование</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              value="decrypt"
              checked={mode === "decrypt"}
              onChange={(e) => setMode(e.target.value)}
            />
            <span>Дешифрование</span>
          </label>
        </div>

        <div className="input-group">
          <label>Ключ (64 hex символа):</label>
          <div className="key-input">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="64 HEX символа"
              className="text-input"
            />
            <button onClick={generateRandomKey} className="generate-btn">
              Сгенерировать
            </button>
          </div>
        </div>

        <div className="input-group">
          <label>IV (16 hex символов):</label>
          <div className="key-input">
            <input
              type="text"
              value={iv}
              onChange={(e) => setIv(e.target.value)}
              placeholder="16 HEX символов"
              className="text-input"
            />
            <button onClick={generateRandomIv} className="generate-btn">
              Сгенерировать IV
            </button>
          </div>
        </div>

        <div className="input-group">
          <label>Текст:</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              mode === "encrypt"
                ? "Введите текст для шифрования"
                : "Вставьте HEX для дешифрования"
            }
            className="text-area"
            rows={4}
          />
        </div>

        <button onClick={handleProcessText} className="process-btn">
          {mode === "encrypt" ? "Зашифровать" : "Расшифровать"}
        </button>

        <div className="input-group">
          <label>Результат:</label>
          <textarea
            value={outputText}
            readOnly
            className="text-area output"
            rows={6}
          />
        </div>

        {status && <div className="status-message">{status}</div>}
      </div>
    </div>
  );
};

export default Lab1;
