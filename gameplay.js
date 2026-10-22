(() => {
  const videos = [...document.querySelectorAll("video")];
  const videoDetails = [...document.querySelectorAll("details")]
    .filter((section) => section.querySelector("video"));

  videos.forEach((video) => {
    video.addEventListener("play", () => {
      videos.forEach((other) => {
        if (other !== video && !other.paused) other.pause();
      });
    });
  });

  videoDetails.forEach((section) => {
    section.addEventListener("toggle", () => {
      if (section.open) return;
      section.querySelectorAll("video").forEach((video) => video.pause());
    });
  });

})();
