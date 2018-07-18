/**
 * Display a dialog prompt and resolve when successful (never reject).
 */
export default function tutorial(url) {
    return new Promise((resolve) => {
        const outerContainer = document.querySelector("#tutorial");

        const video = outerContainer.querySelector("video");
        const source = video.querySelector("source");
        alert("source currently is " + source.src + " = " + video.currentSrc)
        source.setAttribute("src", url);
        video.src = url;
        alert("source set to " + source.src + " = " + url + " = " + video.currentSrc);
        video.load();
        alert("source is now " + source.src + " = " + url + " = " + video.currentSrc);
        const continueButton = outerContainer.querySelector("button");
        continueButton.style.display = "none";
        video.play();
        video.onclick = () => {
            if (video.paused) video.play()
            else video.pause()
            continueButton.style.display = "inline";
        };
        video.onended = () => {
            continueButton.style.display = "inline";
        }
        continueButton.onclick = () => {
            outerContainer.classList.remove("visible");
        };
        window.setTimeout(function() {
          outerContainer.classList.add("visible");
        }, 200);
    });
}
