import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Lab1 from "./components/Lab1/Lab1";
import "./App.css";
import Lab2 from "./components/Lab2/Lab2";
import Lab3 from "./components/Lab3/Lab3";
import Lab4 from "./components/Lab4/Lab4";
import Lab5 from "./components/Lab5/Lab5";

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
          <Route path="/lab2" element={<Lab2 />} />
          <Route path="/lab3" element={<Lab3 />} />
          <Route path="/lab4" element={<Lab4 />} />
          <Route path="/lab5" element={<Lab5 />} />
          <Route path="/lab6" element={<Lab1 />} />
          <Route path="/lab7" element={<Lab1 />} />
          <Route path="/lab8" element={<Lab1 />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
