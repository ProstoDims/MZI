// Lab6.jsx
import React, { useState } from "react";
import "./Lab6.css";

const Lab6 = () => {
  const [mode, setMode] = useState("generate");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState("");

  // ------------------------
  // ПАРАМЕТРЫ КРИВОЙ secp256k1 (как в Bitcoin)
  // ------------------------
  const curveParams = {
    p: BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F"
    ),
    a: BigInt(0),
    b: BigInt(7),
    q: BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
    ),
    // Базовая точка G для secp256k1
    x: BigInt(
      "0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"
    ),
    y: BigInt(
      "0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8"
    ),
  };

  // ------------------------
  // Утилиты: конвертации
  // ------------------------
  const safeHexToBigInt = (hex) => {
    try {
      if (!hex || typeof hex !== "string") {
        throw new Error("Пустая строка или неверный тип");
      }
      let cleanHex = hex.replace(/^0x/i, "").replace(/\s/g, "").trim();
      if (cleanHex.length === 0) {
        throw new Error("Пустая строка после очистки");
      }
      if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
        throw new Error(`Содержит не-hex символы: ${cleanHex}`);
      }
      return BigInt("0x" + cleanHex);
    } catch (error) {
      console.error("Ошибка преобразования hex:", hex, error);
      throw new Error(`Неверный hex формат: ${error.message}`);
    }
  };

  const bigIntToHex = (num) => {
    try {
      if (typeof num !== "bigint") num = BigInt(num);
      let hex = num.toString(16);
      if (hex.length % 2) hex = "0" + hex;
      return "0x" + hex.toUpperCase();
    } catch (error) {
      throw new Error(`Ошибка преобразования в hex: ${error.message}`);
    }
  };

  // ------------------------
  // Модулярная арифметика
  // ------------------------
  const mod = (a, m) => {
    let res = a % m;
    return res >= BigInt(0) ? res : res + m;
  };

  const modAdd = (a, b, m) => mod(a + b, m);
  const modSub = (a, b, m) => mod(a - b, m);
  const modMul = (a, b, m) => mod(a * b, m);

  const modPow = (base, exponent, modulus) => {
    if (modulus === BigInt(1)) return BigInt(0);
    let result = BigInt(1);
    base = mod(base, modulus);

    while (exponent > BigInt(0)) {
      if (exponent % BigInt(2) === BigInt(1)) {
        result = modMul(result, base, modulus);
      }
      exponent = exponent / BigInt(2);
      base = modMul(base, base, modulus);
    }
    return result;
  };

  const modInverse = (a, m) => {
    // Используем малую теорему Ферма для простых модулей
    return modPow(a, m - BigInt(2), m);
  };

  // ------------------------
  // Операции с точками эллиптической кривой
  // ------------------------
  const isInfinity = (P) => P === null;

  const pointDouble = (P) => {
    if (isInfinity(P)) return null;
    const p = curveParams.p;

    if (P.y === BigInt(0)) return null;

    // slope = (3*x² + a) / (2*y) mod p
    const numerator = modAdd(
      modMul(BigInt(3), modMul(P.x, P.x, p), p),
      curveParams.a,
      p
    );
    const denominator = modMul(BigInt(2), P.y, p);
    const slope = modMul(numerator, modInverse(denominator, p), p);

    const x3 = modSub(modMul(slope, slope, p), modMul(BigInt(2), P.x, p), p);
    const y3 = modSub(modMul(slope, modSub(P.x, x3, p), p), P.y, p);

    return { x: x3, y: y3 };
  };

  const pointAdd = (P1, P2) => {
    if (isInfinity(P1)) return P2;
    if (isInfinity(P2)) return P1;

    const p = curveParams.p;

    if (P1.x === P2.x) {
      if (P1.y === P2.y) {
        return pointDouble(P1);
      } else {
        return null;
      }
    }

    const slope = modMul(
      modSub(P2.y, P1.y, p),
      modInverse(modSub(P2.x, P1.x, p), p),
      p
    );

    const x3 = modSub(modSub(modMul(slope, slope, p), P1.x, p), P2.x, p);
    const y3 = modSub(modMul(slope, modSub(P1.x, x3, p), p), P1.y, p);

    return { x: x3, y: y3 };
  };

  const pointMultiply = (k, P) => {
    if (isInfinity(P) || k === BigInt(0)) return null;
    if (k === BigInt(1)) return P;

    let result = null;
    let addend = P;
    let kTemp = k;

    while (kTemp > BigInt(0)) {
      if (kTemp & BigInt(1)) {
        result = result ? pointAdd(result, addend) : addend;
      }
      addend = pointDouble(addend);
      kTemp = kTemp >> BigInt(1);
    }

    return result;
  };

  // ------------------------
  // Криптографический хеш (упрощенный SHA-256)
  // ------------------------
  const hashMessage = (msg) => {
    // Упрощенная имитация SHA-256
    let hash = BigInt(0x6a09e667);

    for (let i = 0; i < msg.length; i++) {
      const charCode = BigInt(msg.charCodeAt(i));
      // Простая хеш-функция на основе сдвигов и XOR
      hash = (hash << BigInt(5)) ^ (hash >> BigInt(2)) ^ charCode;
      hash = hash & BigInt(0xffffffff);
    }

    // Преобразуем в число в диапазоне [1, q-1]
    let result = mod(hash, curveParams.q - BigInt(1)) + BigInt(1);
    return result;
  };

  // ------------------------
  // Генерация случайного BigInt
  // ------------------------
  const generateRandomBigInt = (max) => {
    const bytesNeeded = Math.ceil(max.toString(16).length / 2);
    const randomBuffer = new Uint8Array(bytesNeeded);
    crypto.getRandomValues(randomBuffer);

    let result = BigInt(0);
    for (let i = 0; i < bytesNeeded; i++) {
      result = (result << BigInt(8)) | BigInt(randomBuffer[i]);
    }

    return (result % (max - BigInt(1))) + BigInt(1);
  };

  // ------------------------
  // Генерация ключей
  // ------------------------
  const generateKeys = () => {
    try {
      setStatus("Генерация ключей...");

      // Генерируем случайный приватный ключ
      const d = generateRandomBigInt(curveParams.q);

      const G = { x: curveParams.x, y: curveParams.y };
      const Q = pointMultiply(d, G);

      if (isInfinity(Q)) {
        throw new Error("Публичный ключ = бесконечность");
      }

      const privKeyHex = bigIntToHex(d);
      const pubKeyHex = `${bigIntToHex(Q.x)},${bigIntToHex(Q.y)}`;

      setPrivateKey(privKeyHex);
      setPublicKey(pubKeyHex);
      setStatus("✓ Ключи успешно сгенерированы");

      console.log("Приватный ключ сгенерирован");
      console.log("Публичный ключ:", Q);
    } catch (error) {
      console.error("Ошибка генерации ключей:", error);
      setStatus(`✗ Ошибка генерации ключей: ${error.message}`);
    }
  };

  // ------------------------
  // Генерация подписи ECDSA
  // ------------------------
  const generateSignature = () => {
    if (!privateKey || !message) {
      setStatus("✗ Заполните приватный ключ и сообщение");
      return;
    }

    try {
      setStatus("Создание подписи...");

      const d = safeHexToBigInt(privateKey);
      const h = hashMessage(message);
      const G = { x: curveParams.x, y: curveParams.y };

      let r, s;
      let attempts = 0;

      do {
        attempts++;
        if (attempts > 100) {
          throw new Error("Не удалось создать подпись после 100 попыток");
        }

        // Генерируем случайный эфемерный ключ
        const k = generateRandomBigInt(curveParams.q);

        const R = pointMultiply(k, G);

        if (isInfinity(R)) continue;

        r = mod(R.x, curveParams.q);
        if (r === BigInt(0)) continue;

        // s = k⁻¹ * (h + r*d) mod q
        const kInv = modInverse(k, curveParams.q);
        s = modMul(
          kInv,
          modAdd(h, modMul(r, d, curveParams.q), curveParams.q),
          curveParams.q
        );

        if (s !== BigInt(0)) break;
      } while (true);

      const signatureHex = `${bigIntToHex(r)},${bigIntToHex(s)}`;
      setSignature(signatureHex);
      setStatus("✓ ЭЦП успешно создана");

      console.log("Подпись создана:");
      console.log("r:", r.toString(16));
      console.log("s:", s.toString(16));
    } catch (error) {
      console.error("Ошибка создания подписи:", error);
      setStatus(`✗ Ошибка создания подписи: ${error.message}`);
    }
  };

  // ------------------------
  // Проверка подписи ECDSA
  // ------------------------
  const verifySignature = () => {
    if (!publicKey || !message || !signature) {
      setStatus("✗ Заполните все поля для проверки");
      return;
    }

    try {
      setStatus("Проверка подписи...");

      // Парсим публичный ключ
      const pubParts = publicKey.split(",");
      if (pubParts.length !== 2) {
        setStatus("✗ Неверный формат публичного ключа");
        return;
      }

      const Q = {
        x: safeHexToBigInt(pubParts[0]),
        y: safeHexToBigInt(pubParts[1]),
      };

      // Парсим подпись
      const sigParts = signature.split(",");
      if (sigParts.length !== 2) {
        setStatus("✗ Неверный формат подписи");
        return;
      }

      const r = safeHexToBigInt(sigParts[0]);
      const s = safeHexToBigInt(sigParts[1]);

      // Проверяем диапазоны
      if (
        r <= BigInt(0) ||
        r >= curveParams.q ||
        s <= BigInt(0) ||
        s >= curveParams.q
      ) {
        setStatus("✗ ЭЦП недействительна: параметры вне диапазона");
        return;
      }

      const h = hashMessage(message);

      // Алгоритм проверки ECDSA:
      const w = modInverse(s, curveParams.q);
      const u1 = modMul(h, w, curveParams.q);
      const u2 = modMul(r, w, curveParams.q);

      const G = { x: curveParams.x, y: curveParams.y };
      const point1 = pointMultiply(u1, G);
      const point2 = pointMultiply(u2, Q);

      if (isInfinity(point1) || isInfinity(point2)) {
        setStatus("✗ ЭЦП недействительна");
        return;
      }

      const R = pointAdd(point1, point2);

      if (isInfinity(R)) {
        setStatus("✗ ЭЦП недействительна");
        return;
      }

      const v = mod(R.x, curveParams.q);
      const isValid = v === r;

      setStatus(isValid ? "✓ ЭЦП действительна" : "✗ ЭЦП недействительна");

      if (!isValid) {
        console.log("Ошибка проверки:");
        console.log("v:", v.toString(16));
        console.log("r:", r.toString(16));
      }
    } catch (error) {
      console.error("Ошибка проверки подписи:", error);
      setStatus(`✗ Ошибка проверки подписи: ${error.message}`);
    }
  };

  // ------------------------
  // Дополнительные функции
  // ------------------------
  const clearAll = () => {
    setPrivateKey("");
    setPublicKey("");
    setMessage("");
    setSignature("");
    setStatus("");
  };

  const formatKeyForDisplay = (key) => {
    if (!key) return "";
    return key.length > 30 ? key.substring(0, 30) + "..." : key;
  };

  return (
    <div className="lab-content">
      <h2>ЭЦП на эллиптической кривой secp256k1</h2>

      <div className="mode-selector">
        <label className="radio-label">
          <input
            type="radio"
            value="generate"
            checked={mode === "generate"}
            onChange={(e) => setMode(e.target.value)}
          />
          Генерация ЭЦП
        </label>
        <label className="radio-label">
          <input
            type="radio"
            value="verify"
            checked={mode === "verify"}
            onChange={(e) => setMode(e.target.value)}
          />
          Проверка ЭЦП
        </label>
      </div>

      <div className="lab-controls">
        <div className="input-group">
          <label>Приватный ключ (256 бит):</label>
          <div className="key-input">
            <input
              type="text"
              className="text-input"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x..."
            />
            <button className="generate-btn" onClick={generateKeys}>
              Сгенерировать
            </button>
          </div>
          {privateKey && (
            <div className="key-preview">
              Приватный ключ: {formatKeyForDisplay(privateKey)}
            </div>
          )}
        </div>

        <div className="input-group">
          <label>Публичный ключ (x,y):</label>
          <input
            type="text"
            className="text-input"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="0x...,0x..."
          />
          {publicKey && (
            <div className="key-preview">
              Публичный ключ: {formatKeyForDisplay(publicKey)}
            </div>
          )}
        </div>

        <div className="input-group">
          <label>Сообщение:</label>
          <textarea
            className="text-area"
            rows="3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите сообщение для подписи/проверки..."
          />
        </div>

        <div className="input-group">
          <label>Электронная подпись (r,s):</label>
          <textarea
            className="text-area output"
            rows="2"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={
              mode === "generate"
                ? "Здесь появится подпись в формате 0xR,0xS"
                : "Введите подпись для проверки в формате 0xR,0xS"
            }
            readOnly={mode === "generate"}
          />
        </div>

        <div className="action-buttons">
          {mode === "generate" ? (
            <button className="process-btn" onClick={generateSignature}>
              Сгенерировать ЭЦП
            </button>
          ) : (
            <button className="process-btn" onClick={verifySignature}>
              Проверить ЭЦП
            </button>
          )}
          <button className="clear-btn" onClick={clearAll}>
            Очистить
          </button>
        </div>

        {status && (
          <div
            className={`status-message ${
              status.includes("✓") ? "status-success" : "status-error"
            }`}
          >
            {status}
          </div>
        )}

        <div className="info-panel">
          <h4>Информация о кривой:</h4>
          <ul>
            <li>Кривая: secp256k1 (используется в Bitcoin)</li>
            <li>Размер ключа: 256 бит</li>
            <li>
              Порядок группы: {curveParams.q.toString(16).substring(0, 20)}...
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Lab6;
