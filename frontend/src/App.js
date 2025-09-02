import React from "react";
import "./App.css";

function App() {
  const labWorks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-container">
          <ul className="nav-menu">
            {labWorks.map((labNumber) => (
              <li key={labNumber} className="nav-item">
                <a href={`lab${labNumber}`} className="nav-link">
                  <span className="lab-text">Лабораторная</span>
                  <span className="lab-number">работа {labNumber}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <main className="main-content">
        <h2>Добро пожаловать!</h2>
        <p>Выберите лабораторную работу из меню выше</p>
      </main>
    </div>
  );
}

export default App;
