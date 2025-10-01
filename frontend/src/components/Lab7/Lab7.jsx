import React, { useState } from "react";
import "./Lab7.css";

// Упрощённая, но рабочая реализация эллиптической арифметики и ElGamal-ish схемы
class EllipticCurve {
  constructor(name) {
    this.name = name;
    // secp256k1 параметры
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
    let t = 0n,
      newT = 1n;
    let r = this.p,
      newR = this.mod(a);
    while (newR !== 0n) {
      const q = r / newR;
      [t, newT] = [newT, t - q * newT];
      [r, newR] = [newR, r - q * newR];
    }
    if (r > 1n) throw new Error("Обратный элемент не существует");
    return this.mod(t);
  }

  // Проверка на бесконечность (null)
  isInfinity(P) {
    return P === null;
  }

  // Сложение точек, учитывая P + (-P) = O
  pointAdd(P, Q) {
    if (!P) return Q;
    if (!Q) return P;

    const px = P.x,
      py = P.y;
    const qx = Q.x,
      qy = Q.y;

    if (px === qx) {
      if (this.mod(py + qy) === 0n) {
        // P + (-P) = O
        return null;
      }
      // тогда P === Q → удвоение ниже
    }

    // Удвоение
    if (px === qx && py === qy) {
      const numerator = this.mod(3n * px * px + this.a);
      const denomInv = this.modInverse(this.mod(2n * py));
      const lambda = this.mod(numerator * denomInv);
      const xr = this.mod(lambda * lambda - 2n * px);
      const yr = this.mod(lambda * (px - xr) - py);
      return { x: xr, y: yr };
    }

    // Обычное сложение P != Q
    const numerator = this.mod(qy - py);
    const denomInv = this.modInverse(this.mod(qx - px));
    const lambda = this.mod(numerator * denomInv);
    const xr = this.mod(lambda * lambda - px - qx);
    const yr = this.mod(lambda * (px - xr) - py);
    return { x: xr, y: yr };
  }

  // Умножение точки на скаляр (double-and-add)
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

  // Генерация приватного ключа 0 < key < n
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

  // проверяет, является ли a квадратичным вычетом (Лежандров символ)
  isQuadraticResidue(a) {
    const ls = powMod(a, (this.p - 1n) / 2n, this.p);
    return ls === 1n;
  }

  // вычисление sqrt мод p (работает для p % 4 == 3)
  modSqrt(a) {
    if (a === 0n) return 0n;
    if (this.p % 4n === 3n) {
      return powMod(a, (this.p + 1n) / 4n, this.p);
    }
    // Для простоты: мы поддерживаем только p%4==3 (secp256k1 удовлетворяет)
    return null;
  }
}

