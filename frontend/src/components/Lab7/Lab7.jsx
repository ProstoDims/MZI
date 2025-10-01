import React, { useState } from "react";
import "./Lab7.css";

// ----- Нужные матем. утилиты -----
const powMod = (base, exponent, modulus) => {
  let result = 1n;
  base = ((base % modulus) + modulus) % modulus;
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) result = (result * base) % modulus;
    e >>= 1n;
    base = (base * base) % modulus;
  }
  return result;
};

// ----- Эллиптическая кривая (secp256k1) -----
class EllipticCurve {
  constructor(name) {
    this.name = name;
    this.p = BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F"
    );
    this.a = 0n;
    this.b = 7n;
    this.G = {
      x: BigInt(
        "0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"
      ),
      y: BigInt(
        "0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8"
      ),
    };
    this.n = BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
    );
  }

  mod(a) {
    const r = a % this.p;
    return r >= 0n ? r : r + this.p;
  }

  modInverse(a) {
    let t = 0n;
    let newT = 1n;
    let r = this.p;
    let newR = this.mod(a);
    while (newR !== 0n) {
      const q = r / newR;
      [t, newT] = [newT, t - q * newT];
      [r, newR] = [newR, r - q * newR];
    }
    if (r > 1n) throw new Error("Обратный элемент не существует");
    return this.mod(t);
  }

  pointAdd(P, Q) {
    if (!P) return Q;
    if (!Q) return P;

    // P + (-P) = O
    if (P.x === Q.x) {
      if (this.mod(P.y + Q.y) === 0n) return null;
    }

    // Удвоение
    if (P.x === Q.x && P.y === Q.y) {
      const num = this.mod(3n * P.x * P.x + this.a);
      const denInv = this.modInverse(this.mod(2n * P.y));
      const lambda = this.mod(num * denInv);
      const x3 = this.mod(lambda * lambda - 2n * P.x);
      const y3 = this.mod(lambda * (P.x - x3) - P.y);
      return { x: x3, y: y3 };
    }

    // Обычное сложение
    const num = this.mod(Q.y - P.y);
    const denInv = this.modInverse(this.mod(Q.x - P.x));
    const lambda = this.mod(num * denInv);
    const x3 = this.mod(lambda * lambda - P.x - Q.x);
    const y3 = this.mod(lambda * (P.x - x3) - P.y);
    return { x: x3, y: y3 };
  }

  pointMultiply(k, P) {
    if (!P || k === 0n) return null;
    let result = null;
    let addend = P;
    let kk = k;
    while (kk > 0n) {
      if (kk & 1n) {
        result = result ? this.pointAdd(result, addend) : addend;
      }
      addend = this.pointAdd(addend, addend);
      kk >>= 1n;
    }
    return result;
  }

  generatePrivateKey() {
    while (true) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      let k = 0n;
      for (let i = 0; i < bytes.length; i++) {
        k = (k << 8n) + BigInt(bytes[i]);
      }
      k = k % this.n;
      if (k > 0n) return k;
    }
  }

  pointToString(point) {
    if (!point) return "";
    return `04${point.x.toString(16).padStart(64, "0")}${point.y
      .toString(16)
      .padStart(64, "0")}`;
  }

  stringToPoint(str) {
    if (!str || str.length !== 130 || !str.startsWith("04")) return null;
    try {
      const x = BigInt("0x" + str.substring(2, 66));
      const y = BigInt("0x" + str.substring(66, 130));
      return { x, y };
    } catch {
      return null;
    }
  }

  // Лежандров символ / проверка квадратичного вычета
  isQuadraticResidue(a) {
    const ls = powMod(a, (this.p - 1n) / 2n, this.p);
    return ls === 1n;
  }

  // sqrt mod p (работает для p % 4 == 3, как в secp256k1)
  modSqrt(a) {
    if (a === 0n) return 0n;
    if (this.p % 4n === 3n) {
      return powMod(a, (this.p + 1n) / 4n, this.p);
    }
    return null;
  }
}

