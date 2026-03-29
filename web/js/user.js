function loadUser(){

  fetch("/api/user/" + user)
  .then(r=>r.json())
  .then(d=>{
    document.getElementById("balance").innerText = d.balance.toFixed(4);
    
    if(document.getElementById("refs")){
      document.getElementById("refs").innerText = d.referrals;
    }

    if(document.getElementById("link")){
      document.getElementById("link").value =
        "https://t.me/YOUR_BOT?start=" + user;
    }
  });

}
