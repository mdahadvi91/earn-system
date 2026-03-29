// main.js

let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user?.id || "demo";

document.getElementById("uid").innerText = user;

// page switch
function showPage(page){
  document.getElementById("content").innerHTML = "Loading...";
  
  fetch("pages/" + page + ".html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("content").innerHTML = html;

    // load js for that page
    let script = document.createElement("script");
    script.src = "js/" + page + ".js";
    document.body.appendChild(script);
  });
}

// first load
showPage("task");