// Быстрое возведение в степень по модулю (используем в коде)
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

  // --- Утилиты для работы с байтами/строками/BigInt ---
  const textToBytes = (text) => new TextEncoder().encode(text);
  const bytesToText = (bytes) => new TextDecoder().decode(bytes);

  const bytesToBigInt = (bytes) => {
    let res = 0n;
    for (let i = 0; i < bytes.length; i++) {
      res = (res << 8n) + BigInt(bytes[i]);
    }
    return res;
  };

  const bigIntToBytes = (num) => {
    // Возвращает минимальный массив байт, ведущие нули отброшены
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

  // ---- Обратимое кодирование текста в точку и обратно ----
  // Метод: m = bytes_as_int, пробуем x = m*256 + j, j=0..255, ищем y, такое что (x,y) на кривой.
  // Ограничение длины: m*256+255 < p → bytes length limited.
  const MAX_MESSAGE_BYTES = 30; // безопасный лимит для демо на secp256k1 (30 байт << 256 bits)
  const textToPoint = (text) => {
    const bytes = textToBytes(text);
    if (bytes.length === 0) throw new Error("Пустое сообщение");
    if (bytes.length > MAX_MESSAGE_BYTES)
      throw new Error(
        `Сообщение слишком длинное — максимум ${MAX_MESSAGE_BYTES} байт`
      );

    const m = bytesToBigInt(bytes); // целое, представляющее сообщение
    // мы будем пробовать j в диапазоне 0..255
    for (let j = 0; j < 256; j++) {
      const x = m * 256n + BigInt(j);
      if (x >= curve.p) break; // дальше уже невалидно
      const rhs = curve.mod(x * x * x + curve.a * x + curve.b);
      // проверяем, квадратичный ли это остаток
      if (!curve.isQuadraticResidue(rhs)) continue;
      // получаем y
      const y = curve.modSqrt(rhs);
      if (y === null) continue;
      // выберем положительную ветвь y (можно и любую)
      return { x: x, y: y };
    }
    throw new Error(
      "Не удалось закодировать текст в точку (нет подходящего x)"
    );
  };

  const pointToText = (point) => {
    if (!point) return "";
    const x = point.x;
    // m = floor(x / 256)
    const m = x >> 8n; // деление на 256
    const bytes = bigIntToBytes(m);
    // удалим ведущие нули если есть (bigIntToBytes уже минимален)
    return bytesToText(bytes);
  };

  // ---- Ключи ----
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

  // ---- ElGamal-like шифрование: C1 = kG, C2 = M + k*Pb ----
  const encryptText = () => {
    if (!publicKey) {
      setStatus("Сначала сгенерируйте публичный ключ");
      return;
    }
    if (!inputText) {
      setStatus("Введите текст для шифрования");
      return;
    }

    setStatus("Шифрование...");
    try {
      // кодируем сообщение в точку M (обратимо)
      const M = textToPoint(inputText);

      // ephemeral
      const k = curve.generatePrivateKey();
      const C1 = curve.pointMultiply(k, curve.G);

      const Pb = curve.stringToPoint(publicKey);
      if (!Pb) throw new Error("Неверный формат публичного ключа");

      const kPb = curve.pointMultiply(k, Pb);
      const C2 = curve.pointAdd(M, kPb);

      const encrypted = {
        curve: curveParams,
        C1: curve.pointToString(C1),
        C2: curve.pointToString(C2),
        timestamp: Date.now(),
      };

      setOutputText(JSON.stringify(encrypted, null, 2));
      setStatus("Зашифровано (ElGamal on EC)");
    } catch (err) {
      setStatus("Ошибка при шифровании: " + err.message);
    }
  };

  // ---- Дешифрование ElGamal: M = C2 - d*C1 ----
  const decryptText = () => {
    if (!privateKey) {
      setStatus("Укажите приватный ключ");
      return;
    }
    if (!inputText) {
      setStatus("Вставьте зашифрованный JSON");
      return;
    }

    setStatus("Дешифрование...");
    try {
      const enc = JSON.parse(inputText);
      const C1 = curve.stringToPoint(enc.C1);
      const C2 = curve.stringToPoint(enc.C2);
      if (!C1 || !C2) throw new Error("Неверный формат C1/C2");

      const d = BigInt("0x" + privateKey);
      // s = d * C1
      const sC1 = curve.pointMultiply(d, C1);
      if (!sC1) throw new Error("sC1 = O (ошибка ключа?)");

      // -sC1
      const negS = { x: sC1.x, y: curve.mod(-sC1.y) };

      const M = curve.pointAdd(C2, negS);
      if (!M) throw new Error("Восстановленная точка = бесконечность");

      const plaintext = pointToText(M);
      setOutputText(plaintext);
      setStatus("Дешифровано (ElGamal on EC)");
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
      <h2>Аналог Эль-Гамаля на эллиптических кривых (обратимое кодирование)</h2>
      <div className="lab-info">
        <p>
          Схема: кодируем сообщение в точку M (обратимо) → C1 = kG, C2 = M +
          k*Pb. Дешифровка: M = C2 − d*C1, затем M → текст.
        </p>
        <p style={{ color: "gray" }}>
          Примечание: сообщение ограничено по длине (по умолчанию{" "}
          {MAX_MESSAGE_BYTES} байт) из-за способа кодирования.
        </p>
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
              placeholder="Приватный ключ будет сгенерирован автоматически"
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
              ? `Исходный текст (макс ${MAX_MESSAGE_BYTES} байт):`
              : "Зашифрованные данные (JSON):"}
          </label>
          <textarea
            className="text-area"
            rows="4"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              mode === "encrypt"
                ? "Введите текст для шифрования (короткий)"
                : "Вставьте сюда JSON с C1 и C2"
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
            placeholder={
              mode === "encrypt"
                ? "Здесь появятся C1 и C2 в JSON"
                : "Здесь появится дешифрованный текст"
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Lab7;
