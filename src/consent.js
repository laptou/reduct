// Report whether a player id is acceptable
function playerIdOK() {
    const id = document.getElementById("player_id").value;
    if (id >= 56000 && id < 58000 || id == 1234 || id == 513) return true;
    return false;
}

// Handle asking for consent. A valid user id is requested
// (according to playerIdOK) if user_ids is true.
export default function consent(user_ids) {
    if (user_ids) {
        Array.prototype.forEach.call(document.getElementsByClassName("consent-request-id"),
            (e) => e.style.display = "inline");
    }
    return new Promise((resolve, reject) => {
        document.querySelector("#consent")
            .classList.add("visible");
        document.querySelector("#consent-agree")
            .addEventListener("click", () => {
                document.querySelector("#consent")
                    .classList.remove("visible");
                if (!user_ids || playerIdOK()) resolve(true);
                else reject("invalid user id");
            });
        document.querySelector("#consent-disagree")
            .addEventListener("click", () => {
                document.querySelector("#consent")
                    .classList.remove("visible");
                resolve(false);
            });
    });
}
