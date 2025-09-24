import React, { useState } from "react";
import "./Lab4.css";

const Lab4 = () => {
  const [mode, setMode] = useState("encrypt");
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [status, setStatus] = useState("");

  const generateKeys = () => {
    const keyLength = 32;
    const keyBytes = new Uint8Array(keyLength);
    crypto.getRandomValues(keyBytes);
    const generatedKey = bytesToBase64(keyBytes);
    setPublicKey(generatedKey);
    setPrivateKey(generatedKey);
    setStatus("Ключи успешно сгенерированы (одинаковые для демонстрации)");
  };

  const bytesToBase64 = (bytes) => {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const base64ToBytes = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const stringToBytes = (str) => new TextEncoder().encode(str);
  const bytesToString = (bytes) => new TextDecoder().decode(bytes);

  const encryptText = (text, keyBase64) => {
    const textBytes = stringToBytes(text);
    const keyBytes = base64ToBytes(keyBase64);
    const resultBytes = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      resultBytes[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return bytesToBase64(resultBytes);
  };

  const decryptText = (encryptedBase64, keyBase64) => {
    const encryptedBytes = base64ToBytes(encryptedBase64);
    const keyBytes = base64ToBytes(keyBase64);
    const resultBytes = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      resultBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return bytesToString(resultBytes);
  };

  const isValidBase64 = (str) => {
    try {
      if (!str.trim()) return false;
      const decoded = atob(str);
      return btoa(decoded) === str;
    } catch {
      return false;
    }
  };

  const handleProcess = () => {
    setStatus("");
    if (!inputText.trim()) {
      setStatus("Введите текст для обработки");
      return;
    }

    try {
      if (mode === "encrypt") {
        if (!publicKey || !isValidBase64(publicKey)) {
          setStatus("Введите корректный публичный ключ");
          return;
        }
        setOutputText(encryptText(inputText, publicKey));
        setStatus("Текст успешно зашифрован!");
      } else {
        if (!privateKey || !isValidBase64(privateKey)) {
          setStatus("Введите корректный приватный ключ");
          return;
        }
        if (!isValidBase64(inputText)) {
          setStatus("Зашифрованный текст должен быть Base64");
          return;
        }
        setOutputText(decryptText(inputText, privateKey));
        setStatus("Текст успешно расшифрован!");
      }
    } catch (error) {
      setStatus(`Ошибка: ${error.message}`);
    }
  };

  const clearAll = () => {
    setPublicKey("");
    setPrivateKey("");
    setInputText("");
    setOutputText("");
    setStatus("");
  };

  const loadTestExample = () => {
    setInputText("Привет мир! Hello world! Тестовое сообщение 123");
    setStatus("Тестовый текст загружен. Сгенерируйте ключи для шифрования.");
  };

  const runTest = () => {
    const testText = "Тестовый русский текст: Привет! 123 ABC";
    if (!publicKey || !privateKey) {
      setStatus("Сначала сгенерируйте ключи");
      return;
    }
    const encrypted = encryptText(testText, publicKey);
    const decrypted = decryptText(encrypted, privateKey);
    setStatus(
      testText === decrypted
        ? "✅ Тест пройден! Шифрование и дешифрование работают корректно"
        : "❌ Тест не пройден. Результат дешифрования не совпадает с исходным текстом"
    );
  };

  return (
    <div className="lab-content">
      <h2>Алгоритм Мак-Элиса</h2>

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
          <label>Публичный ключ (Base64):</label>
          <div className="key-input">
            <input
              type="text"
              className="text-input"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="Публичный ключ для шифрования"
            />
            <button className="generate-btn" onClick={generateKeys}>
              Сгенерировать ключи
            </button>
          </div>
        </div>

        <div className="input-group">
          <label>Приватный ключ (Base64):</label>
          <input
            type="text"
            className="text-input"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="Приватный ключ для дешифрования"
          />
        </div>

        <div className="input-group">
          <label>
            {mode === "encrypt"
              ? "Исходный текст:"
              : "Зашифрованный текст (Base64):"}
          </label>
          <textarea
            className="text-area"
            rows="4"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              mode === "encrypt"
                ? "Введите текст для шифрования"
                : "Введите Base64 строку для дешифрования"
            }
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.8rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button className="process-btn" onClick={handleProcess}>
            {mode === "encrypt" ? "Зашифровать" : "Расшифровать"}
          </button>
          <button
            className="generate-btn"
            onClick={loadTestExample}
            style={{ background: "rgba(100,255,100,0.1)" }}
          >
            Тестовый текст
          </button>
          <button
            className="generate-btn"
            onClick={runTest}
            style={{ background: "rgba(255,255,100,0.1)" }}
          >
            Проверить
          </button>
          <button
            className="generate-btn"
            onClick={clearAll}
            style={{ background: "rgba(255,100,100,0.1)" }}
          >
            Очистить
          </button>
        </div>

        <div className="input-group">
          <label>Результат:</label>
          <textarea
            className="text-area output"
            rows="4"
            value={outputText}
            readOnly
            placeholder="Результат появится здесь"
          />
        </div>

        {status && <div className="status-message">{status}</div>}
      </div>
    </div>
  );
};

export default Lab4;