// ----- React компонент -----
const Lab7 = () => {
  const [mode, setMode] = useState("encrypt");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [curveParams, setCurveParams] = useState("secp256k1");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [status, setStatus] = useState("");
  const [curve] = useState(new EllipticCurve("secp256k1"));

  // ----- Утилиты для байтов/BigInt/строк -----
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const textToBytes = (text) => encoder.encode(text);
  const bytesToText = (bytes) => decoder.decode(bytes);

  const bytesToBigInt = (bytes) => {
    let res = 0n;
    for (let i = 0; i < bytes.length; i++) {
      res = (res << 8n) + BigInt(bytes[i]);
    }
    return res;
  };

  const bigIntToBytes = (num) => {
    if (num === 0n) return new Uint8Array([0]);
    let hex = num.toString(16);
    if (hex.length % 2) hex = "0" + hex;
    const len = hex.length / 2;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
  };

  // ----- Параметры кодирования -----
  const MAX_MESSAGE_BYTES = 30; // байт на блок (демонстрационно; можно менять)

  // Безопасная нарезка: НЕ режем UTF-8 посреди символа.
  // Наращиваем символы, пока байтовый размер не превысит лимит.
  const splitMessage = (msg, maxBytes = MAX_MESSAGE_BYTES) => {
    const chunks = [];
    let cur = "";
    let curBytes = 0;
    for (const ch of msg) {
      const b = encoder.encode(ch);
      if (curBytes + b.length > maxBytes) {
        if (cur.length === 0) {
          // символ сам по себе больше лимита — это редкий крайний случай
          throw new Error(
            `Символ занимает больше ${maxBytes} байт (невозможно упаковать)`
          );
        }
        chunks.push(cur);
        cur = ch;
        curBytes = b.length;
      } else {
        cur += ch;
        curBytes += b.length;
      }
    }
    if (cur.length > 0) chunks.push(cur);
    return chunks;
  };

  // ----- Обратимое кодирование text <-> point (Koblitz-like: m*256 + j) -----
  const textToPoint = (text) => {
    const bytes = textToBytes(text);
    if (bytes.length === 0) throw new Error("Пустое сообщение");
    if (bytes.length > MAX_MESSAGE_BYTES)
      throw new Error(`Блок больше ${MAX_MESSAGE_BYTES} байт`);

    const m = bytesToBigInt(bytes); // целое, представляющее блок
    for (let j = 0; j < 256; j++) {
      const x = m * 256n + BigInt(j);
      if (x >= curve.p) break;
      const rhs = curve.mod(x * x * x + curve.a * x + curve.b);
      if (!curve.isQuadraticResidue(rhs)) continue;
      const y = curve.modSqrt(rhs);
      if (y === null) continue;
      return { x, y }; // x уже содержит m*256+j — в pointToText возьмём floor(x/256) и восстановим bytes
    }
    throw new Error("Не удалось закодировать блок в точку (нет подходящего x)");
  };

  const pointToText = (point) => {
    if (!point) return "";
    const x = point.x;
    const m = x >> 8n; // floor(x / 256)
    const bytes = bigIntToBytes(m);
    return bytesToText(bytes);
  };

  // ----- Ключи -----
  const generateKeyPair = () => {
    setStatus("Генерация ключевой пары...");
    try {
      const d = curve.generatePrivateKey();
      const Q = curve.pointMultiply(d, curve.G);
      if (!Q) throw new Error("Ошибка генерации публичного ключа");
      setPrivateKey(d.toString(16).padStart(64, "0"));
      setPublicKey(curve.pointToString(Q));
      setStatus("Ключи сгенерированы");
    } catch (err) {
      setStatus("Ошибка: " + err.message);
    }
  };

  // ----- Шифрование (блоки) -----
  const encryptText = () => {
    if (!publicKey) {
      setStatus("Ошибка: сначала сгенерируйте ключевую пару");
      return;
    }
    if (!inputText) {
      setStatus("Ошибка: введите текст");
      return;
    }

    setStatus("Шифрование...");
    try {
      const Pb = curve.stringToPoint(publicKey);
      if (!Pb) throw new Error("Неверный публичный ключ");

      const chunks = splitMessage(inputText, MAX_MESSAGE_BYTES);
      const blocks = chunks.map((block) => {
        const M = textToPoint(block);
        const k = curve.generatePrivateKey();
        const C1 = curve.pointMultiply(k, curve.G);
        const kPb = curve.pointMultiply(k, Pb);
        const C2 = curve.pointAdd(M, kPb);
        return { C1: curve.pointToString(C1), C2: curve.pointToString(C2) };
      });

      const encrypted = { curve: curveParams, blocks, timestamp: Date.now() };
      setOutputText(JSON.stringify(encrypted, null, 2));
      setStatus(`Зашифровано (${blocks.length} блоков)`);
    } catch (err) {
      setStatus("Ошибка при шифровании: " + err.message);
    }
  };

  // ----- Дешифрование (блоки) -----
  const decryptText = () => {
    if (!privateKey) {
      setStatus("Ошибка: укажите приватный ключ");
      return;
    }
    if (!inputText) {
      setStatus("Ошибка: вставьте JSON с блоками");
      return;
    }

    setStatus("Дешифрование...");
    try {
      const enc = JSON.parse(inputText);
      if (!enc.blocks || !Array.isArray(enc.blocks))
        throw new Error("Неверный формат: нет массива блоков");

      const d = BigInt("0x" + privateKey);
      const resultBlocks = enc.blocks.map(({ C1, C2 }, idx) => {
        const C1p = curve.stringToPoint(C1);
        const C2p = curve.stringToPoint(C2);
        if (!C1p || !C2p)
          throw new Error(`Неверный формат точек в блоке ${idx}`);

        const sC1 = curve.pointMultiply(d, C1p);
        if (!sC1) throw new Error(`sC1 = O для блока ${idx} (ключ?)`);
        const negS = { x: sC1.x, y: curve.mod(-sC1.y) };
        const M = curve.pointAdd(C2p, negS);
        if (!M) throw new Error(`Восстановленная точка = O для блока ${idx}`);
        return pointToText(M);
      });

      setOutputText(resultBlocks.join(""));
      setStatus(`Дешифровано (${resultBlocks.length} блоков)`);
    } catch (err) {
      setStatus("Ошибка при дешифровании: " + err.message);
    }
  };

  const handleProcess = () => {
    if (mode === "encrypt") encryptText();
    else decryptText();
  };

  const clearAll = () => {
    setInputText("");
    setOutputText("");
    setStatus("");
  };

  return (
    <div className="lab-content">
      <h2>Эль-Гамаль на эллиптических кривых (блоки, обратимая кодировка)</h2>

      <div className="lab-info">
        <p>
          Схема: блоки (UTF-8 safe) → обратимое кодирование в точку → C1 = kG,
          C2 = M + k·Pb
        </p>
        <p style={{ color: "gray" }}>Макс байт на блок: {MAX_MESSAGE_BYTES}</p>
      </div>

      <div className="lab-controls">
        <div className="mode-selector">
          <label className="radio-label">
            <input
              type="radio"
              name="mode"
              value="encrypt"
              checked={mode === "encrypt"}
              onChange={(e) => setMode(e.target.value)}
            />
            Шифрование
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="mode"
              value="decrypt"
              checked={mode === "decrypt"}
              onChange={(e) => setMode(e.target.value)}
            />
            Дешифрование
          </label>
        </div>

        <div className="input-group">
          <label>Параметры кривой:</label>
          <select
            className="text-input"
            value={curveParams}
            onChange={(e) => setCurveParams(e.target.value)}
          >
            <option value="secp256k1">secp256k1 (Bitcoin)</option>
          </select>
        </div>

        <div className="input-group">
          <label>Приватный ключ (hex):</label>
          <div className="key-input">
            <input
              type="text"
              className="text-input"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Приватный ключ будет сгенерирован"
            />
            <button className="generate-btn" onClick={generateKeyPair}>
              Сгенерировать ключи
            </button>
          </div>
        </div>

        <div className="input-group">
          <label>Публичный ключ:</label>
          <textarea
            className="text-area"
            rows="2"
            value={publicKey}
            readOnly
            placeholder="Публичный ключ появится здесь после генерации"
          />
        </div>

        <div className="input-group">
          <label>
            {mode === "encrypt"
              ? "Исходный текст:"
              : "Зашифрованные данные (JSON):"}
          </label>
          <textarea
            className="text-area"
            rows="4"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              mode === "encrypt"
                ? "Введите текст (любой длины — он разобьётся на блоки)"
                : "Вставьте сюда JSON, полученный ранее"
            }
          />
        </div>

        <button className="process-btn" onClick={handleProcess}>
          {mode === "encrypt" ? "Зашифровать" : "Дешифровать"}
        </button>
        <button className="generate-btn" onClick={clearAll}>
          Очистить все
        </button>

        {status && <div className="status-message">{status}</div>}

        <div className="input-group">
          <label>Результат:</label>
          <textarea
            className="text-area output"
            rows="6"
            value={outputText}
            readOnly
          />
        </div>
      </div>
    </div>
  );
};

export default Lab7;
