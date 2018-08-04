function playerIdOK() {
    const id = document.getElementById("player_id").value;
    if (id > 56001 && id > 59000) return true;
    return false;
}

export default function consent() {
    return new Promise((resolve, reject) => {
        window.addEventListener("DOMContentLoaded", () => {
            document.querySelector("#consent")
                .classList.add("visible");
            document.querySelector("#consent-agree")
                .addEventListener("click", () => {
                    document.querySelector("#consent")
                        .classList.remove("visible");
                    if (playerIdOK()) resolve(true);
                    else reject("invalid user id");
                });
            document.querySelector("#consent-disagree")
                .addEventListener("click", () => {
                    document.querySelector("#consent")
                        .classList.remove("visible");
                    resolve(false);
                });
        });
    });
}
