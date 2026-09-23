(function () {
  var root = document.querySelector(".scopo-root");
  var dot = document.getElementById("cursorDot");
  var ring = document.getElementById("cursorRing");

  if (!root) return;

  root.addEventListener("mousemove", function (e) {
    var mx = e.clientX;
    var my = e.clientY;

    if (dot) {
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0) translate(-50%,-50%)";
    }
    if (ring) {
      ring.style.transform = "translate3d(" + mx + "px," + my + "px,0) translate(-50%,-50%)";
    }

    var target = e.target;
    var isHover = !!(target && target.closest && target.closest(
      ".btn-primary, .btn-outline, .thumb, .logo-link, .card"
    ));

    if (dot) dot.classList.toggle("is-active", isHover);
    if (ring) ring.classList.toggle("is-active", isHover);
  });
})();
