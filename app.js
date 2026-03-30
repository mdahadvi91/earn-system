/* ===================================================== */
/* 🔹 USER ID */
/* ===================================================== */

let userId = localStorage.getItem("userId");

if (!userId) {
    userId = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userId", userId);
}

/* ===================================================== */
/* 🔗 API */
/* ===================================================== */

const API = "https://earn-system.onrender.com/api";

/* ===================================================== */
/* 🎨 BACKGROUND */
/* ===================================================== */

const backgrounds = [
    "assets/bg1.jpg",
    "assets/bg2.jpg",
    "assets/bg3.jpg"
];

let bgIndex = 0;

function changeBackground() {
    let bg = document.getElementById("bg");
    if (!bg) return;

    bg.style.backgroundImage = `url(${backgrounds[bgIndex]})`;
    bgIndex = (bgIndex + 1) % backgrounds.length;
}

/* ===================================================== */
/* 📊 LOAD USER */
/* ===================================================== */

async function loadUser(){
    try {
        let res = await fetch(`${API}/user/${userId}`);
        let data = await res.json();

        updateBalance(data.balance);
        adsWatched = data.totalAds || 0;

        updateProgress();
    } catch {
        alert("Server error ❌");
    }
}

/* ===================================================== */
/* 📺 WATCH AD */
/* ===================================================== */

let lastClick = 0;
let adsWatched = 0;
let taskStep = 5;
let reward = 2.5;

async function watchAd(){

    let now = Date.now();

    if(now - lastClick < 5000){
        alert("Slow down!");
        return;
    }

    lastClick = now;

    window.open("https://www.profitablecpmratenetwork.com/kxq650wd?key=11d1ec5f3d88b1d9689e0547e8b15dd1");

    await fetch(`${API}/watch`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ id:userId })
    });

    adsWatched++;
    updateProgress();
}

/* ===================================================== */
/* 🎯 PROGRESS */
/* ===================================================== */

function updateProgress(){
    document.getElementById("progress").innerText =
        adsWatched + " / " + taskStep;

    if(adsWatched >= taskStep){
        document.getElementById("claimBtn").style.display = "block";
    }
}

/* ===================================================== */
/* 💰 CLAIM */
/* ===================================================== */

async function claimReward(){

    let res = await fetch(`${API}/claim`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
            id:userId,
            amount:reward
        })
    });

    let data = await res.json();

    if(data.success){
        adsWatched = 0;
        taskStep += 5;
        reward += 2.5;

        updateBalance(data.balance);
        updateProgress();

        document.getElementById("claimBtn").style.display = "none";

        alert("Added " + reward + " BDT");
    }
}

/* ===================================================== */
/* 💰 BALANCE */
/* ===================================================== */

function updateBalance(balance){

    document.getElementById("balance").innerText =
        balance.toFixed(2) + " BDT";

    document.getElementById("balanceAED").innerText =
        (balance * 0.033).toFixed(2) + " AED";
}

/* ===================================================== */
/* 📂 MENU */
/* ===================================================== */

function toggleMenu(){
    let s = document.getElementById("sidebar");
    s.style.left = (s.style.left === "0px") ? "-200px" : "0px";
}

/* ===================================================== */
/* 🎁 BONUS */
/* ===================================================== */

function dailyBonus(){
    let today = new Date().toDateString();
    let last = localStorage.getItem("bonus");

    if(last === today){
        alert("Already claimed");
        return;
    }

    localStorage.setItem("bonus", today);
    alert("Bonus Added 🎁");
}

/* ===================================================== */
/* 👥 FAKE USERS */
/* ===================================================== */

setInterval(()=>{
    let num = Math.floor(Math.random()*50)+100;
    document.getElementById("liveUsers").innerText =
        "Active Users: " + num;
},3000);

/* ===================================================== */
/* 🚀 INIT */
/* ===================================================== */

window.addEventListener("load", ()=>{
    document.getElementById("loader").style.display = "none";
});

document.addEventListener("DOMContentLoaded", ()=>{
    loadUser();
    changeBackground();
    setInterval(changeBackground,5000);
});
