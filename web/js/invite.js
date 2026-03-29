fetch("/user/"+user)
.then(r=>r.json())
.then(d=>{
  document.getElementById("refs").innerText = d.referrals;
  document.getElementById("link").value =
    "https://t.me/YOUR_BOT?start=" + user;
});

function copyLink(){
  navigator.clipboard.writeText(
    document.getElementById("link").value
  );
  alert("Copied");
}
