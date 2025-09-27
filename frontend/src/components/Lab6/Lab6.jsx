import React, { useState } from "react";
import "./Lab6.css";

const Lab6 = () => {
  const [mode, setMode] = useState("generate");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState("");

  // Заглушки для реализации ГОСТ 34.10
  const generateKeys = () => {
    // Реализация генерации ключей по ГОСТ 34.10
    const mockPrivateKey =
      "0x" +
      Array(64)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("");
    const mockPublicKey =
      "0x" +
      Array(128)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("");

    setPrivateKey(mockPrivateKey);
    setPublicKey(mockPublicKey);
    setStatus("Ключи успешно сгенерированы");
  };

  const generateSignature = () => {
    // Реализация создания ЭЦП по ГОСТ 34.10
    if (!privateKey || !message) {
      setStatus("Заполните приватный ключ и сообщение");
      return;
    }

    const mockSignature =
      "0x" +
      Array(128)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("");

    setSignature(mockSignature);
    setStatus("ЭЦП успешно создана");
  };

  const verifySignature = () => {
    // Реализация проверки ЭЦП по ГОСТ 34.10
    if (!publicKey || !message || !signature) {
      setStatus("Заполните все поля для проверки");
      return;
    }

    // Mock verification
    const isValid = Math.random() > 0.5;
    setStatus(isValid ? "ЭЦП действительна" : "ЭЦП недействительна");
  };

  return (
    <div className="lab-content">
      <h2>ЭЦП на базе ГОСТ 34.10</h2>

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
          <label>Приватный ключ:</label>
          <div className="key-input">
            <input
              type="text"
              className="text-input"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Введите приватный ключ..."
            />
            <button className="generate-btn" onClick={generateKeys}>
              Сгенерировать
            </button>
          </div>
        </div>

        <div className="input-group">
          <label>Публичный ключ:</label>
          <input
            type="text"
            className="text-input"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="Введите публичный ключ..."
          />
        </div>

        <div className="input-group">
          <label>Сообщение:</label>
          <textarea
            className="text-area"
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите сообщение для подписи/проверки..."
          />
        </div>

        <div className="input-group">
          <label>Электронная подпись:</label>
          <textarea
            className="text-area output"
            rows="3"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={
              mode === "generate"
                ? "Здесь появится подпись..."
                : "Введите подпись для проверки..."
            }
            readOnly={mode === "generate"}
          />
        </div>

        {mode === "generate" ? (
          <button className="process-btn" onClick={generateSignature}>
            Сгенерировать ЭЦП
          </button>
        ) : (
          <button className="process-btn" onClick={verifySignature}>
            Проверить ЭЦП
          </button>
        )}

        {status && <div className="status-message">{status}</div>}
      </div>
    </div>
  );
};

export default Lab6;
