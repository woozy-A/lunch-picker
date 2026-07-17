import React from "react";
import ReactDOM from "react-dom/client";
import { gsap } from "gsap";
import "../styles.css";

window.React = React;
window.ReactDOM = ReactDOM;
window.gsap = gsap;

async function startApp() {
  await import("./mockApi.js");
  await import("./imageUtils.js");
  await import("./modalUtils.js");
  await import("./MenuCard.js");
  await import("./ResultList.js");
  await import("./FilterModal.js");
  await import("./DetailModal.js");
  await import("./App.js");
}

startApp().catch((error) => {
  console.error(error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = '<main class="boot-error"><h1>밥픽을 불러오지 못했어요</h1><p>잠시 후 새로고침해 주세요.</p></main>';
  }
});
