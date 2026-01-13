var c = document.getElementById("canv");
c.width = window.innerWidth;
c.height = window.innerHeight;
var ctx = c.getContext("2d");
ctx.moveTo(0, 0);
ctx.lineTo(200, 100);
ctx.stroke();