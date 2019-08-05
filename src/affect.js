const affects =  [
    "interested",
    "frustrated",
    "surprised",
    "confused",
    "delighted",
    "bored",
    "neutral_affect"
];

export function collectAffect() {
    const p = new Promise(resolve => {
        document.querySelector('div#affect > div.frame').style.display = "block";
        affects.forEach(a => {
            const elem = document.getElementById(a);
            elem.onclick = (e) => {
                Logging.log("affect", {affect: a}); // Do we need more information to be logged?
                document.querySelector("#affect div.frame").style.display = "none";
                resolve();
            };
        });
    });
    return p;
}
