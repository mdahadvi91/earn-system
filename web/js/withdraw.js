function withdraw(){
fetch("/withdraw",{
method:"POST",
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
  id:user,
  amount:document.getElementById("amount").value,
  address:document.getElementById("addr").value
})
})
.then(r=>r.json())
.then(d=>{
  alert(d.success ? "Request Sent" : "Error");
});
}
