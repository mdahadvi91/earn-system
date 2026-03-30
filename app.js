/* ===================================================== */
/* 🔹 GLOBAL VARIABLES */
/* 👉 User data (temporary - backend e later connect hobe) */
/* ===================================================== */

let balance = 0;
let totalEarn = 0;

let adsWatched = 0;   // total ads count
let taskStep = 5;     // first task = 5 ads
let reward = 2.5;     // 5 ads = 2.5 BDT


/* ===================================================== */
/* 🔥 LIVE BACKGROUND SYSTEM */
/* 👉 assets folder theke image change hobe */
/* ===================================================== */

const backgrounds = [
    "assets/bg1.jpg",
    "assets/bg2.jpg",
    "assets/bg3.jpg"
];

let bgIndex = 0;

function changeBackground() {
    const bg = document.getElementById("bg");

    bg.style.backgroundImage = `url(${backgrounds[bgIndex]})`;

    bgIndex++;
    if (bgIndex >= backgrounds.length) {
        bgIndex = 0;
    }
}

// 👉 First load
changeBackground();

// 👉 Every 5 sec change
setInterval(changeBackground, 5000);


/* ===================================================== */
/* 📺 WATCH AD SYSTEM */
/* 👉 Adsterra link use korba */
/* ===================================================== */

function watchAd() {

    // 👉 Replace with your Adsterra direct link
    let adLink = "https://your-adsterra-link.com";

    // 👉 Open ad
    window.open(adLink, "_blank");

    // 👉 Count ads
    adsWatched++;

    updateProgress();

}


/* ===================================================== */
/* 📊 PROGRESS UPDATE */
/* ===================================================== */

function updateProgress() {

    document.getElementById("progress").innerText =
        adsWatched + " / " + taskStep + " Ads Completed";

    // 👉 Task complete হলে claim button show
    if (adsWatched >= taskStep) {
        document.getElementById("claimBtn").style.display = "block";
    }
}


/* ===================================================== */
/* 💰 CLAIM REWARD SYSTEM */
/* 👉 5 ads = 2.5 BDT, 10 ads = 5 BDT */
/* ===================================================== */

function claimReward() {

    // 👉 Balance add
    balance += reward;
    totalEarn += reward;

    // 👉 Reset ads counter
    adsWatched = 0;

    // 👉 Next level system (5 → 10 → 15 ...)
    taskStep += 5;
    reward += 2.5;

    // 👉 UI update
    document.getElementById("claimBtn").style.display = "none";

    updateBalance();
    updateProgress();

    alert("Reward Added: " + reward + " BDT");

}


/* ===================================================== */
/* 💰 BALANCE UPDATE */
/* ===================================================== */

function updateBalance() {

    document.getElementById("balance").innerText =
        balance.toFixed(2) + " BDT";

    // 👉 AED convert (approx)
    let aed = balance * 0.033;

    document.getElementById("balanceAED").innerText =
        aed.toFixed(2) + " AED";

    document.getElementById("totalEarn").innerText =
        totalEarn.toFixed(2);
}


/* ===================================================== */
/* 📂 SIDEBAR MENU */
/* ===================================================== */

function toggleMenu() {

    let sidebar = document.getElementById("sidebar");

    if (sidebar.style.left === "0px") {
        sidebar.style.left = "-200px";
    } else {
        sidebar.style.left = "0px";
    }
}


/* ===================================================== */
/* 🔗 NAVIGATION SYSTEM */
/* 👉 Page redirect */
/* ===================================================== */

function goWithdraw() {
    window.location.href = "pages/withdraw.html";
}

function goInvite() {
    window.location.href = "pages/invite.html";
}

function openOffers() {
    window.location.href = "pages/offers.html";
}

function openOfferwall() {
    window.location.href = "pages/offerwall.html";
}


/* ===================================================== */
/* 🔄 INITIAL LOAD */
/* ===================================================== */

updateBalance();
updateProgress();
