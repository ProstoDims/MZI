import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Lab1 from "./components/Lab1/Lab1";
import "./App.css";

const Home = () => (
  <div className="main-content">
    <h2>Добро пожаловать!</h2>
    <p>Выберите лабораторную работу из меню выше</p>
  </div>
);

function App() {
  const labWorks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <ul className="nav-menu">
              {labWorks.map((labNumber) => (
                <li key={labNumber} className="nav-item">
                  <Link to={`/lab${labNumber}`} className="nav-link">
                    <span className="lab-text">Лабораторная</span>
                    <span className="lab-number">работа {labNumber}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lab1" element={<Lab1 />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
