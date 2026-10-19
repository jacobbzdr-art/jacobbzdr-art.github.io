(() => {
  const videos = [...document.querySelectorAll("video")];
  const cases = [...document.querySelectorAll(".featured-case")];

  videos.forEach((video) => {
    video.addEventListener("play", () => {
      videos.forEach((other) => {
        if (other !== video && !other.paused) other.pause();
      });
    });
  });

  cases.forEach((section) => {
    section.addEventListener("toggle", () => {
      section.querySelectorAll("video").forEach((video) => {
        if (!section.open) {
          video.pause();
        } else if (video.preload === "none") {
          video.preload = "metadata";
          video.load();
        }
      });
    });
  });

})();
