const affects =  [
    "interested",
    "frustrated",
    "surprised",
    "confused",
    "delighted",
    "bored",
    "neutral_affect"
];

affects.forEach(a => {
    const elem = document.getElementById(a);
    console.log(a + " " + elem)
    elem.addEventListener("click", (e) => {
        console.log(a)
        document.querySelector("#affect div.frame").style.display = "none"
    })
});
