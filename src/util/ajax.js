export function getJSON(path) {
    return new Promise((resolve, reject) => {
        const xhr = new window.XMLHttpRequest();
        xhr.onload = function() {
            try {
                resolve(JSON.parse(xhr.response));
            }
            catch (e) {
                console.error(path, e);
                reject(e);
            }
        };

        xhr.open("GET", path);
        xhr.responseType = "text";
        xhr.send();
    });
}

export function postJSON(path, data) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", path, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(data, null, 2));
}

const PREFIXES = ["jpa", "jpb", "jpc", "jpd", "jpe", "jpf"];
let prefixCounter = 0;

export function jsonp(path, params) {
    params = params || {};
    return new Promise((resolve, reject) => {
        // Guard against multiple requests made at same millisecond
    console.log("creating jsonp request:", path, params)
        // const callback = `${PREFIXES[prefixCounter]}${Date.now()}`;
        // prefixCounter = (prefixCounter + 1) % (PREFIXES.length);
        // let completed = false;
        // Encode params in query string
        const parts = [];
        // params.callback = callback;
        // Cachebuster
        // params._ = Date.now();
        for (const [ key, val ] of Object.entries(params)) {
            parts.push(`${key}=${window.encodeURIComponent(val)}`);
        }
        const query = `?${parts.join("&")}`;

        return read_from_url(path + query)
              .then(val => {
                console.log("Returned value from AJAX request: " + val);
                resolve(val)
              })
              .catch(val => reject(val))

/*
        const scr = document.createElement("script");
        scr.setAttribute("src", path + query);

        window[callback] = (data) => {
            completed = true;
            delete window[callback];
            scr.remove();
            resolve(data);
        };

        // Set timeout first in case appendChild causes a net::ERR_ABORTED
        window.setTimeout(() => {
            if (completed) return;

            delete window[callback];
            scr.remove();
            reject();
        }, 1000);

        document.body.appendChild(scr);
*/
    });
}

export function post_to_url(url, params, mimetype) {
  return new Promise((resolve, reject) => {
    console.log("creating post_to_url request to " + url + params)
    var undefined;
    if (mimetype == undefined) mimetype = 'application/json';
    var req;
    if (window.XMLHttpRequest) { // Mozilla, Safari, ...
        req = new XMLHttpRequest();
        if (req.overrideMimeType)
            req.overrideMimeType(mimetype);
    } else if (window.ActiveXObject) { // IE
        req = new ActiveXObject("Microsoft.XMLHTTP");
    }
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            if (req.status == 200) {
                resolve(req.responseText)
            } else {
                reject('Could not read from ' + url + ': Error ' + req.status);
            }
        }
    }
    if (!url.match(/^http:/) && !url.match(/^https:/)) {
        var prefix = location.href;
        url = prefix.replace(/\/[^\/]*$/, '/') + url;
    }

    var data = new FormData();
    for (var prop in params) {
	data.append(prop, params[prop]);
    }

    req.open("POST", url, true);
    req.send(data);
  })
}

// fetch the contents from the URL "url".  Once successful, apply the function
// "cont()" to the contents. If unsuccessful, apply the function err(msg).
function read_from_url(url, mimetype) {
  return new Promise((resolve, reject) => {
    var undefined;
    if (mimetype == undefined) mimetype = 'application/json';
    var req;
    if (window.XMLHttpRequest) { // Mozilla, Safari, ...
        req = new XMLHttpRequest();
        if (req.overrideMimeType)
            req.overrideMimeType(mimetype);
    } else if (window.ActiveXObject) { // IE
        req = new ActiveXObject("Microsoft.XMLHTTP");
    }
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            if (req.status == 200) {
                resolve(req.responseText);
            } else {
                reject('Could not read from ' + url + ': Status ' + req.status);
            }
        } else {
            console.log("state changed: " + req.readyState)
        }
    }
    if (!url.match(/^http:/) && !url.match(/^https:/)) {
        var prefix = location.href;
        url = prefix.replace(/\/[^\/]*$/, '/') + url;
    }
    req.open("GET", url, true);
    req.send(null);
  })
}


